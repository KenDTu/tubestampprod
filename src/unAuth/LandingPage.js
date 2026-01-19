import React, { useState } from "react";
import "./LandingPage.css";

import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Timestamps from "./components/Timestamps";
import VideoList from "./components/timestampcomp/VideoList";
import Bumpups from "./components/Bumpups";

const LandingPage = () => {
  const [url, setUrl] = useState("");
  const [videoData, setVideoData] = useState(null);

  return (
    <div className="landing-page">
      <NavBar />

      {/* Hero / Landing Card */}
      <div className="landing-card">
        <h1 className="landing-title">tubestamps.</h1>
        <p className="landing-subtitle">
          The website that automatically generates your YouTube timestamps.
        </p>
      </div>

      {/* Timestamps section */}
      <section className="section-container timestamps-section">
        <Timestamps url={url} setUrl={setUrl} videoData={videoData} setVideoData={setVideoData} />
      </section>

      {/* Generated Timestamps section */}
      {videoData && (
        <section className="section-container timestamps-section generated-timestamps-section">
          <VideoList url={url} videoData={videoData} setUrl={setUrl} setVideoData={setVideoData} />
        </section>
      )}

      {/* Section divider */}
      <div className="section-divider" />

      {/* Bumpups section */}
      <section className="section-container bumpups-section">
        <Bumpups />
      </section>

      {/* Footer section */}
      <section className="footer-section">
        <Footer />
      </section>
    </div>
  );
};

export default LandingPage;
