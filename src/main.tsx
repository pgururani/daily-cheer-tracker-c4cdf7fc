
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logEnvironmentInfo, createExtensionLink } from './utils/buildHelper';

// Log environment info on startup
logEnvironmentInfo();

// Check if running in browser extension context
const isExtension = !!chrome?.runtime?.id;

// Add some basic styling for extension popup
if (isExtension) {
  document.body.style.width = '400px';
  document.body.style.height = '600px';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  console.log("Daily Cheer Tracker extension initialized with popup styling");
}

createRoot(document.getElementById("root")!).render(<App />);

// If in extension context, initialize any extension-specific features
if (isExtension) {  
  // Set extension badge
  if (chrome.action?.setBadgeText) {
    chrome.action.setBadgeText({ text: "0" });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    console.log("Extension badge initialized");
  }
} else {
  // In browser context, create helper UI for loading as extension
  createExtensionLink();
  console.log("Running in browser mode. Extension helper UI added.");
}
