
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
    } else if (message.action === "fillForm") {
      // Handle form filling request
      console.log("Processing form fill request:", message);
      
      const { formConfig, userName, date, client, timeSpent, githubIssue } = message;
      if (!formConfig || !formConfig.url) {
        throw new Error("Missing form configuration");
      }
      
      // Format date if needed
      const formattedDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();
      
      // Create URL with prefilled data
      const url = new URL(formConfig.url);
      
      // Add form parameters
      if (formConfig.fields.name && userName) {
        url.searchParams.append(formConfig.fields.name, userName);
      }
      
      if (formConfig.fields.date) {
        url.searchParams.append(formConfig.fields.date, formattedDate);
      }
      
      if (formConfig.fields.client && client) {
        url.searchParams.append(formConfig.fields.client, client);
      }
      
      if (formConfig.fields.time && timeSpent) {
        url.searchParams.append(formConfig.fields.time, timeSpent);
      }
      
      if (formConfig.fields.githubIssue && githubIssue) {
        url.searchParams.append(formConfig.fields.githubIssue, githubIssue);
      }
      
      // Open the URL in a new tab
      chrome.tabs.create({ url: url.toString() }, (tab) => {
        console.log("Opened form in new tab:", tab.id);
      });
      
      sendResponse({ success: true });
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

// Send analytics or telemetry (if permitted by user)
function logTelemetry(eventName: string, data: Record<string, any>) {
  console.log(`Telemetry: ${eventName}`, data);
  // Implementation would go here if user opted in to analytics
}

// Export for testing
export {};
