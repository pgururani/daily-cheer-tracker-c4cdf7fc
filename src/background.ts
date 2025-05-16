
console.log('Daily Cheer Tracker background script loaded');

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed or updated:", details.reason);
  
  // Initialize storage with default values on install
  if (details.reason === "install") {
    console.log("First install - initializing storage with defaults");
    chrome.storage.local.set({
      tasks: [],
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
    } else if (message.action === "detectFields") {
      // Forward the message to the active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'detectFields' }, (response) => {
            sendResponse(response);
          });
        } else {
          sendResponse({ success: false, error: "No active tab found" });
        }
      });
      return true; // Keep the message channel open for async response
    } else if (message.action === "autofillForm") {
      // Forward the autofill request to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'autofillForm',
            data: message.data
          }, (response) => {
            sendResponse(response);
          });
        } else {
          sendResponse({ success: false, error: "No active tab found" });
        }
      });
      return true; // Keep the message channel open for async response
    } else if (message.action === "test") {
      // Test message handler
      console.log("Test message received");
      sendResponse({ 
        success: true, 
        message: "Background script is running correctly!" 
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

// Export for testing
export {};
