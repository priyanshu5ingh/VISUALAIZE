"""
Standalone tests for the VISUALAIZE backend API.
These tests use FastAPI's TestClient and mock the Google Gemini AI service
to ensure CI stays green without needing real API credentials.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# --- MOCK GEMINI BEFORE IMPORTING MAIN ---
# main.py runs a model scan on startup, so we must mock genai immediately.
import sys
mock_genai = MagicMock()
sys.modules["google.generativeai"] = mock_genai

import main
from main import app, ChatRequest, CodeRequest, GraphRequest, verify_internal

# Create the test client
app.state.limiter.enabled = False

# Existing functional tests below don't exercise auth — bypass the shared-secret
# dependency here so they keep testing behavior, not the auth layer.
# Auth itself is covered explicitly by the test_internal_auth_* tests further down.
app.dependency_overrides[verify_internal] = lambda: None
client = TestClient(app)


# --- MOCK DATA ---
MOCK_GRAPH = {
    "title": "Test Graph",
    "summary": "A test summary",
    "explanation": "Test explanation",
    "execution_trace": "Step 1 -> Step 2",
    "code_snippet": "print('hello')",
    "nodes": [{"id": "1", "label": "Node 1"}],
    "edges": [{"source": "1", "target": "2", "label": "Link"}]
}

# --- TESTS ---

@patch.object(main, "get_smart_response")
def test_health_check(mock_ai):
    """GET / should return status Online."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Online"
    assert "models" in data

@patch.object(main, "get_smart_response")
def test_generate_graph_returns_expected_shape(mock_ai):
    """POST /generate should return a graph with nodes and edges."""
    # Mock the AI response string (JSON format)
    mock_ai.return_value = json.dumps(MOCK_GRAPH)
    
    with patch("main.GENAI_KEY", "mock_key_for_testing"):
        response = client.post("/generate", json={"prompt": "test prompt"})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Graph"
        assert "nodes" in data
        assert len(data["nodes"]) == 1

def test_generate_graph_missing_prompt():
    """POST /generate without prompt should return 422 Unprocessable Entity."""
    response = client.post("/generate", json={})
    assert response.status_code == 422

@patch.object(main, "get_smart_response")
def test_chat_returns_reply(mock_ai):
    """POST /chat should return a reply field."""
    mock_ai.return_value = "This is a mock AI reply."
    
    response = client.post(
        "/chat",
        json={"message": "hi", "context": "some context"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "This is a mock AI reply."

def test_chat_missing_fields():
    """POST /chat without required fields should return 422."""
    response = client.post("/chat", json={"message": "hi"}) # Missing context
    assert response.status_code == 422

@patch.object(main, "get_smart_response")
def test_regenerate_code_returns_snippet(mock_ai):
    """POST /regenerate_code should return code_snippet and code_explanation."""
    mock_ai.return_value = "```python\nprint('hello')\n```"
    
    response = client.post(
        "/regenerate_code",
        json={"prompt": "code", "language": "Python"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "code_snippet" in data
    assert "code_explanation" in data

def test_regenerate_code_missing_language():
    """POST /regenerate_code without language should return 422."""
    response = client.post("/regenerate_code", json={"prompt": "code"})
    assert response.status_code == 422

@pytest.mark.parametrize("route", ["/generate", "/chat", "/regenerate_code"])
def test_post_routes_reject_get(route: str):
    """All POST-only routes should return 405 Method Not Allowed on GET."""
    response = client.get(route)
    assert response.status_code == 405

def test_get_cache_key_normalizes_correctly():
    """get_cache_key should lowercase, strip spaces and trailing punctuation."""
    from main import get_cache_key
    k1 = get_cache_key(" Test Prompt!!!  ")
    k2 = get_cache_key("test prompt")
    assert k1 == k2

@patch.object(main, "get_smart_response")
def test_generate_graph_uses_cache(mock_ai):
    """Subsequent requests for the same prompt should hit the cache instead of calling AI."""
    from main import cache
    mock_ai.return_value = json.dumps(MOCK_GRAPH)
    
    # 1. Clear any existing key in cache
    from main import get_cache_key
    key = get_cache_key("cache test prompt")
    if hasattr(cache, "_cache"):
        cache._cache.pop(key, None)
    else:
        try:
            cache.delete(key)
        except Exception:
            pass

    # 2. Make first request - should hit mock_ai
    response = client.post("/generate", json={"prompt": "cache test prompt"})
    assert response.status_code == 200
    assert mock_ai.call_count == 1

    # 3. Make second request - should hit cache (so mock_ai call count remains 1)
    response2 = client.post("/generate", json={"prompt": "cache test prompt"})
    assert response2.status_code == 200
    assert mock_ai.call_count == 1


@patch.object(main, "get_smart_response")
def test_generate_error_does_not_leak_detail(mock_ai):
    """Error responses must not expose raw exception messages to the client."""
    mock_ai.side_effect = RuntimeError("Internal connection string: redis://secret@host:6379")
    response = client.post("/generate", json={"prompt": "trigger error"})
    assert response.status_code == 500
    body = response.json()
    # The raw exception text must NOT appear in the response body
    assert "redis" not in body.get("detail", "").lower()
    assert "secret" not in body.get("detail", "").lower()
    assert "Internal connection string" not in body.get("detail", "")


@patch.object(main, "get_smart_response")
def test_chat_error_does_not_leak_detail(mock_ai):
    """Chat error responses must not expose raw exception messages."""
    mock_ai.side_effect = RuntimeError("Raw internal error with traceback info")
    response = client.post("/chat", json={"message": "hi", "context": "ctx"})
    assert response.status_code == 500
    body = response.json()
    assert "Raw internal error" not in body.get("detail", "")


def test_generate_no_api_key_returns_503():
    """Missing GENAI_KEY must return 503, not 500."""
    original_key = main.GENAI_KEY
    try:
        main.GENAI_KEY = None
        response = client.post("/generate", json={"prompt": "test"})
        assert response.status_code == 503
    finally:
        main.GENAI_KEY = original_key


# --- INTERNAL AUTH TESTS ---
# These temporarily remove the verify_internal override (shared across all
# TestClient instances, since they wrap the same `app`) so the real auth
# logic runs, then restore the override so later tests keep bypassing auth.

import contextlib


@contextlib.contextmanager
def _real_auth_enabled():
    app.dependency_overrides.pop(verify_internal, None)
    try:
        yield
    finally:
        app.dependency_overrides[verify_internal] = lambda: None


def test_internal_auth_rejects_missing_header():
    """POST /generate without X-Internal-Secret must return 403 (once configured)."""
    original_secret = main.INTERNAL_API_SECRET
    try:
        main.INTERNAL_API_SECRET = "test-secret-value"
        with _real_auth_enabled():
            response = client.post("/generate", json={"prompt": "test"})
        assert response.status_code == 403
    finally:
        main.INTERNAL_API_SECRET = original_secret


def test_internal_auth_rejects_wrong_secret():
    """POST /generate with an incorrect X-Internal-Secret must return 403."""
    original_secret = main.INTERNAL_API_SECRET
    try:
        main.INTERNAL_API_SECRET = "test-secret-value"
        with _real_auth_enabled():
            response = client.post(
                "/generate",
                json={"prompt": "test"},
                headers={"X-Internal-Secret": "wrong-value"},
            )
        assert response.status_code == 403
    finally:
        main.INTERNAL_API_SECRET = original_secret


@patch.object(main, "get_smart_response")
def test_internal_auth_accepts_correct_secret(mock_ai):
    """POST /generate with the correct X-Internal-Secret must be allowed through."""
    mock_ai.return_value = json.dumps(MOCK_GRAPH)
    original_secret = main.INTERNAL_API_SECRET
    try:
        main.INTERNAL_API_SECRET = "test-secret-value"
        with patch("main.GENAI_KEY", "mock_key_for_testing"), _real_auth_enabled():
            response = client.post(
                "/generate",
                json={"prompt": "test"},
                headers={"X-Internal-Secret": "test-secret-value"},
            )
        assert response.status_code == 200
    finally:
        main.INTERNAL_API_SECRET = original_secret


def test_internal_auth_returns_503_when_not_configured():
    """POST /generate must return 503 if INTERNAL_API_SECRET is unset server-side."""
    original_secret = main.INTERNAL_API_SECRET
    try:
        main.INTERNAL_API_SECRET = ""
        with _real_auth_enabled():
            response = client.post(
                "/generate",
                json={"prompt": "test"},
                headers={"X-Internal-Secret": "anything"},
            )
        assert response.status_code == 503
    finally:
        main.INTERNAL_API_SECRET = original_secret


# --- RATE LIMITING REGRESSION TESTS ---
# Issue #250: Verify that rate limiting on POST /generate works correctly.
# Regression: https://github.com/priyanshu5ingh/VISUALAIZE/issues/250

@patch.object(main, "get_smart_response")
def test_rate_limiting_enforced_on_generate(mock_ai):
    """POST /generate should be rate limited to 10 requests per minute.

    Regression test for issue #250. Verifies that the @limiter.limit("10/minute")
    decorator on POST /generate actually rejects traffic after the quota is exceeded.
    """
    mock_ai.return_value = json.dumps(MOCK_GRAPH)

    # Temporarily enable the limiter for this test (it's disabled globally for test isolation)
    original_enabled = app.state.limiter.enabled
    try:
        app.state.limiter.enabled = True

        with patch("main.GENAI_KEY", "mock_key_for_testing"):
            # Make 10 successful requests (within limit)
            for i in range(10):
                response = client.post("/generate", json={"prompt": f"test {i}"})
                assert response.status_code == 200, f"Request {i+1} should succeed (within limit)"

            # 11th request should be rate-limited (429 Too Many Requests)
            response = client.post("/generate", json={"prompt": "test 11"})
            assert response.status_code == 429, \
                f"Request 11 should be rate-limited (429), got {response.status_code}"
            body = response.json()
            error_msg = body.get("error", body.get("detail", "")).lower()
            assert "exceed" in error_msg or "rate" in error_msg, \
                f"Rate limit error message should mention rate/limit, got: {body}"
    finally:
        app.state.limiter.enabled = original_enabled
