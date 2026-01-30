# backend/main.py
import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

# --- CONFIGURATION ---
GENAI_KEY = os.getenv("GEMINI_API_KEY")
if not GENAI_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

genai.configure(api_key=GENAI_KEY)

# Use Gemini 2.0 Flash for speed and JSON structure
MODEL_NAME = 'gemini-2.0-flash'

app = FastAPI()

# Enable CORS for Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS (Matching your ReactFlow Frontend) ---
class GraphRequest(BaseModel):
    prompt: str

class ChatRequest(BaseModel):
    message: str
    context: str

class CodeRequest(BaseModel):
    prompt: str
    language: str

# --- AI PROMPTS ---
SYSTEM_PROMPT = """
You are a System Architecture Visualization AI.
You do NOT generate images. You generate STRUCTURAL JSON data for a ReactFlow graph editor.

Your goal is to visualize complex systems (Neural Networks, DFAs, System Flows) by breaking them into NODES and EDGES.

You must return a SINGLE valid JSON object with this exact schema:
{
    "title": "Short title of the system",
    "summary": "1-sentence executive summary",
    "explanation": "3-4 bullet points explaining the logic",
    "example_input": "A sample input for the system",
    "execution_trace": "Step-by-step trace of how the system processes the input",
    "code_snippet": "Python (or relevant) code implementation of the system",
    "nodes": [
        {"id": "1", "label": "Input Layer"},
        {"id": "2", "label": "Hidden Layer"}
    ],
    "edges": [
        {"source": "1", "target": "2", "label": "Weights"}
    ]
}

RULES:
1. Node IDs must be strings ("1", "2").
2. 'source' and 'target' in edges must match Node IDs.
3. Keep labels concise.
4. Return ONLY JSON. No Markdown formatting.
"""

# --- ROUTES ---

@app.get("/")
def health_check():
    return {"status": "Online", "model": MODEL_NAME}

@app.post("/generate")
async def generate_graph(request: GraphRequest):
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        # We explicitly ask for JSON mode
        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\nUSER PROMPT: {request.prompt}",
            generation_config={"response_mime_type": "application/json"}
        )
        
        # Clean up response if Gemini adds markdown code blocks (rare in JSON mode but possible)
        text_response = response.text.replace("```json", "").replace("```", "").strip()
        
        return json.loads(text_response)

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        prompt = f"""
        Context: {request.context}
        
        User Question: {request.message}
        
        Answer as a helpful AI Tutor explaining the system architecture. Keep it brief (2-3 sentences).
        """
        response = model.generate_content(prompt)
        return {"reply": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/regenerate_code")
async def regenerate_code(request: CodeRequest):
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        prompt = f"""
        Original System: {request.prompt}
        Target Language: {request.language}
        
        Return ONLY the code implementation in {request.language}. No markdown.
        """
        response = model.generate_content(prompt)
        # Clean formatting
        clean_code = response.text.replace("```" + request.language.lower(), "").replace("```", "").strip()
        
        return {
            "code_snippet": clean_code,
            "code_explanation": f"Rewritten in {request.language}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))