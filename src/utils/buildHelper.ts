
/**
 * Helper utilities for extension builds and debugging
 */

// Log environment information on startup
export function logEnvironmentInfo() {
  const isExtension = !!chrome?.runtime?.id;
  const buildTime = new Date().toISOString();
  const mode = import.meta.env.MODE;
  
  console.log(`
  ========================================
  Daily Cheer Tracker Extension
  ----------------------------------------
  Running as extension: ${isExtension ? "Yes" : "No"}
  Mode: ${mode}
  Build time: ${buildTime}
  ========================================
  `);
  
  return {
    isExtension,
    buildTime,
    mode
  };
}

// Create a link in browser mode to help load as extension
export function createExtensionLink() {
  if (!!chrome?.runtime?.id) return; // Skip if already in extension
  
  // Add a helper message for loading as extension
  const helpDiv = document.createElement('div');
  helpDiv.style.position = 'fixed';
  helpDiv.style.bottom = '10px';
  helpDiv.style.right = '10px';
  helpDiv.style.background = 'rgba(0,0,0,0.7)';
  helpDiv.style.color = 'white';
  helpDiv.style.padding = '8px 12px';
  helpDiv.style.borderRadius = '4px';
  helpDiv.style.fontSize = '12px';
  helpDiv.style.zIndex = '9999';
  helpDiv.innerHTML = 'To load as extension: <br>1. Run <code>npm run build</code><br>2. Load <code>dist</code> folder in Chrome Extensions';
  
  document.body.appendChild(helpDiv);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    helpDiv.style.opacity = '0';
    helpDiv.style.transition = 'opacity 1s';
    
    // Remove from DOM after fade
    setTimeout(() => helpDiv.remove(), 1000);
  }, 10000);
}

// Helper for extension version and environment checks
export function getEnvironmentDetails() {
  return {
    isExtension: !!chrome?.runtime?.id,
    version: chrome?.runtime?.getManifest?.()?.version || 'Not an extension',
    browser: getBrowserInfo(),
    url: window.location.href,
    timestamp: new Date().toISOString()
  };
}

// Detect browser type
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  
  if (userAgent.indexOf("Chrome") > -1) return "Chrome";
  if (userAgent.indexOf("Safari") > -1) return "Safari";
  if (userAgent.indexOf("Firefox") > -1) return "Firefox";
  if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) return "IE";
  if (userAgent.indexOf("Edge") > -1) return "Edge";
  
  return "Unknown";
}

// Export for module usage
export default {
  logEnvironmentInfo,
  createExtensionLink,
  getEnvironmentDetails
};
