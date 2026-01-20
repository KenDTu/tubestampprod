# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

import json
import os
import traceback
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
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


def call_bumpups_api(youtube_url, api_key):
    """
    Helper function to make a single call to Bumpups API.
    Returns tuple: (success: bool, data: dict or None, error: str or None)
    """
    payload = {
        "url": youtube_url,
        "model": "bump-1.0",
        "language": "en",
        "timestamps_style": "long"
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": api_key
    }
    
    try:
        print(f"[call_bumpups_api] Making request for URL: {youtube_url}")
        response = requests.post(
            BUMPUPS_API_URL,
            json=payload,
            headers=headers,
            timeout=60
        )
        
        if response.status_code == 200:
            return (True, response.json(), None)
        else:
            error_msg = f"Bumpups API returned status {response.status_code}: {response.text[:200]}"
            return (False, None, error_msg)
    except requests.exceptions.Timeout:
        return (False, None, "Request to Bumpups API timed out after 60 seconds")
    except Exception as e:
        return (False, None, f"Error calling Bumpups API: {str(e)}")


@https_fn.on_request(region="us-central1")
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

        # Check if request contains single URL or array of URLs (batch mode)
        youtube_url = request_data.get("url")
        youtube_urls = request_data.get("urls")  # Array for batch requests
        
        # Support both single URL (backward compatible) and batch URLs
        if youtube_urls and isinstance(youtube_urls, list):
            # BATCH MODE: Process multiple URLs in parallel
            print(f"[generate_timestamps] BATCH MODE: Processing {len(youtube_urls)} URLs")
            
            if len(youtube_urls) == 0:
                headers = {**CORS_HEADERS, "Content-Type": "application/json"}
                return https_fn.Response(
                    json.dumps({"error": "Empty 'urls' array provided"}),
                    status=400,
                    headers=headers
                )
            
            # Process all URLs in parallel using ThreadPoolExecutor
            results = []
            errors = []
            
            # Limit concurrent requests to avoid overwhelming the API
            max_workers = min(5, len(youtube_urls))  # Process up to 5 URLs concurrently
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all tasks
                future_to_url = {
                    executor.submit(call_bumpups_api, url, api_key): url 
                    for url in youtube_urls
                }
                
                # Collect results as they complete
                for future in as_completed(future_to_url):
                    url = future_to_url[future]
                    try:
                        success, data, error = future.result()
                        if success:
                            data["url"] = url  # Ensure URL is in response
                            results.append(data)
                            print(f"[generate_timestamps] Successfully processed URL: {url}")
                        else:
                            errors.append({"url": url, "error": error})
                            print(f"[generate_timestamps] Error processing URL {url}: {error}")
                    except Exception as e:
                        errors.append({"url": url, "error": str(e)})
                        print(f"[generate_timestamps] Exception processing URL {url}: {str(e)}")
            
            # Return batch response
            batch_response = {
                "batch": True,
                "total_requests": len(youtube_urls),
                "successful": len(results),
                "failed": len(errors),
                "results": results,
                "errors": errors if errors else None
            }
            
            # If only one URL was processed and it succeeded, return it in the original format for compatibility
            if len(youtube_urls) == 1 and len(results) == 1 and len(errors) == 0:
                headers = {**CORS_HEADERS, "Content-Type": "application/json"}
                return https_fn.Response(
                    json.dumps(results[0]),
                    status=200,
                    headers=headers
                )
            
            # Return batch results
            status_code = 200 if len(errors) == 0 else 207  # 207 = Multi-Status
            headers = {**CORS_HEADERS, "Content-Type": "application/json"}
            return https_fn.Response(
                json.dumps(batch_response),
                status=status_code,
                headers=headers
            )
        
        elif youtube_url:
            # SINGLE URL MODE: Original behavior (backward compatible)
            print(f"[generate_timestamps] SINGLE URL MODE: Processing URL: {youtube_url}")
            
            success, data, error = call_bumpups_api(youtube_url, api_key)
            
            if success:
                print("[generate_timestamps] Successfully received timestamps from Bumpups API")
                try:
                    timestamp_count = len(data.get("timestamps_list", []))
                    print(f"[generate_timestamps] Timestamps generated: {timestamp_count} timestamps found")
                except:
                    print("[generate_timestamps] Could not parse response JSON, but status is 200")
                
                headers = {**CORS_HEADERS, "Content-Type": "application/json"}
                return https_fn.Response(
                    json.dumps(data),
                    status=200,
                    headers=headers
                )
            else:
                # Return error response
                print(f"[generate_timestamps] Error: {error}")
                headers = {**CORS_HEADERS, "Content-Type": "application/json"}
                return https_fn.Response(
                    json.dumps({"error": error}),
                    status=500,
                    headers=headers
                )
        else:
            # Neither 'url' nor 'urls' provided
            print("[generate_timestamps] Error: Missing required field 'url' or 'urls'")
            headers = {**CORS_HEADERS, "Content-Type": "application/json"}
            return https_fn.Response(
                json.dumps({"error": "Missing required field: 'url' (string) or 'urls' (array)"}),
                status=400,
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