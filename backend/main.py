import os
import json
import sys
import re
import hashlib
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv
import redis
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

# --- REDIS CONFIG & CONNECTIVITY ---
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_URL = os.getenv("REDIS_URL", "")

class InMemoryCache:
    """Fallback in-memory cache if Redis is unavailable."""
    def __init__(self):
        self._cache = {}
        print("💡 Created in-memory fallback prompt cache.")

    def get(self, key: str) -> str:
        return self._cache.get(key)

    def setex(self, key: str, time: int, value: str):
        self._cache[key] = value

# Initialize Cache (Redis with memory fallback)
redis_client = None
cache = None
try:
    if REDIS_URL:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    else:
        redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, socket_connect_timeout=2)
    
    redis_client.ping()
    print("✅ Connected to Redis cache successfully.")
    cache = redis_client
except Exception as e:
    print(f"⚠️ Redis is not available: {e}. Falling back to in-memory cache.")
    cache = InMemoryCache()

# --- RATE LIMITER CONFIG ---
storage_uri = REDIS_URL if REDIS_URL else f"redis://{REDIS_HOST}:{REDIS_PORT}"
if redis_client is None:
    storage_uri = "memory://"

limiter = Limiter(key_func=get_remote_address, storage_uri=storage_uri)

def get_cache_key(prompt: str) -> str:
    """Normalize user prompt and return a SHA-256 hash representation."""
    normalized = prompt.strip().lower()
    normalized = re.sub(r'\s+', ' ', normalized)
    normalized = re.sub(r'[?!.]+$', '', normalized)
    hash_val = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return f"graph:{hash_val}"


# --- UTILITY FUNCTION: Safe JSON Parser ---
def parse_json_response(response_text: str):
    """
    Safely parse JSON from LLM response, handling markdown code blocks.
    
    Only unwraps if the ENTIRE response is a fenced block to avoid breaking
    valid JSON that contains backticks in field values (e.g., code_snippet).
    
    Handles cases like:
    - ```json\n{...}\n```
    - ```\n{...}\n```
    - {raw JSON with "field": "```code```"}
    """
    response_text = response_text.strip()
    
    # Only unwrap if the entire response is wrapped in backticks
    # This prevents breaking JSON with backticks in field values
    if response_text.startswith('```') and response_text.endswith('```'):
        # Remove opening fence and any optional Markdown info string (json, JSON, js, etc.)
        response_text = re.sub(r'^```[^\n]*\n?', '', response_text)
        # Remove closing fence (```)
        response_text = re.sub(r'\s*```$', '', response_text)
        response_text = response_text.strip()
    
    return json.loads(response_text)

# --- 1. SETUP API KEY ---
GENAI_KEY = os.getenv("GEMINI_API_KEY")
if not GENAI_KEY:
    print("⚠️ CRITICAL: GEMINI_API_KEY is missing!")
    # Use a dummy key to prevent startup crash, but AI will fail later
    genai.configure(api_key="missing")
else:
    genai.configure(api_key=GENAI_KEY)

# --- 2. SELF-HEALING MODEL SELECTOR ---
# This function asks Google what models are actually valid right now.
def get_valid_models():
    valid_models = []
    try:
        print("🔍 Scanning for available AI models...")
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                valid_models.append(m.name)
    except Exception as e:
        print(f"⚠️ Could not list models: {e}")
        return []
    
    # Sort them to prefer newer '2.0' or '2.5' models
    # This puts the best models at the front of the list
    valid_models.sort(key=lambda x: 'flash' in x, reverse=True)
    valid_models.sort(key=lambda x: '2.' in x, reverse=True)
    
    return valid_models

# Run the scan once at startup
AVAILABLE_MODELS = get_valid_models()
print(f"✅ AUTO-DETECTED MODELS: {AVAILABLE_MODELS}")

# If scan failed, force these defaults as a Hail Mary
if not AVAILABLE_MODELS:
    AVAILABLE_MODELS = ["models/gemini-2.0-flash", "models/gemini-1.5-flash"]

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

def get_smart_response(prompt_text, use_json=False):
    last_error = None
    
    # Loop through the models we FOUND (not guessed)
    for model_name in AVAILABLE_MODELS:
        try:
            print(f"🔄 Trying model: {model_name}...")
            # Handle 'models/' prefix if present
            clean_name = model_name if "models/" in model_name else f"models/{model_name}"
            model = genai.GenerativeModel(clean_name)
            
            config = {"response_mime_type": "application/json"} if use_json else {}
            
            response = model.generate_content(
                prompt_text,
                generation_config=config
            )
            
            print(f"✅ SUCCESS with {clean_name}!")
            return response.text
            
        except Exception as e:
            print(f"⚠️ {model_name} failed. Error: {e}")
            last_error = e
            continue
            
    raise HTTPException(status_code=500, detail=f"All models failed. Last error: {last_error}")

@app.get("/")
def health_check():
    return {"status": "Online", "models": AVAILABLE_MODELS}

@app.post("/generate")
@limiter.limit("10/minute")
async def generate_graph(request: Request, payload: GraphRequest):
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="API Key missing on Render.")

    cache_key = get_cache_key(payload.prompt)
    try:
        cached_result = cache.get(cache_key)
        if cached_result:
            print(f"🚀 Cache Hit for key: {cache_key}")
            return json.loads(cached_result)
    except Exception as cache_err:
        print(f"⚠️ Cache read error: {cache_err}")

    system_prompt = """
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
    try:
        response_text = get_smart_response(f"{system_prompt}\n\nUSER PROMPT: {payload.prompt}", use_json=True)
        result_json = parse_json_response(response_text)
        try:
            cache.setex(cache_key, 86400, json.dumps(result_json))
            print(f"💾 Cached new graph layout under key: {cache_key}")
        except Exception as cache_err:
            print(f"⚠️ Cache write error: {cache_err}")
        return result_json
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
@limiter.limit("20/minute")
async def chat_with_ai(request: Request, payload: ChatRequest):
    try:
        response_text = get_smart_response(f"Context: {payload.context}\nUser: {payload.message}", use_json=False)
        return {"reply": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/regenerate_code")
@limiter.limit("15/minute")
async def regenerate_code(request: Request, payload: CodeRequest):
    try:
        response_text = get_smart_response(f"Convert: {payload.prompt} to {payload.language}. Return ONLY code.", use_json=False)
        return {"code_snippet": response_text.replace("```",""), "code_explanation": f"Converted to {payload.language}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))