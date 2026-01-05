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
        <h1 className="landing-title">Hello Landing Page</h1>
        <p className="landing-subtitle">
          This is a basic React landing page component. Congrats Ken!
        </p>
      </div>
      <Timestamps />
      <Bumpups />
      <Footer />
    </div>
  );
};

export default LandingPage;
