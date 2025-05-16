
console.log('Daily Cheer Tracker background script loaded');

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed or updated:", details.reason);
  
  // Initialize storage with default values on install
  if (details.reason === "install") {
    console.log("First install - initializing storage with defaults");
    chrome.storage.local.set({
      tasks: [],
      formURL: "",
      installDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }, () => {
      console.log("Default storage initialized");
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script received message:", message);
  
  try {
    // Process message based on action type
    if (message.action === "getVersion") {
      sendResponse({ 
        version: chrome.runtime.getManifest().version,
        success: true 
      });
    } else {
      console.log("Unhandled message action:", message.action);
      sendResponse({ success: false, error: "Unknown action" });
    }
  } catch (error) {
    console.error("Error in background script:", error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
  
  return true; // Keep message channel open for async response
});

// Send analytics or telemetry (if permitted by user)
function logTelemetry(eventName: string, data: Record<string, any>) {
  console.log(`Telemetry: ${eventName}`, data);
  // Implementation would go here if user opted in to analytics
}

// Export for testing
export {};
