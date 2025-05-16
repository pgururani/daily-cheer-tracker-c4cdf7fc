
console.log('Daily Cheer Tracker content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  // Handle autofill request
  if (message.action === 'autofillForm') {
    console.log("Processing autofill request with data:", message.data);
    try {
      // Log success and send response
      console.log("Content script completed task successfully");
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error in content script:", error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  
  return true; // Indicate async response
});

// Add this to help debug route issues
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded in content script context:', window.location.href);
});

// Export for testing
export {};
