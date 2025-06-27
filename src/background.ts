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

// Helper function to check if tab exists and is accessible
const isTabAccessible = async (tabId: number): Promise<boolean> => {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab && !tab.url?.startsWith('chrome://') && !tab.url?.startsWith('chrome-extension://');
  } catch (error) {
    console.log("Tab not accessible:", error);
    return false;
  }
};

// Helper function to safely send message to content script
const sendMessageToTab = async (tabId: number, message: { action: string; data?: Record<string, string> }): Promise<{ success: boolean; error?: string; fields?: Record<string, unknown>; url?: string }> => {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Content script not ready:", chrome.runtime.lastError.message);
        resolve({ success: false, error: "Content script not available. Please refresh the page." });
      } else {
        resolve(response || { success: false, error: "No response from content script" });
      }
    });
  });
};

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
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]?.id) {
          const tabId = tabs[0].id;
          
          // Check if tab is accessible
          if (await isTabAccessible(tabId)) {
            const response = await sendMessageToTab(tabId, { action: 'detectFields' });
            sendResponse(response);
          } else {
            sendResponse({ 
              success: false, 
              error: "Cannot access this page. Please navigate to a regular webpage (not chrome:// or extension pages)." 
            });
          }
        } else {
          sendResponse({ success: false, error: "No active tab found" });
        }
      });
      return true; // Keep the message channel open for async response
    } else if (message.action === "autofillForm") {
      // Forward the autofill request to content script
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]?.id) {
          const tabId = tabs[0].id;
          
          // Check if tab is accessible
          if (await isTabAccessible(tabId)) {
            const response = await sendMessageToTab(tabId, { 
              action: 'autofillForm',
              data: message.data
            });
            sendResponse(response);
          } else {
            sendResponse({ 
              success: false, 
              error: "Cannot autofill on this page. Please navigate to a form page." 
            });
          }
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
