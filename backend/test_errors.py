"""
Unit tests for backend exception handling and validation logic in main.py.
Tested Scenarios:
1. Missing API Key: Validates 401 response with GEMINI_API_KEY_MISSING.
2. Invalid API Key: Validates 401 response with GEMINI_API_KEY_INVALID.
3. Quota/Rate Limits: Validates 429 response with GEMINI_RATE_LIMIT_EXCEEDED.
"""
import sys
from unittest.mock import patch, MagicMock
from google.api_core import exceptions as google_exceptions

# We need to mock generativeai before main is loaded
mock_genai = MagicMock()
sys.modules["google.generativeai"] = mock_genai

import main
from main import app, get_smart_response
from fastapi import HTTPException
import pytest

def test_missing_api_key():
    """Test that a missing Gemini API key raises a 401 HTTPException with GEMINI_API_KEY_MISSING."""
    # Force GENAI_KEY to be empty/missing
    with patch("main.GENAI_KEY", None):
        with pytest.raises(HTTPException) as exc_info:
            get_smart_response("test prompt")
        assert exc_info.value.status_code == 401
        assert "GEMINI_API_KEY_MISSING" in exc_info.value.detail

def test_invalid_api_key():
    """Test that an invalid Gemini API key raises a 401 HTTPException with GEMINI_API_KEY_INVALID."""
    # Force GENAI_KEY to be set
    with patch("main.GENAI_KEY", "some_key"):
        # Mock model content generation to raise Unauthenticated
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = google_exceptions.Unauthenticated("Invalid key")
        
        with patch("main.genai.GenerativeModel", return_value=mock_model):
            with pytest.raises(HTTPException) as exc_info:
                get_smart_response("test prompt")
            assert exc_info.value.status_code == 401
            assert "GEMINI_API_KEY_INVALID" in exc_info.value.detail

def test_rate_limit_exceeded():
    """Test that rate limit exhaustion raises a 429 HTTPException with GEMINI_RATE_LIMIT_EXCEEDED."""
    with patch("main.GENAI_KEY", "some_key"):
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = google_exceptions.ResourceExhausted("Rate limit exceeded")
        
        with patch("main.genai.GenerativeModel", return_value=mock_model):
            with pytest.raises(HTTPException) as exc_info:
                get_smart_response("test prompt")
            assert exc_info.value.status_code == 429
            assert "GEMINI_RATE_LIMIT_EXCEEDED" in exc_info.value.detail
