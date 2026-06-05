import os
import json
import sys
import re
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from typing import List
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions
from dotenv import load_dotenv

room_users = {}

load_dotenv()

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

def parse_json_response(response_text: str):
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
        print(f"⚠️ JSON Parse Error: {e}. Applying regex fallback for invalid escapes...")
        # Clean up invalid backslash escapes that break json.loads
        # Matches a backslash NOT preceded by a backslash, and NOT followed by a valid JSON escape char
        cleaned_text = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', clean_text)
        return json.loads(cleaned_text, strict=False)

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
    """
    Scans and returns available generative AI models.

    Returns:
        list: A sorted list of available model names prioritizing newer models.
    """
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
print(f"AUTO-DETECTED MODELS: {AVAILABLE_MODELS}")

# If scan failed, force these defaults as a Hail Mary
if not AVAILABLE_MODELS:
    AVAILABLE_MODELS = ["models/gemini-2.0-flash", "models/gemini-1.5-flash"]

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            await connection.send_json(data)

manager = ConnectionManager()

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
            
        except google_exceptions.Unauthenticated as e:
            print(f"⚠️ Unauthenticated (Invalid API Key) with {model_name}: {e}")
            raise HTTPException(
                status_code=401,
                detail="GEMINI_API_KEY_INVALID: The provided Gemini API key is invalid."
            )
        except google_exceptions.PermissionDenied as e:
            print(f"⚠️ Permission Denied with {model_name}: {e}")
            raise HTTPException(
                status_code=403,
                detail="GEMINI_API_KEY_INVALID: The provided Gemini API key is invalid or lacks necessary permissions."
            )
        except google_exceptions.ResourceExhausted as e:
            print(f"⚠️ Rate/Quota Limit Exceeded with {model_name}: {e}")
            raise HTTPException(
                status_code=429,
                detail="GEMINI_RATE_LIMIT_EXCEEDED: Gemini API rate limit or quota exceeded. Please try again later."
            )
        except google_exceptions.InvalidArgument as e:
            print(f"⚠️ Invalid Argument with {model_name}: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"GEMINI_BAD_REQUEST: Invalid request parameters: {e.message}"
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
                raise HTTPException(status_code=400, detail=f"GEMINI_BAD_REQUEST: {err_msg}")
            
            print(f"⚠️ {model_name} failed. Error: {e}")
            last_error = e
            continue
            
    raise HTTPException(status_code=500, detail=f"All models failed. Last error: {last_error}")

@app.get("/")
def health_check():
    """
    Checks the health of the API and returns available models.

    Returns:
        dict: A dictionary containing status and models.
    """
    return {"status": "Online", "models": AVAILABLE_MODELS}

@app.post("/generate")
async def generate_graph(request: GraphRequest):
    """
    Generates a structured graph layout JSON based on a prompt.

    Args:
        request (GraphRequest): The request containing the user's prompt.

    Returns:
        dict: The parsed JSON object representing nodes and edges.
        
    Raises:
        HTTPException: If the API key is missing or generation fails.
    """
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="API Key missing on Render.")
    if not GENAI_KEY or GENAI_KEY == "missing" or not GENAI_KEY.strip():
        raise HTTPException(
            status_code=401,
            detail="GEMINI_API_KEY_MISSING: Gemini API key is missing. Please configure GEMINI_API_KEY in your .env file."
        )

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
    
    IMPORTANT: You MUST return perfectly valid JSON. 
    All backslashes in code_snippet or strings MUST be properly double-escaped (e.g. \\n, \\t).
    """
    try:
        response_text = get_smart_response(f"{system_prompt}\n\nUSER PROMPT: {request.prompt}", use_json=True)
        return json.loads(response_text)
    except HTTPException as he:
        raise he
    except json.JSONDecodeError as je:
        print(f"JSONDecodeError: {je}")
        raise HTTPException(
            status_code=400,
            detail="GEMINI_BAD_REQUEST: The AI visualization model failed to output structured JSON. This usually occurs if the prompt contains invalid commands, malicious requests, or is outside the scope of system visualization, resulting in a refusal or malformed output."
        )
        return parse_json_response(response_text)
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """
    Processes a chat message given the graph context.

    Args:
        request (ChatRequest): The request containing message and context.

    Returns:
        dict: A dictionary with the AI's reply.
        
    Raises:
        HTTPException: If generation fails.
    """
    try:
        response_text = get_smart_response(f"Context: {request.context}\nUser: {request.message}", use_json=False)
        return {"reply": response_text}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/regenerate_code")
async def regenerate_code(request: CodeRequest):
    """
    Regenerates the code snippet into a specified programming language.

    Args:
        request (CodeRequest): The request containing prompt and language.

    Returns:
        dict: A dictionary with the new code snippet and explanation.
        
    Raises:
        HTTPException: If generation fails.
    """
    try:
        response_text = get_smart_response(f"Convert: {request.prompt} to {request.language}. Return ONLY code.", use_json=False)
        return {"code_snippet": response_text.replace("```",""), "code_explanation": f"Converted to {request.language}"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "USER_JOIN":
                room_id = data["roomId"]
                client_id = data["clientId"]

            if data["type"] == "CURSOR_MOVE":
                room_id = data["roomId"]

    for client in connected_clients[room_id]:
        if client != websocket:
            await client.send_json({
                "type": "CURSOR_MOVE",
                "clientId": data["clientId"],
                "position": data["position"]
            })

                if room_id not in room_users:
                    room_users[room_id] = set()

                room_users[room_id].add(client_id)

                await websocket.send_json({
                    "type": "ROOM_USERS",
                    "users": list(room_users[room_id])
                })

    except Exception as e:
        print("WebSocket error:", e)