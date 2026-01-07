import React, { useState } from "react";
import "./Timestamps.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(\S*)?$/;

const Timestamps = () => {
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(true);

  const handleChange = (e) => {
    const value = e.target.value;
    setUrl(value);

    if (value === "") {
      setIsValid(true);
    } else {
      setIsValid(YOUTUBE_URL_REGEX.test(value));
    }
  };

  const handleGenerate = () => {
    if (!YOUTUBE_URL_REGEX.test(url)) return;

    console.log("Valid YouTube URL:", url);
    // API call goes here
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
          />
        </div>

        <button
          className="generate-button"
          onClick={handleGenerate}
          disabled={!isValid || url === ""}
        >
          Generate
        </button>
      </div>

      {!isValid && (
        <p className="input-error-text">
          Please enter a valid YouTube URL.
        </p>
      )}
    </div>
  );
};

export default Timestamps;
