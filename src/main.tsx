
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Check if running in browser extension context
const isExtension = !!chrome?.runtime?.id;

// Add some basic styling for extension popup
if (isExtension) {
  document.body.style.width = '400px';
  document.body.style.height = '600px';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
}

createRoot(document.getElementById("root")!).render(<App />);

// If in extension context, initialize any extension-specific features
if (isExtension) {
  console.log("Daily Cheer Tracker extension initialized");
  
  // Set extension badge
  if (chrome.action?.setBadgeText) {
    chrome.action.setBadgeText({ text: "0" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  }
}
