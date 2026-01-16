import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import "./Timestamps.css";

console.log("YOUTUBE KEY:", process.env.REACT_APP_YOUTUBE_API_KEY);
console.log("ALL ENV:", process.env);


const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;

const Timestamps = () => {
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatingTimestamps, setGeneratingTimestamps] = useState(false);
  const [timestamps, setTimestamps] = useState(null);
  const [copied, setCopied] = useState(false);

  // Extract video ID from YouTube URL
  const extractVideoId = (url) => {
    const match = url.match(YOUTUBE_URL_REGEX);
    return match ? match[5] : null;
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    setVideoData(null);
    setError(null);
    setTimestamps(null);

    if (value === "") {
      setIsValid(true);
    } else {
      setIsValid(YOUTUBE_URL_REGEX.test(value));
    }
  };

  const fetchVideoData = async (videoId) => {
    
    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY;

    if (!apiKey) {
      setError("YouTube API key is missing. Please check your .env file.");
      console.error("REACT_APP_YOUTUBE_API_KEY is not defined in environment variables");
      return;
    }

    setLoading(true);
    setError(null);

    // Construct the API URL
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
    
    // Log the request payload/details
    console.log("YouTube API Request:", {
      method: "GET",
      url: apiUrl,
      videoId: videoId,
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : "missing",
      params: {
        part: "snippet",
        id: videoId,
        key: apiKey ? "***" : "missing"
      }
    });

    try {
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error("Failed to fetch video data");
      }

      const data = await response.json();
      
      // Log the response
      console.log("YouTube API Response:", {
        status: response.status,
        statusText: response.statusText,
        data: data
      });

      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        const snippet = video.snippet;
        
        // Get max resolution thumbnail, fallback to high if not available
        const thumbnails = snippet.thumbnails;
        const thumbnailUrl = thumbnails.maxres?.url || 
                            thumbnails.high?.url || 
                            thumbnails.medium?.url || 
                            thumbnails.default?.url;

        setVideoData({
          title: snippet.title,
          thumbnail: thumbnailUrl,
        });
      } else {
        setError("Video not found.");
      }
    } catch (err) {
      setError("Failed to fetch video information. Please try again.");
      console.error("Error fetching video data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!YOUTUBE_URL_REGEX.test(url)) return;

    const videoId = extractVideoId(url);
    if (videoId) {
      fetchVideoData(videoId);
    }
  };

  const handleGenerateTimestamps = async () => {
    if (!url || !YOUTUBE_URL_REGEX.test(url)) {
      setError("Please enter a valid YouTube URL first.");
      return;
    }

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
        console.log("[Timestamps] Using local emulator URL format");
      } else {
        functionURL = `https://${region}-${projectId}.cloudfunctions.net/generate_timestamps`;
      }

      console.log("[Timestamps] Calling generate_timestamps function at:", functionURL);
      console.log("[Timestamps] Project ID:", projectId);
      console.log("[Timestamps] Region:", region);
      console.log("[Timestamps] Is Local:", isLocal);
      console.log("[Timestamps] Request payload:", { url });
      
      // Verify emulator is accessible (for local development)
      if (isLocal) {
        console.log("[Timestamps] Make sure Firebase Functions emulator is running: firebase emulators:start --only functions");
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
          console.error("[Timestamps] Failed to parse JSON response:", parseError);
          console.error("[Timestamps] Response text:", responseText);
          throw new Error(`Invalid JSON response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
        }
      } else {
        console.error("[Timestamps] Non-JSON response received:", responseText);
        throw new Error(`Unexpected response format. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }
      
      console.log("[Timestamps] Response status:", response.status);
      console.log("[Timestamps] Response data:", data);

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
      console.log("[Timestamps] Timestamps data received:", {
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
      console.error("[Timestamps] Error generating timestamps:", err);
      
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

  const handleCopyTimestamps = () => {
    if (!timestamps || timestamps.length === 0) return;

    // Format timestamps as a string with each timestamp on a new line
    const timestampText = timestamps
      .map((ts) => {
        if (ts.timestamp && ts.description) {
          return `${ts.timestamp} - ${ts.description}`;
        } else if (ts.timestamp && ts.text) {
          return `${ts.timestamp} - ${ts.text}`;
        } else if (ts.timestamp) {
          return ts.timestamp;
        } else if (ts.description) {
          return ts.description;
        } else if (ts.text) {
          return ts.text;
        }
        return JSON.stringify(ts);
      })
      .join('\n');

    navigator.clipboard.writeText(timestampText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Failed to copy timestamps:', err);
      setError('Failed to copy timestamps to clipboard');
    });
  };
//asdfasdfgit
  return (
    <div className="timestamps">
      <h1>AI YouTube Timestamps</h1>

      <p className="timestamps-description">
        Generates timestamps for a given YouTube video using the bump-1.0 model.
      </p>

      <div className="url-input-row">
        <div
          className={`url-input-wrapper ${
            !isValid ? "input-error" : ""
          }`}
        >
          <FontAwesomeIcon icon={faLink} className="url-icon" />
          <input
            type="url"
            value={url}
            onChange={handleChange}
            placeholder="Enter YouTube video URL"
            className="url-input"
            onKeyPress={(e) => {
              if (e.key === "Enter" && isValid && url !== "") {
                handleGenerate();
              }
            }}
          />
        </div>

        <button
          className="generate-button"
          onClick={handleGenerate}
          disabled={!isValid || url === "" || loading}
        >
          {loading ? "Loading..." : "Generate"}
        </button>
      </div>

      {!isValid && (
        <p className="input-error-text">
          Please enter a valid YouTube URL.
        </p>
      )}

      {error && (
        <p className="input-error-text">
          {error}
        </p>
      )}

      {videoData && (
        <div className="video-preview">
          <img
            src={videoData.thumbnail}
            alt={videoData.title}
            className="video-thumbnail"
          />
          <h2 className="video-title">{videoData.title}</h2>
          <button
            className="generate-button"
            onClick={handleGenerateTimestamps}
            disabled={generatingTimestamps}
            style={{ marginTop: "20px" }}
          >
            {generatingTimestamps ? "Generating Timestamps..." : "Generate Timestamps"}
          </button>
          
          {timestamps && timestamps.length > 0 && (
            <div className="timestamps-display">
              <div className="timestamps-header">
                <h3 className="timestamps-heading">Timestamps</h3>
                <button
                  className="copy-button"
                  onClick={handleCopyTimestamps}
                  title="Copy all timestamps"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="timestamps-list">
                {timestamps.map((timestamp, index) => (
                  <div key={index} className="timestamp-item">
                    {timestamp.timestamp && timestamp.description && (
                      <span className="timestamp-line">
                        <span className="timestamp-time">{timestamp.timestamp}</span>
                        <span className="timestamp-separator"> - </span>
                        <span className="timestamp-description">{timestamp.description}</span>
                      </span>
                    )}
                    {timestamp.timestamp && timestamp.text && (
                      <span className="timestamp-line">
                        <span className="timestamp-time">{timestamp.timestamp}</span>
                        <span className="timestamp-separator"> - </span>
                        <span className="timestamp-description">{timestamp.text}</span>
                      </span>
                    )}
                    {timestamp.timestamp && !timestamp.description && !timestamp.text && (
                      <span className="timestamp-time">{timestamp.timestamp}</span>
                    )}
                    {!timestamp.timestamp && timestamp.description && (
                      <span className="timestamp-description">{timestamp.description}</span>
                    )}
                    {!timestamp.timestamp && timestamp.text && (
                      <span className="timestamp-description">{timestamp.text}</span>
                    )}
                    {!timestamp.timestamp && !timestamp.description && !timestamp.text && (
                      <span className="timestamp-description">{JSON.stringify(timestamp)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Timestamps;
