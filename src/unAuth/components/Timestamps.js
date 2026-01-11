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
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("[Timestamps] Non-JSON response received:", text);
        throw new Error(`Unexpected response format. Status: ${response.status}`);
      }
      
      console.log("[Timestamps] Response status:", response.status);
      console.log("[Timestamps] Response data:", data);

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      // For now, just console.log the data as requested
      console.log("[Timestamps] Timestamps data received:", {
        url: data.url,
        model: data.model,
        language: data.language,
        timestamps_style: data.timestamps_style,
        timestamps_list: data.timestamps_list,
        timestamps_string: data.timestamps_string,
        video_duration: data.video_duration,
      });

    } catch (err) {
      console.error("[Timestamps] Error generating timestamps:", err);
      
      // Provide more helpful error messages
      if (err.message.includes("Failed to fetch") || err.message.includes("ERR_CONNECTION_REFUSED")) {
        setError("Failed to connect to Firebase Functions. Make sure the emulator is running on port 5001.");
      } else {
        setError(`Failed to generate timestamps: ${err.message}`);
      }
    } finally {
      setGeneratingTimestamps(false);
    }
  };

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
        </div>
      )}
    </div>
  );
};

export default Timestamps;
