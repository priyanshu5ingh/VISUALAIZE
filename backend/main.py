import os
import json
import re
import time
import hashlib
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
import redis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

# Use structured logging instead of bare print() for production observability
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# --- REDIS CONFIG & CONNECTIVITY ---
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_URL = os.getenv("REDIS_URL", "")

class InMemoryCache:
    """Fallback in-memory cache (TTL-aware, size-bounded) used when Redis is unavailable."""
    def __init__(self, max_size: int = 1000):
        self._cache: dict = {}
        self._max_size = max_size
        logger.info("💡 Created in-memory fallback prompt cache (max_size=%d).", max_size)

    def get(self, key: str):
        entry = self._cache.get(key)
        if entry is None:
            return None
        if time.monotonic() < entry['expires_at']:
            return entry['value']
        # Expired — evict lazily
        del self._cache[key]
        return None

    def setex(self, key: str, time_sec: int, value: str) -> None:
        if len(self._cache) >= self._max_size:
            # Evict oldest 20% to avoid constant full-clears
            evict_count = max(1, self._max_size // 5)
            for k in list(self._cache.keys())[:evict_count]:
                del self._cache[k]
        self._cache[key] = {
            'value': value,
            'expires_at': time.monotonic() + time_sec
        }


def _build_redis_client():
    """Attempt to connect to Redis; return the client or None on failure."""
    try:
        if REDIS_URL:
            client = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
        else:
            client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
        client.ping()
        logger.info("✅ Connected to Redis at %s:%s", REDIS_HOST, REDIS_PORT)
        return client
    except Exception:
        # Log without the raw exception message to avoid leaking infrastructure details
        logger.warning("⚠️ Redis is not reachable. Falling back to in-memory cache.")
        return None


# Initialize cache — Redis preferred, InMemoryCache as safe fallback
_redis_client = _build_redis_client()
cache: InMemoryCache | redis.Redis = _redis_client if _redis_client is not None else InMemoryCache()

# --- RATE LIMITER CONFIG ---
# FIX: Determine storage_uri AFTER the Redis probe so the limiter never
# points at a dead Redis backend when the connection failed.
if _redis_client is not None:
    # Use the same backend that the cache is using
    _limiter_storage = REDIS_URL if REDIS_URL else f"redis://{REDIS_HOST}:{REDIS_PORT}"
else:
    # Redis is down — limiter must also use in-process memory
    _limiter_storage = "memory://"

limiter = Limiter(key_func=get_remote_address, storage_uri=_limiter_storage)

# Pre-compiled regex patterns — compiled once at module load for performance
# and to avoid any risk of ReDoS from runtime-constructed patterns.
#
# ReDoS audit:
#   _RE_WHITESPACE  : Simple \s+ — linear, safe.
#   _RE_TRAILING    : Anchored at end ($) with a simple char class — linear, safe.
#   _RE_FENCE_OPEN  : Anchored at start (^), literal backticks, then [^\n]{0,100}
#                     — bounded length prevents catastrophic backtracking.
#   _RE_FENCE_CLOSE : Anchored at end ($), literal backticks — linear, safe.
_RE_WHITESPACE  = re.compile(r'\s+')
_RE_TRAILING    = re.compile(r'[?!.]+$')
_RE_FENCE_OPEN  = re.compile(r'^```[^\n]{0,100}\n?')
_RE_FENCE_CLOSE = re.compile(r'\s*```$')


def get_cache_key(prompt: str) -> str:
    """Normalize a user prompt and return its SHA-256 hex digest as a cache key."""
    normalized = _RE_WHITESPACE.sub(' ', prompt.strip().lower())
    normalized = _RE_TRAILING.sub('', normalized)
    return "graph:" + hashlib.sha256(normalized.encode("utf-8")).hexdigest()


# --- UTILITY FUNCTION: Safe JSON Parser ---
def parse_json_response(response_text: str) -> dict:
    """
    Safely parse JSON from an LLM response that may be wrapped in a Markdown
    fenced code block.

    Only unwraps when the ENTIRE response is a fenced block to avoid
    corrupting valid JSON that contains backticks in field values
    (e.g., a code_snippet field).

    Handled formats:
      - ```json\n{...}\n```
      - ```\n{...}\n```
      - plain {raw JSON}
    """
    response_text = response_text.strip()
    if response_text.startswith('```') and response_text.endswith('```'):
        # Use pre-compiled, length-bounded patterns (ReDoS-safe)
        response_text = _RE_FENCE_OPEN.sub('', response_text)
        response_text = _RE_FENCE_CLOSE.sub('', response_text)
        response_text = response_text.strip()
    return json.loads(response_text)

# --- 1. SETUP API KEY ---
GENAI_KEY = os.getenv("GEMINI_API_KEY")
if not GENAI_KEY:
    logger.critical("GEMINI_API_KEY is missing — AI endpoints will not function.")
    genai.configure(api_key="missing")  # Prevents crash; requests will fail gracefully
else:
    genai.configure(api_key=GENAI_KEY)

# --- 2. SELF-HEALING MODEL SELECTOR ---
def get_valid_models() -> list[str]:
    """Query the Gemini API for models that support content generation."""
    valid_models: list[str] = []
    try:
        logger.info("🔍 Scanning for available AI models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                valid_models.append(m.name)
    except Exception:
        # Do not log the raw exception — it may contain API key fragments
        logger.warning("⚠️ Could not enumerate available models. Falling back to defaults.")
        return []

    # Prefer newer 2.x flash models (fastest + cheapest)
    valid_models.sort(key=lambda x: 'flash' in x, reverse=True)
    valid_models.sort(key=lambda x: '2.' in x, reverse=True)
    return valid_models


AVAILABLE_MODELS = get_valid_models()
logger.info("✅ AUTO-DETECTED MODELS: %s", AVAILABLE_MODELS)

if not AVAILABLE_MODELS:
    AVAILABLE_MODELS = ["models/gemini-2.0-flash", "models/gemini-1.5-flash"]
    logger.warning("Model scan returned nothing — using hardcoded fallback list.")

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GraphRequest(BaseModel):
    prompt: str

class ChatRequest(BaseModel):
    message: str
    context: str

class CodeRequest(BaseModel):
    prompt: str
    language: str

def get_smart_response(prompt_text: str, use_json: bool = False) -> str:
    """Try each available Gemini model in priority order; raise 503 if all fail."""
    for model_name in AVAILABLE_MODELS:
        try:
            logger.info("🔄 Trying model: %s", model_name)
            clean_name = model_name if model_name.startswith("models/") else f"models/{model_name}"
            model = genai.GenerativeModel(clean_name)
            config = {"response_mime_type": "application/json"} if use_json else {}
            response = model.generate_content(prompt_text, generation_config=config)
            logger.info("✅ SUCCESS with %s", clean_name)
            return response.text
        except Exception:
            # Log without raw error to avoid leaking upstream provider details
            logger.warning("⚠️ Model %s failed — trying next.", model_name)
            continue

    # 503 Service Unavailable is semantically correct when all upstream providers fail
    raise HTTPException(
        status_code=503,
        detail="The AI service is temporarily unavailable. Please try again later."
    )

@app.get("/")
def health_check():
    return {"status": "Online", "models": AVAILABLE_MODELS}

_SYSTEM_PROMPT = """
You are a System Visualization AI.
Generate a JSON object for a node-based graph editor (ReactFlow).
Strict JSON Schema:
{
  "title": "Short Title",
  "summary": "1 sentence summary",
  "explanation": "Brief explanation",
  "execution_trace": "Step-by-step logic trace",
  "code_snippet": "Python code representation",
  "nodes": [{"id": "1", "label": "Start"}],
  "edges": [{"source": "1", "target": "2", "label": "next"}]
}
"""

_GENERIC_ERROR = "An unexpected error occurred. Please try again."


@app.post("/generate")
@limiter.limit("10/minute")
async def generate_graph(request: Request, payload: GraphRequest):
    if not GENAI_KEY:
        raise HTTPException(status_code=503, detail="AI service is not configured.")

    cache_key = get_cache_key(payload.prompt)
    try:
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.info("🚀 Cache Hit — returning cached graph.")
            return json.loads(cached_result)
    except Exception:
        logger.warning("⚠️ Cache read failed — proceeding without cache.")

    try:
        response_text = get_smart_response(
            f"{_SYSTEM_PROMPT}\n\nUSER PROMPT: {payload.prompt}",
            use_json=True
        )
        result_json = parse_json_response(response_text)
        try:
            cache.setex(cache_key, 86400, json.dumps(result_json))
            logger.info("💾 Cached new graph layout.")
        except Exception:
            logger.warning("⚠️ Cache write failed — response will not be cached.")
        return result_json
    except HTTPException:
        raise  # Re-raise HTTPException as-is (already has correct status + generic detail)
    except Exception:
        logger.exception("Unhandled error in /generate")
        raise HTTPException(status_code=500, detail=_GENERIC_ERROR)


@app.post("/chat")
@limiter.limit("20/minute")
async def chat_with_ai(request: Request, payload: ChatRequest):
    try:
        response_text = get_smart_response(
            f"Context: {payload.context}\nUser: {payload.message}",
            use_json=False
        )
        return {"reply": response_text}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in /chat")
        raise HTTPException(status_code=500, detail=_GENERIC_ERROR)


@app.post("/regenerate_code")
@limiter.limit("15/minute")
async def regenerate_code(request: Request, payload: CodeRequest):
    try:
        response_text = get_smart_response(
            f"Convert the following to {payload.language}. Return ONLY the code:\n{payload.prompt}",
            use_json=False
        )
        clean_code = response_text.replace("```", "")
        return {"code_snippet": clean_code, "code_explanation": f"Converted to {payload.language}"}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled error in /regenerate_code")
        raise HTTPException(status_code=500, detail=_GENERIC_ERROR)