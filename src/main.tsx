
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logEnvironmentInfo, createExtensionLink } from './utils/buildHelper';

// Add error handling
const handleError = (error: Error) => {
  console.error("Application failed to start:", error);
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2 style="color: #e11d48;">Application Error</h2>
        <p>There was a problem starting the Daily Cheer Tracker.</p>
        <pre style="margin-top: 10px; font-family: monospace; background: #f3f4f6; padding: 10px; border-radius: 4px; text-align: left;">
          ${error.message}\n${error.stack || ''}
        </pre>
      </div>
    `;
  }
};

try {
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

  // Render the app
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  createRoot(rootElement).render(<App />);

  // If in extension context, initialize any extension-specific features
  if (isExtension) {  
    // Set extension badge
    if (chrome.action?.setBadgeText) {
      chrome.action.setBadgeText({ text: "0" });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
      console.log("Extension badge initialized");
    }
    
    // Log successful extension initialization
    console.log("Extension successfully initialized at", new Date().toISOString());
  } else {
    // In browser context, create helper UI for loading as extension
    createExtensionLink();
    console.log("Running in browser mode. Extension helper UI added.");
  }
} catch (error) {
  handleError(error instanceof Error ? error : new Error(String(error)));
}
