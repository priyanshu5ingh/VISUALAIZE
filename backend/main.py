import os
import json
import sys
import re
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

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
async def generate_graph(request: GraphRequest):
    if not GENAI_KEY:
        raise HTTPException(status_code=500, detail="API Key missing on Render.")

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
        response_text = get_smart_response(f"{system_prompt}\n\nUSER PROMPT: {request.prompt}", use_json=True)
        return parse_json_response(response_text)
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        response_text = get_smart_response(f"Context: {request.context}\nUser: {request.message}", use_json=False)
        return {"reply": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/regenerate_code")
async def regenerate_code(request: CodeRequest):
    try:
        response_text = get_smart_response(f"Convert: {request.prompt} to {request.language}. Return ONLY code.", use_json=False)
        return {"code_snippet": response_text.replace("```",""), "code_explanation": f"Converted to {request.language}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))