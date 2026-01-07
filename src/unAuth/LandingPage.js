import React from "react";
import "./LandingPage.css";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Timestamps from "./components/Timestamps";
import Bumpups from "./components/Bumpups";

const LandingPage = () => {
  return (
    <div className="landing-page">
      <NavBar />

      <div className="landing-card">
        <h1 className="landing-title">tubestamps.</h1>
        <p className="landing-subtitle">
          The website that automatically generates your YouTube timestamps.
        </p>
      </div>

      {/* Timestamps section */}
      <section className="section-container timestamps-section">
        <Timestamps />
      </section>

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
