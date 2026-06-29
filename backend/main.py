import os
import json
import sys
import re
import time
import hashlib
import logging
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from dotenv import load_dotenv
import redis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

room_users = {}

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
cache = _redis_client if _redis_client is not None else InMemoryCache()

# --- RATE LIMITER CONFIG ---
if _redis_client is not None:
    # Use the same backend that the cache is using
    _limiter_storage = REDIS_URL if REDIS_URL else f"redis://{REDIS_HOST}:{REDIS_PORT}"
else:
    # Redis is down — limiter must also use in-process memory
    _limiter_storage = "memory://"

limiter = Limiter(key_func=get_remote_address, storage_uri=_limiter_storage)

# Pre-compiled regex patterns — compiled once at module load for performance
_RE_WHITESPACE  = re.compile(r'\s+')
_RE_TRAILING    = re.compile(r'[?!.]+$')
_RE_FENCE_OPEN  = re.compile(r'^```[^\n]*\n?')
_RE_FENCE_CLOSE = re.compile(r'\s*```$')

def get_cache_key(prompt: str) -> str:
    """Normalize a user prompt and return its SHA-256 hex digest as a cache key."""
    normalized = _RE_WHITESPACE.sub(' ', prompt.strip().lower())
    normalized = _RE_TRAILING.sub('', normalized)
    return "graph:" + hashlib.sha256(normalized.encode("utf-8")).hexdigest()

# --- UTILITY FUNCTION: Safe JSON Parser ---
def extract_json_from_response(response_text: str) -> str:
    """
    Safely extracts JSON from a fenced or raw LLM response.

    Handles:
    - ```json ... ``` blocks
    - ``` ... ``` blocks without language tag
    - Raw JSON responses with no fencing
    - Trailing assistant text after closing fence

    Args:
        response_text (str): Raw response string from the LLM.

    Returns:
        str: Clean JSON string ready for json.loads().

    Raises:
        ValueError: If no valid JSON block can be extracted.
    """
    # Try extracting from fenced block first
    match = re.search(
        r"```json\s*([\s\S]*?)\s*```",
        response_text,
        re.IGNORECASE
    )

    # Fallback to any fenced block
    if not match:
        match = re.search(
            r"```\s*([\s\S]*?)\s*```",
            response_text
        )
    if match:
        return match.group(1).strip()  
    
    # Fallback: attempt to use raw response as JSON
    stripped = response_text.strip()
    if stripped.startswith("{") or stripped.startswith("["):
        return stripped
    
    raise ValueError("No valid JSON block found in LLM response.")

def parse_json_response(response_text: str) -> dict:
    """
    Safely parses JSON from LLM response using extract_json_from_response.
    
    Args:
        response_text (str): Raw response string from the LLM.

    Returns:
        dict: Parsed JSON object.
    """
    try:
        clean_text = extract_json_from_response(response_text)
    except ValueError as e:
        # If extraction fails completely, fallback to trying the whole string
        clean_text = response_text

    try:
        return json.loads(clean_text, strict=False)
    except json.JSONDecodeError as e:
        logger.warning(f"⚠️ JSON Parse Error: {e}. Applying regex fallback for invalid escapes...")
        # Clean up invalid backslash escapes that break json.loads
        # Matches a backslash NOT preceded by a backslash, and NOT followed by a valid JSON escape char
        cleaned_text = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', clean_text)
        return json.loads(cleaned_text, strict=False)

# --- 1. SETUP API KEY ---
GENAI_KEY = os.getenv("GEMINI_API_KEY")
if not GENAI_KEY:
    logger.critical("⚠️ CRITICAL: GEMINI_API_KEY is missing!")
    # Use a dummy key to prevent startup crash, but AI will fail later
    genai.configure(api_key="missing")
else:
    genai.configure(api_key=GENAI_KEY)

# --- 2. SELF-HEALING MODEL SELECTOR ---
def get_valid_models() -> list[str]:
    """
    Scans and returns available generative AI models.

    Returns:
        list[str]: A sorted list of available model names prioritizing newer models.
    """
    valid_models: list[str] = []
    try:
        logger.info("🔍 Scanning for available AI models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                valid_models.append(m.name)
    except Exception as e:
        logger.warning(f"⚠️ Could not list models: {e}")
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
    """
    Generates a response from the LLM based on the prompt.

    Args:
        prompt_text (str): The prompt to send to the LLM.
        use_json (bool): Whether to enforce JSON response formatting.

    Returns:
        str: The raw text response from the LLM.
        
    Raises:
        HTTPException: If all models fail to generate a response.
    """
    if not GENAI_KEY or GENAI_KEY == "missing" or not GENAI_KEY.strip():
        raise HTTPException(
            status_code=401,
            detail="GEMINI_API_KEY_MISSING: Gemini API key is missing. Please configure GEMINI_API_KEY in your .env file."
        )

    last_error = None
    
    for model_name in AVAILABLE_MODELS:
        try:
            logger.info("🔄 Trying model: %s", model_name)
            clean_name = model_name if "models/" in model_name else f"models/{model_name}"
            model = genai.GenerativeModel(clean_name)
            
            config = {"response_mime_type": "application/json"} if use_json else {}
            
            response = model.generate_content(
                prompt_text,
                generation_config=config
            )
            
            logger.info("✅ SUCCESS with %s", clean_name)
            return response.text
            
        except google_exceptions.Unauthenticated as e:
            logger.warning("⚠️ Unauthenticated (Invalid API Key) with %s: %s", model_name, e)
            raise HTTPException(
                status_code=401,
                detail="GEMINI_API_KEY_INVALID: The provided Gemini API key is invalid."
            )
        except google_exceptions.PermissionDenied as e:
            logger.warning("⚠️ Permission Denied with %s: %s", model_name, e)
            raise HTTPException(
                status_code=403,
                detail="GEMINI_API_KEY_INVALID: The provided Gemini API key is invalid or lacks necessary permissions."
            )
        except google_exceptions.ResourceExhausted as e:
            logger.warning("⚠️ Rate/Quota Limit Exceeded with %s: %s", model_name, e)
            raise HTTPException(
                status_code=429,
                detail="GEMINI_RATE_LIMIT_EXCEEDED: Gemini API rate limit or quota exceeded. Please try again later."
            )
        except google_exceptions.InvalidArgument as e:
            logger.warning("⚠️ Invalid Argument with %s: %s", model_name, e)
            raise HTTPException(
                status_code=400,
                detail="GEMINI_BAD_REQUEST: Invalid request parameters."
            )
        except Exception as e:
            err_msg = str(e)
            if "safety" in err_msg.lower() or "blocked" in err_msg.lower() or "harmful" in err_msg.lower():
                raise HTTPException(
                    status_code=400,
                    detail="GEMINI_BAD_REQUEST: The request was blocked by AI safety filters (e.g. policy violations or illegal prompts). Please provide a valid request."
                )
            elif "API key not valid" in err_msg or "INVALID_ARGUMENT" in err_msg and "key" in err_msg.lower():
                raise HTTPException(status_code=401, detail="GEMINI_API_KEY_INVALID: The provided Gemini API key is invalid.")
            elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "quota" in err_msg.lower() or "rate limit" in err_msg.lower():
                raise HTTPException(status_code=429, detail="GEMINI_RATE_LIMIT_EXCEEDED: Gemini API rate limit or quota exceeded. Please try again later.")
            elif "403" in err_msg or "PERMISSION_DENIED" in err_msg:
                raise HTTPException(status_code=403, detail="GEMINI_API_KEY_INVALID: Permission denied. Please check your Gemini API key.")
            elif "400" in err_msg or "INVALID_ARGUMENT" in err_msg:
                raise HTTPException(status_code=400, detail="GEMINI_BAD_REQUEST: Invalid request parameters.")
            
            logger.warning("⚠️ %s failed. Error: %s", model_name, e)
            last_error = e
            continue
            
    raise HTTPException(status_code=500, detail=_GENERIC_ERROR)

@app.get("/")
def health_check():
    """
    Checks the health of the API and returns available models.

    Returns:
        dict: A dictionary containing status and models.
    """
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

IMPORTANT: You MUST return perfectly valid JSON. 
All backslashes in code_snippet or strings MUST be properly double-escaped (e.g. \\n, \\t).
"""

_GENERIC_ERROR = "An unexpected error occurred. Please try again."

@app.post("/generate")
@limiter.limit("10/minute")
async def generate_graph(request: Request, payload: GraphRequest):
    """
    Generates a structured graph layout JSON based on a prompt.

    Args:
        request (Request): The request object for rate limiting.
        payload (GraphRequest): The request containing the user's prompt.

    Returns:
        dict: The parsed JSON object representing nodes and edges.
        
    Raises:
        HTTPException: If the API key is missing or generation fails.
    """
    if not GENAI_KEY or GENAI_KEY == "missing" or not GENAI_KEY.strip():
        raise HTTPException(
            status_code=401,
            detail="GEMINI_API_KEY_MISSING: Gemini API key is missing. Please configure GEMINI_API_KEY in your .env file."
        )

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
        raise
    except json.JSONDecodeError as je:
        logger.error("JSONDecodeError: %s", je)
        raise HTTPException(
            status_code=400,
            detail="GEMINI_BAD_REQUEST: The AI visualization model failed to output structured JSON. This usually occurs if the prompt contains invalid commands, malicious requests, or is outside the scope of system visualization, resulting in a refusal or malformed output."
        )
    except Exception as e:
        logger.exception("Unhandled error in /generate")
        raise HTTPException(status_code=500, detail=_GENERIC_ERROR)


@app.post("/chat")
@limiter.limit("20/minute")
async def chat_with_ai(request: Request, payload: ChatRequest):
    """
    Processes a chat message given the graph context.

    Args:
        request (Request): The request object for rate limiting.
        payload (ChatRequest): The request containing message and context.

    Returns:
        dict: A dictionary with the AI's reply.
        
    Raises:
        HTTPException: If generation fails.
    """
    try:
        response_text = get_smart_response(
            f"Context: {payload.context}\nUser: {payload.message}",
            use_json=False
        )
        return {"reply": response_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in /chat")
        raise HTTPException(status_code=500, detail=_GENERIC_ERROR)


@app.post("/regenerate_code")
@limiter.limit("15/minute")
async def regenerate_code(request: Request, payload: CodeRequest):
    """
    Regenerates the code snippet into a specified programming language.

    Args:
        request (Request): The request object for rate limiting.
        payload (CodeRequest): The request containing prompt and language.

    Returns:
        dict: A dictionary with the new code snippet and explanation.
        
    Raises:
        HTTPException: If generation fails.
    """
    try:
        response_text = get_smart_response(
            f"Convert the following to {payload.language}. Return ONLY the code:\n{payload.prompt}",
            use_json=False
        )
        clean_code = response_text.replace("```", "")
        return {"code_snippet": clean_code, "code_explanation": f"Converted to {payload.language}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in /regenerate_code")
        raise HTTPException(status_code=500, detail=_GENERIC_ERROR)

# In-memory stores for WebSockets (In production, use Redis Pub/Sub for scale)
connected_clients: dict[str, set[WebSocket]] = {}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    room_id = None
    client_id = None
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Extract data
            msg_type = data.get("type")
            current_room = data.get("roomId")
            
            if not current_room:
                continue
                
            if current_room not in connected_clients:
                connected_clients[current_room] = set()
            if current_room not in room_users:
                room_users[current_room] = set()
                
            # Manage initial connection and setup
            if msg_type == "USER_JOIN":
                room_id = current_room
                client_id = data.get("clientId")
                
                connected_clients[room_id].add(websocket)
                if client_id:
                    room_users[room_id].add(client_id)
                    
                # Broadcast updated user list to everyone in the room
                for client in list(connected_clients[room_id]):
                    try:
                        await client.send_json({
                            "type": "ROOM_USERS",
                            "users": list(room_users[room_id])
                        })
                    except Exception as e:
                        logger.debug("Failed to send ROOM_USERS to client in room %s: %s", room_id, e)
                        
            elif msg_type == "CURSOR_MOVE":
                if current_room in connected_clients:
                    for client in list(connected_clients[current_room]):
                        if client != websocket:
                            try:
                                await client.send_json({
                                    "type": "CURSOR_MOVE",
                                    "clientId": data.get("clientId"),
                                    "position": data.get("position")
                                })
                            except Exception as e:
                                logger.debug("Failed to send CURSOR_MOVE to client in room %s: %s", current_room, e)
                                
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.error("WebSocket error: %s", e)
    finally:
        # Cleanup when client disconnects
        if room_id and client_id:
            if room_id in connected_clients and websocket in connected_clients[room_id]:
                connected_clients[room_id].remove(websocket)
            if room_id in room_users and client_id in room_users[room_id]:
                room_users[room_id].remove(client_id)
            
            # Notify remaining users
            if room_id in connected_clients:
                for client in list(connected_clients[room_id]):
                    try:
                        await client.send_json({
                            "type": "ROOM_USERS",
                            "users": list(room_users[room_id])
                        })
                    except Exception as e:
                        logger.debug("Failed to send ROOM_USERS (cleanup) to client in room %s: %s", room_id, e)
