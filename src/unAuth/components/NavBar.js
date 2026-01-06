import React from "react";
import "./NavBar.css";
import tubestampsImage from "../../assets/tubestamps.png";

const NavBar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo">
          <img
            src={tubestampsImage}
            alt="TubeStamp Logo"
            className="logo-image"
          />
        </div>

        {/* Right-side navigation */}
        <div className="navbar-right">
          <ul className="navbar-menu">
            <li className="navbar-item">
              <a href="#pricing" className="navbar-link">
                Pricing
              </a>
            </li>
            <li className="navbar-item">
              <a href="#blog" className="navbar-link">
                Blog
              </a>
            </li>
          </ul>

          <a href="#quote" className="quote-button">
            Make quick time stamps with your video!
          </a>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
