import google.generativeai as genai

# PASTE YOUR KEY HERE
MY_KEY = "AIzaSyDbexmjvKxLPLUxOneVc5JkJ_ag0BK0zRY" 

genai.configure(api_key=MY_KEY)

print("Checking available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
    print("\nSUCCESS! Your key works.")
except Exception as e:
    print(f"\nERROR: {e}")