# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

import json
import os
import traceback
import requests
from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from firebase_admin import initialize_app

# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).
set_global_options(max_instances=10)

initialize_app()

BUMPUPS_API_URL = "https://api.bumpups.com/general/timestamps"

# CORS headers
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
}


@https_fn.on_request()
def generate_timestamps(req: https_fn.Request) -> https_fn.Response:
    """
    Generate timestamps for a YouTube video using the Bumpups API.
    Expects a POST request with JSON body containing 'url' (YouTube URL).
    """
    print(f"[generate_timestamps] Function called with method: {req.method}")
    
    # Handle CORS preflight
    if req.method == "OPTIONS":
        print("[generate_timestamps] Handling CORS preflight request")
        return https_fn.Response("", status=204, headers=CORS_HEADERS)

    # Only accept POST requests
    if req.method != "POST":
        print(f"[generate_timestamps] Method not allowed: {req.method}")
        headers = {**CORS_HEADERS, "Content-Type": "application/json"}
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers=headers
        )

    try:
        # Parse request body
        print("[generate_timestamps] Parsing request body")
        request_data = req.get_json(silent=True)
        
        if not request_data:
            print("[generate_timestamps] Error: Invalid or missing JSON in request body")
            headers = {**CORS_HEADERS, "Content-Type": "application/json"}
            return https_fn.Response(
                json.dumps({"error": "Invalid JSON in request body"}),
                status=400,
                headers=headers
            )

        print(f"[generate_timestamps] Request data received: {json.dumps(request_data)}")

        # Extract YouTube URL
        youtube_url = request_data.get("url")
        
        if not youtube_url:
            print("[generate_timestamps] Error: Missing required field 'url'")
            headers = {**CORS_HEADERS, "Content-Type": "application/json"}
            return https_fn.Response(
                json.dumps({"error": "Missing required field: url"}),
                status=400,
                headers=headers
            )

        print(f"[generate_timestamps] Processing YouTube URL: {youtube_url}")

        # Get API key from environment
        api_key = os.environ.get("BUMPUPS_API_KEY")
        
        if not api_key:
            print("[generate_timestamps] Error: BUMPUPS_API_KEY not found in environment")
            headers = {**CORS_HEADERS, "Content-Type": "application/json"}
            return https_fn.Response(
                json.dumps({"error": "API key not configured"}),
                status=500,
                headers=headers
            )

        print("[generate_timestamps] API key found in environment")

        # Prepare request payload with defaults
        payload = {
            "url": youtube_url,
            "model": "bump-1.0",
            "language": "en",
            "timestamps_style": "long"
        }

        print(f"[generate_timestamps] Preparing request to Bumpups API with payload: {json.dumps(payload)}")

        # Make request to Bumpups API
        headers = {
            "Content-Type": "application/json",
            "X-Api-Key": api_key
        }

        print(f"[generate_timestamps] Making POST request to {BUMPUPS_API_URL}")
        response = requests.post(
            BUMPUPS_API_URL,
            json=payload,
            headers=headers,
            timeout=60  # 60 second timeout for API calls
        )

        print(f"[generate_timestamps] Bumpups API response status: {response.status_code}")

        # Handle API response
        if response.status_code == 200:
            print("[generate_timestamps] Successfully received timestamps from Bumpups API")
            try:
                response_data = response.json()
                timestamp_count = len(response_data.get("timestamps_list", []))
                print(f"[generate_timestamps] Timestamps generated: {timestamp_count} timestamps found")
            except:
                print("[generate_timestamps] Could not parse response JSON, but status is 200")
            
            headers = {**CORS_HEADERS, "Content-Type": "application/json"}
            return https_fn.Response(
                response.text,
                status=200,
                headers=headers
            )
        else:
            # Forward the error from Bumpups API
            print(f"[generate_timestamps] Bumpups API returned error: {response.status_code}")
            print(f"[generate_timestamps] Error response body: {response.text[:500]}")
            headers = {**CORS_HEADERS, "Content-Type": "application/json"}
            return https_fn.Response(
                response.text,
                status=response.status_code,
                headers=headers
            )

    except requests.exceptions.Timeout:
        print("[generate_timestamps] Error: Request to Bumpups API timed out after 60 seconds")
        headers = {**CORS_HEADERS, "Content-Type": "application/json"}
        return https_fn.Response(
            json.dumps({"error": "Request to Bumpups API timed out"}),
            status=504,
            headers=headers
        )
    except requests.exceptions.RequestException as e:
        print(f"[generate_timestamps] RequestException occurred: {str(e)}")
        headers = {**CORS_HEADERS, "Content-Type": "application/json"}
        return https_fn.Response(
            json.dumps({"error": f"Error calling Bumpups API: {str(e)}"}),
            status=500,
            headers=headers
        )
    except Exception as e:
        print(f"[generate_timestamps] Unexpected error: {type(e).__name__}: {str(e)}")
        print(f"[generate_timestamps] Traceback: {traceback.format_exc()}")
        headers = {**CORS_HEADERS, "Content-Type": "application/json"}
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers=headers
        )