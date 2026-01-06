import React from "react";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer footer-section">
      <p>Footer - © {new Date().getFullYear()} TubeStamp. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
