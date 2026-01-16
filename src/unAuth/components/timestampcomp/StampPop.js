import React, { useState } from "react";
import "./StampPop.css";

const StampPop = ({ timestamps }) => {
  const [copied, setCopied] = useState(false);

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
    });
  };

  if (!timestamps || timestamps.length === 0) {
    return null;
  }

  return (
    <div className="stamp-pop">
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
    </div>
  );
};

export default StampPop;

