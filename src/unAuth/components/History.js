import React, { useState, useEffect, useCallback } from "react";
import "./History.css";

const STORAGE_KEY = "youtube_timestamps_history";

const History = ({ url, videoData, timestamps, onLoadHistory }) => {
  const [historyItems, setHistoryItems] = useState([]);

  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        // Sort by most recent first (by timestamp)
        const sorted = items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setHistoryItems(sorted);
      }
    } catch (err) {
      console.error("Error loading history:", err);
    }
  }, []);

  const saveToHistory = useCallback((videoUrl, videoInfo, timestampList) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let items = stored ? JSON.parse(stored) : [];

      // Check if this URL already exists in history
      const existingIndex = items.findIndex(item => item.url === videoUrl);

      const historyItem = {
        url: videoUrl,
        videoData: {
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
        },
        timestamps: timestampList,
        timestamp: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        // Update existing entry
        items[existingIndex] = historyItem;
      } else {
        // Add new entry
        items.push(historyItem);
      }

      // Limit history to last 50 items
      if (items.length > 50) {
        items = items.slice(0, 50);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      loadHistory(); // Reload to update UI
    } catch (err) {
      console.error("Error saving to history:", err);
    }
  }, [loadHistory]);

  // Load history from localStorage on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Save to history when new timestamps are generated
  useEffect(() => {
    if (url && videoData && timestamps && timestamps.length > 0) {
      saveToHistory(url, videoData, timestamps);
    }
  }, [url, videoData, timestamps, saveToHistory]);

  const deleteFromHistory = (videoUrl) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let items = JSON.parse(stored);
        items = items.filter(item => item.url !== videoUrl);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        loadHistory();
      }
    } catch (err) {
      console.error("Error deleting from history:", err);
    }
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setHistoryItems([]);
    } catch (err) {
      console.error("Error clearing history:", err);
    }
  };

  const handleLoadHistory = (item) => {
    if (onLoadHistory) {
      onLoadHistory(item.url, item.videoData, item.timestamps);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (historyItems.length === 0) {
    return null; // Don't show history if empty
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h3 className="history-title">History</h3>
        {historyItems.length > 0 && (
          <button
            className="history-clear-button"
            onClick={clearHistory}
            title="Clear all history"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="history-list">
        {historyItems.map((item, index) => (
          <div key={index} className="history-item">
            <div
              className="history-item-content"
              onClick={() => handleLoadHistory(item)}
            >
              <img
                src={item.videoData.thumbnail}
                alt={item.videoData.title}
                className="history-thumbnail"
              />
              <div className="history-item-info">
                <h4 className="history-item-title">{item.videoData.title}</h4>
                <p className="history-item-date">{formatDate(item.timestamp)}</p>
                <p className="history-item-count">
                  {item.timestamps?.length || 0} timestamps
                </p>
              </div>
            </div>
            <button
              className="history-delete-button"
              onClick={(e) => {
                e.stopPropagation();
                deleteFromHistory(item.url);
              }}
              title="Delete from history"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;

