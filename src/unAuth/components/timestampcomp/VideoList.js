import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHammer } from "@fortawesome/free-solid-svg-icons";
import StampPop from "./StampPop";
import History from "../History";
import "./VideoList.css";

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;

const VideoList = ({ url, videoData, setUrl, setVideoData }) => {
  const [generatingTimestamps, setGeneratingTimestamps] = useState(false);
  const [timestamps, setTimestamps] = useState(null);
  const [error, setError] = useState(null);

  // Check history before making API call
  const checkHistory = (videoUrl) => {
    try {
      const stored = localStorage.getItem("youtube_timestamps_history");
      if (stored) {
        const items = JSON.parse(stored);
        const historyItem = items.find(item => item.url === videoUrl);
        if (historyItem) {
          return historyItem;
        }
      }
    } catch (err) {
      console.error("Error checking history:", err);
    }
    return null;
  };

  const handleGenerateTimestamps = async () => {
    if (!url || !YOUTUBE_URL_REGEX.test(url)) {
      setError("Please enter a valid YouTube URL first.");
      return;
    }

    // Check history first - if found, load from history instead of making API call
    const historyItem = checkHistory(url);
    if (historyItem) {
      console.log("[VideoList] Loading timestamps from history for:", url);
      setTimestamps(historyItem.timestamps);
      setError(null);
      return;
    }

    // Not in history, make API call
    setGeneratingTimestamps(true);
    setError(null);

    try {
      const projectId = process.env.REACT_APP_PROJECT_ID;
      const region = "us-central1"; // Default region for Firebase Functions
      
      // Construct the Firebase Functions URL
      // For Python gen2 functions in emulator, the format is:
      // http://localhost:5001/PROJECT_ID/REGION/FUNCTION_NAME
      // For production: https://REGION-PROJECT_ID.cloudfunctions.net/FUNCTION_NAME
      const isLocal = window.location.hostname === "localhost" || process.env.REACT_APP_ENV === "local";
      
      // Try different URL formats for the emulator
      let functionURL;
      if (isLocal) {
        // Format for Python gen2 functions in emulator
        functionURL = `http://localhost:5001/${projectId}/${region}/generate_timestamps`;
        console.log("[VideoList] Using local emulator URL format");
      } else {
        functionURL = `https://${region}-${projectId}.cloudfunctions.net/generate_timestamps`;
      }

      console.log("[VideoList] Calling generate_timestamps function at:", functionURL);
      console.log("[VideoList] Project ID:", projectId);
      console.log("[VideoList] Region:", region);
      console.log("[VideoList] Is Local:", isLocal);
      console.log("[VideoList] Request payload:", { url });
      
      // Verify emulator is accessible (for local development)
      if (isLocal) {
        console.log("[VideoList] Make sure Firebase Functions emulator is running: firebase emulators:start --only functions");
      }

      // Call the Firebase function using fetch (since it's an HTTP endpoint)
      const response = await fetch(functionURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      // Handle non-JSON responses
      let data;
      const contentType = response.headers.get("content-type");
      const responseText = await response.text();
      
      if (contentType && contentType.includes("application/json")) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("[VideoList] Failed to parse JSON response:", parseError);
          console.error("[VideoList] Response text:", responseText);
          throw new Error(`Invalid JSON response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
        }
      } else {
        console.error("[VideoList] Non-JSON response received:", responseText);
        throw new Error(`Unexpected response format. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }
      
      console.log("[VideoList] Response status:", response.status);
      console.log("[VideoList] Response data:", data);

      if (!response.ok) {
        // Extract error message properly
        let errorMessage = `Request failed with status ${response.status}`;
        if (data) {
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.error && typeof data.error === 'object') {
            errorMessage = data.error.message || JSON.stringify(data.error);
          } else if (typeof data.message === 'string') {
            errorMessage = data.message;
          } else if (typeof data === 'string') {
            errorMessage = data;
          }
        }
        throw new Error(errorMessage);
      }

      // Store timestamps in state for display
      console.log("[VideoList] Timestamps data received:", {
        url: data.url,
        model: data.model,
        language: data.language,
        timestamps_style: data.timestamps_style,
        timestamps_list: data.timestamps_list,
        timestamps_string: data.timestamps_string,
        video_duration: data.video_duration,
      });

      // Store timestamps for display
      if (data.timestamps_list && Array.isArray(data.timestamps_list) && data.timestamps_list.length > 0) {
        setTimestamps(data.timestamps_list);
      } else if (data.timestamps_string) {
        // Fallback: parse timestamps_string if timestamps_list is not available
        // Split by newlines and create timestamp objects
        const lines = data.timestamps_string.split('\n').filter(line => line.trim());
        const parsedTimestamps = lines.map(line => {
          // Try to extract timestamp pattern (e.g., "00:01:23 - Description")
          const timestampMatch = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]\s*(.+)$/);
          if (timestampMatch) {
            return {
              timestamp: timestampMatch[1],
              description: timestampMatch[2].trim()
            };
          }
          // If no timestamp pattern, treat entire line as description
          return { description: line.trim() };
        });
        setTimestamps(parsedTimestamps.length > 0 ? parsedTimestamps : [{ description: data.timestamps_string }]);
      } else {
        setTimestamps([]);
      }

    } catch (err) {
      console.error("[VideoList] Error generating timestamps:", err);
      
      // Extract error message properly
      let errorMessage = "An unknown error occurred";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        errorMessage = err.message || err.error || JSON.stringify(err);
      }
      
      // Provide more helpful error messages
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("ERR_CONNECTION_REFUSED") || errorMessage.includes("NetworkError")) {
        setError("Failed to connect to Firebase Functions. Make sure the emulator is running on port 5001.");
      } else {
        setError(`Failed to generate timestamps: ${errorMessage}`);
      }
    } finally {
      setGeneratingTimestamps(false);
    }
  };

  // Handle loading from history
  const handleLoadHistory = (historyUrl, historyVideoData, historyTimestamps) => {
    // Set all state values together - timestamps will be preserved
    setUrl(historyUrl);
    setVideoData(historyVideoData);
    setTimestamps(historyTimestamps);
    setError(null);
  };

  return (
    <div className="video-list">
      {videoData && (
        <div className="video-list-content">
          <button
            className="generate-button"
            onClick={handleGenerateTimestamps}
            disabled={generatingTimestamps}
          >
            {generatingTimestamps ? (
              <>
                <FontAwesomeIcon icon={faHammer} className="hammer-icon" />
                <span>Generating Timestamps...</span>
              </>
            ) : (
              "Generate Timestamps"
            )}
          </button>

          {error && (
            <p className="input-error-text">
              {error}
            </p>
          )}

          {timestamps && timestamps.length > 0 && (
            <StampPop timestamps={timestamps} />
          )}

          <History
            url={url}
            videoData={videoData}
            timestamps={timestamps}
            onLoadHistory={handleLoadHistory}
          />
        </div>
      )}
    </div>
  );
};

export default VideoList;

