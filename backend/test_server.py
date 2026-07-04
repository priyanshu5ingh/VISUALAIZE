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

# --- RESPONSE VALIDATION TESTS ---
# Issue #251: Unvalidated Gemini response crashes ReactFlow

@patch.object(main, "get_smart_response")
def test_generate_graph_validates_response_structure(mock_ai):
    """POST /generate should validate that the Gemini response has all required fields.

    Regression test for issue #251. Verifies that missing fields (nodes, edges,
    title, etc.) are caught before returning to frontend, preventing crashes
    when the frontend tries to render undefined data structures.
    """
    from main import cache, get_cache_key

    # Clear cache to avoid stale test data
    cache._cache.clear() if hasattr(cache, "_cache") else None

    # Valid response with all required fields
    valid_response = json.dumps({
        "title": "Test Graph",
        "summary": "A test summary",
        "explanation": "Test explanation",
        "execution_trace": "Step 1 -> Step 2",
        "code_snippet": "print('hello')",
        "nodes": [{"id": "1", "label": "Node 1"}],
        "edges": [],
    })
    mock_ai.return_value = valid_response

    with patch("main.GENAI_KEY", "mock_key_for_testing"):
        response = client.post("/generate", json={"prompt": "test prompt"})
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Graph"
        assert "nodes" in data
        assert "edges" in data


@patch.object(main, "get_smart_response")
def test_generate_graph_rejects_missing_nodes(mock_ai):
    """POST /generate should reject responses with missing 'nodes' field.

    If Gemini returns a response without nodes, it should be caught and
    rejected with 400 Bad Request rather than being returned to the
    frontend (which would crash when trying to access data.nodes).
    """
    from main import cache

    # Clear cache
    cache._cache.clear() if hasattr(cache, "_cache") else None

    # Response missing 'nodes' field
    invalid_response = json.dumps({
        "title": "Test Graph",
        "summary": "A test summary",
        "explanation": "Test explanation",
        "execution_trace": "Step 1 -> Step 2",
        "code_snippet": "print('hello')",
        # Missing: "nodes"
        "edges": [],
    })
    mock_ai.return_value = invalid_response

    with patch("main.GENAI_KEY", "mock_key_for_testing"):
        response = client.post("/generate", json={"prompt": "test missing_nodes"})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.json()}"
        body = response.json()
        assert "required" in body.get("detail", "").lower() or \
               "missing" in body.get("detail", "").lower() or \
               "field" in body.get("detail", "").lower(), \
            f"Error should mention missing/required field, got: {body}"


@patch.object(main, "get_smart_response")
def test_generate_graph_rejects_empty_nodes(mock_ai):
    """POST /generate should reject responses with empty 'nodes' array.

    The nodes list must have at least one node. An empty nodes list
    would crash the frontend's ReactFlow component.
    """
    from main import cache

    # Clear cache
    cache._cache.clear() if hasattr(cache, "_cache") else None

    # Response with empty nodes list
    invalid_response = json.dumps({
        "title": "Test Graph",
        "summary": "A test summary",
        "explanation": "Test explanation",
        "execution_trace": "Step 1 -> Step 2",
        "code_snippet": "print('hello')",
        "nodes": [],  # Empty!
        "edges": [],
    })
    mock_ai.return_value = invalid_response

    with patch("main.GENAI_KEY", "mock_key_for_testing"):
        response = client.post("/generate", json={"prompt": "test empty_nodes"})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.json()}"
        body = response.json()
        assert "node" in body.get("detail", "").lower() or \
               "empty" in body.get("detail", "").lower(), \
            f"Error should mention empty nodes, got: {body}"


@patch.object(main, "get_smart_response")
def test_generate_graph_rejects_invalid_node_structure(mock_ai):
    """POST /generate should reject nodes with invalid structure.

    Each node must have 'id' and 'label' fields. Missing fields
    should be caught and rejected.
    """
    from main import cache

    # Clear cache
    cache._cache.clear() if hasattr(cache, "_cache") else None

    # Node missing 'label' field
    invalid_response = json.dumps({
        "title": "Test Graph",
        "summary": "A test summary",
        "explanation": "Test explanation",
        "execution_trace": "Step 1 -> Step 2",
        "code_snippet": "print('hello')",
        "nodes": [{"id": "1"}],  # Missing 'label'
        "edges": [],
    })
    mock_ai.return_value = invalid_response

    with patch("main.GENAI_KEY", "mock_key_for_testing"):
        response = client.post("/generate", json={"prompt": "test invalid_node"})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.json()}"


# --- CACHE NORMALIZATION TESTS ---
# Issue #253: Redis cache key normalization prevents unbounded growth

@patch.object(main, "get_smart_response")
def test_cache_normalization_regression(mock_ai):
    """Cache keys should be normalized so different prompt variations use the same cache.

    Regression test for issue #253. Redis cache keys must normalize the input prompt
    to prevent unbounded cache growth. Multiple variations of the same prompt
    (different case, whitespace, punctuation) should:
    1. Map to the same cache key (no duplication)
    2. Return the cached response (avoiding redundant AI calls)
    3. Use hashed keys (not raw prompts), preventing growth on unique punctuation

    This prevents attackers from exploiting the cache by sending variations
    of the same prompt with different punctuation/spacing, each creating
    a new cache entry and causing unbounded growth.
    """
    from main import cache, get_cache_key

    # Clear cache
    cache._cache.clear() if hasattr(cache, "_cache") else None

    mock_ai.return_value = json.dumps(MOCK_GRAPH)

    # Different variations of the SAME prompt that normalize to same key:
    # - Case variations
    # - Whitespace variations
    # - Trailing punctuation variations
    # These should all map to the same normalized cache key.
    prompts = [
        "create a DFA for a*b",
        "create a dfa for a*b",  # Lowercase
        "CREATE A DFA FOR A*B",  # Uppercase
        "  create a DFA for a*b  ",  # Extra whitespace
        "create  a  dfa  for  a*b",  # Multiple spaces
        "create a DFA for a*b!!!",  # Trailing punctuation
        "create a dfa for a*b.",  # Period
        "create a dfa for a*b?",  # Question mark
    ]

    with patch("main.GENAI_KEY", "mock_key_for_testing"):
        # First request should hit the AI
        response1 = client.post("/generate", json={"prompt": prompts[0]})
        assert response1.status_code == 200
        assert mock_ai.call_count == 1

        # All subsequent requests should hit the cache (same normalized key)
        for i, prompt in enumerate(prompts[1:], 1):
            response = client.post("/generate", json={"prompt": prompt})
            assert response.status_code == 200, f"Prompt {i} failed: {response.json()}"
            # Still only 1 AI call (cache hit for all variations)
            assert mock_ai.call_count == 1, \
                f"Prompt variation {i} should have hit cache, but AI was called {mock_ai.call_count} times"
            # All variations return the same cached result
            assert response.json()["title"] == "Test Graph"

    # Verify cache keys are hashed (not raw prompts)
    # A hashed key should look like "graph:<sha256_hex>"
    from main import get_cache_key
    key = get_cache_key(prompts[0])
    assert key.startswith("graph:"), f"Cache key should be prefixed, got: {key}"
    assert len(key) > 20, f"Cache key should be substantial (hashed), got: {key}"


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
