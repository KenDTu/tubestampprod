import React from "react";
import "./NavBar.css";

const NavBar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h2 className="navbar-logo">TubeStamp</h2>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <a href="#home" className="navbar-link">Home</a>
          </li>
          <li className="navbar-item">
            <a href="#features" className="navbar-link">Features</a>
          </li>
          <li className="navbar-item">
            <a href="#about" className="navbar-link">About</a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default NavBar;

