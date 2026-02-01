"""
Test Watson AI Integration
"""
import httpx
import json
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv

# Force reload environment
load_dotenv(override=True)

IBM_IAM_API_KEY = os.getenv("IBM_IAM_API_KEY")
WATSONX_API_KEY = os.getenv("WATSONX_API_KEY")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
WATSONX_URL = os.getenv("WATSONX_URL")

# Use Watson API key if IBM IAM key not set
API_KEY_TO_USE = WATSONX_API_KEY or IBM_IAM_API_KEY

print("=" * 60)
print("WATSON AI AUTHENTICATION TEST")
print("=" * 60)
print(f"\nWATSONX_API_KEY: {WATSONX_API_KEY[:20]}..." if WATSONX_API_KEY else "Not set")
print(f"IBM_IAM_API_KEY: {IBM_IAM_API_KEY[:20]}..." if IBM_IAM_API_KEY else "Not set")
print(f"API_KEY_TO_USE: {API_KEY_TO_USE[:20]}..." if API_KEY_TO_USE else "Not set")
print(f"WATSONX_PROJECT_ID: {WATSONX_PROJECT_ID}")
print(f"WATSONX_URL: {WATSONX_URL}")

# Step 1: Get IAM Token
print("\n" + "=" * 60)
print("STEP 1: Getting IAM Token")
print("=" * 60)

try:
    response = httpx.post(
        "https://iam.cloud.ibm.com/identity/token",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": API_KEY_TO_USE
        },
        timeout=30.0
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        token_data = response.json()
        access_token = token_data.get("access_token")
        print(f"✅ SUCCESS! Got access token: {access_token[:30]}...")
        
        # Step 2: Test Watson API
        print("\n" + "=" * 60)
        print("STEP 2: Testing Watson API")
        print("=" * 60)
        
        url = f"{WATSONX_URL}/ml/v1/text/generation?version=2023-05-29"
        
        watson_response = httpx.post(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            json={
                "model_id": "ibm/granite-3-8b-instruct",
                "input": "Write a one-sentence professional greeting for a job application.",
                "parameters": {
                    "decoding_method": "greedy",
                    "max_new_tokens": 100,
                    "temperature": 0.7,
                    "repetition_penalty": 1.1
                },
                "project_id": WATSONX_PROJECT_ID
            },
            timeout=60.0
        )
        
        print(f"Status Code: {watson_response.status_code}")
        
        if watson_response.status_code == 200:
            result = watson_response.json()
            generated_text = result.get("results", [{}])[0].get("generated_text", "")
            print(f"✅ SUCCESS! Watson AI Response:")
            print(f"\n{generated_text}\n")
        else:
            print(f"❌ FAILED! Watson API Error:")
            print(f"Response: {watson_response.text}\n")
    else:
        print(f"❌ FAILED! IAM Authentication Error:")
        print(f"Response: {response.text}\n")
        
except Exception as e:
    print(f"❌ ERROR: {e}\n")

print("=" * 60)
print("TEST COMPLETE")
print("=" * 60)
