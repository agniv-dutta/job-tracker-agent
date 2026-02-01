"""
List available Watson AI models
"""
import httpx
import json
from dotenv import load_dotenv
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(override=True)

WATSONX_API_KEY = os.getenv("WATSONX_API_KEY")
WATSONX_URL = os.getenv("WATSONX_URL")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")

print("Getting IAM token...")
response = httpx.post(
    "https://iam.cloud.ibm.com/identity/token",
    headers={"Content-Type": "application/x-www-form-urlencoded"},
    data={
        "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
        "apikey": WATSONX_API_KEY
    },
    timeout=30.0
)

if response.status_code == 200:
    token = response.json().get("access_token")
    print("✅ Got token\n")
    
    # List available foundation models
    url = f"{WATSONX_URL}/ml/v1/foundation_model_specs?version=2023-05-29"
    
    models_response = httpx.get(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        },
        params={"project_id": WATSONX_PROJECT_ID},
        timeout=60.0
    )
    
    print(f"Status: {models_response.status_code}\n")
    
    if models_response.status_code == 200:
        data = models_response.json()
        models = data.get("resources", [])
        
        print(f"Found {len(models)} available models:\n")
        print("=" * 80)
        
        for model in models[:20]:  # Show first 20
            model_id = model.get("model_id", "")
            name = model.get("label", "")
            tasks = model.get("tasks", [])
            task_names = [t.get("id", "") if isinstance(t, dict) else str(t) for t in tasks]
            
            # Focus on text generation models
            task_str = ", ".join(task_names)
            if "generation" in task_str.lower() or "text" in task_str.lower():
                print(f"ID: {model_id}")
                print(f"Name: {name}")
                print(f"Tasks: {task_str}")
                print("-" * 80)
    else:
        print(f"Error: {models_response.text}")
else:
    print(f"Failed to get token: {response.status_code}")
