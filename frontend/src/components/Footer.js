import React from 'react';
import { Link } from 'react-router-dom';
import { GiHoneycomb } from 'react-icons/gi'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-links">
          <Link to="/"><GiHoneycomb className="footer-icon" /> Home</Link>
          <Link to="/studywithbuddy"><GiHoneycomb className="footer-icon" />Grouping</Link>
          <Link to="/faq"><GiHoneycomb className="footer-icon" /> FAQ</Link>
          <Link to="/calendar"><GiHoneycomb className="footer-icon" /> Calendar</Link>
          <Link to="/pricing"><GiHoneycomb className="footer-icon" /> Pricing</Link>
        </div>
        <div className="footer-copyright">
          {new Date().getFullYear()} HiveMind.
        </div>
      </div>
    </footer>
  );
};

export default Footer;