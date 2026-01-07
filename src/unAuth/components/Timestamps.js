import React from "react";
import "./Timestamps.css";

const Timestamps = () => {
  return (
    <div className="timestamps">
      <h1>AI YouTube Timestamps</h1>

      <p className="timestamps-description">
        Generates timestamps for a given YouTube video using the bump-1.0 model.
        This software was built using a YouTube tutorial and AI.
      </p>

      {/* URL input + button */}
      <div className="url-input-row">
        <input
          type="url"
          placeholder="Enter YouTube video URL"
          className="url-input"
        />
        <button className="generate-button">Generate</button>
      </div>
    </div>
  );
};

export default Timestamps;
