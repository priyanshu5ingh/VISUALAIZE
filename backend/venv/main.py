# backend/main.py
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from google.api_core import exceptions

# --- CONFIGURATION ---
MY_GOOGLE_KEY = "AIzaSyDbexmjvKxLPLUxOneVc5JkJ_ag0BK0zRY" 
genai.configure(api_key=MY_GOOGLE_KEY)

MODEL_FALLBACK_LIST = [
    'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-pro', 'gemini-1.5-flash'
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class Node(BaseModel):
    id: str
    label: str
    type: str = "default" 

class Edge(BaseModel):
    source: str
    target: str
    label: Optional[str] = ""

class GraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    title: str               
    summary: str             
    explanation: str         
    example_input: str       
    execution_trace: str     
    code_snippet: str        
    code_explanation: str    

class PromptRequest(BaseModel):
    prompt: str

class CodeRequest(BaseModel):
    prompt: str
    language: str

# NEW: Chat Request Model
class ChatRequest(BaseModel):
    message: str
    context: str  # The summary/explanation of the current graph

# --- ENDPOINTS ---

@app.post("/generate", response_model=GraphResponse)
async def generate_graph(request: PromptRequest):
    print(f"Generating Graph for: {request.prompt}")
    
    system_prompt = """
    You are an Expert Computer Science Professor. Output JSON containing a graph, lesson, and Python code.
    STRICT JSON STRUCTURE:
    {
      "nodes": [{"id": "q0", "label": "Start", "type": "default"}],
      "edges": [{"source": "q0", "target": "q1", "label": "0"}],
      "title": "Short Title",
      "summary": "1-sentence summary.",
      "explanation": "Educational paragraph.",
      "example_input": "Example input",
      "execution_trace": "Step-by-step trace",
      "code_snippet": "Python code implementation.",
      "code_explanation": "Brief description of the code."
    }
    RULES: Output ONLY valid JSON. Escape newlines in code_snippet.
    """
    return await call_gemini(system_prompt, request.prompt)

@app.post("/regenerate_code")
async def regenerate_code(request: CodeRequest):
    print(f"Rewriting code in {request.language}...")
    system_prompt = f"""
    You are an Expert Coder. 
    1. Implement the logic described in the user prompt using {request.language}.
    2. Output ONLY a JSON object with two fields: "code_snippet" and "code_explanation".
    STRICT JSON STRUCTURE:
    {{
      "code_snippet": "The executable {request.language} code. Use \\n for newlines.",
      "code_explanation": "A short sentence explaining this {request.language} implementation."
    }}
    """
    return await call_gemini(system_prompt, f"Logic to implement: {request.prompt}")

# NEW: Chat Endpoint
@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    print(f"Chat Message: {request.message}")
    
    system_prompt = f"""
    You are a friendly and helpful AI Tutor.
    The student is looking at a graph visualization with this context: "{request.context}".
    
    Answer their specific question clearly and concisely.
    If they ask for clarification, explain it like they are 5 years old.
    Keep the response short (under 3 sentences) so it fits in a chat bubble.
    """
    
    # We use a simple helper to get text response, not JSON
    for model_name in MODEL_FALLBACK_LIST:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(f"{system_prompt}\nSTUDENT QUESTION: {request.message}")
            return {"reply": response.text}
        except Exception:
            continue
    raise HTTPException(status_code=429, detail="Server Busy")

# --- HELPER FUNCTION ---
async def call_gemini(system_prompt, user_prompt):
    last_error = None
    for model_name in MODEL_FALLBACK_LIST:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(f"{system_prompt}\nUSER REQUEST: {user_prompt}")
            clean_text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_text)
        except Exception as e:
            last_error = str(e)
            continue
    raise HTTPException(status_code=429, detail=f"Server Busy: {last_error}")