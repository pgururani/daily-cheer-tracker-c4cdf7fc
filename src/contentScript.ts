
console.log('Daily Cheer Tracker content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  // Handle autofill request
  if (message.action === 'autofillForm') {
    console.log("Processing autofill request with data:", message.data);
    try {
      const { fields, values } = message.data;
      
      // Loop through form fields and fill them
      for (const fieldName in fields) {
        const fieldId = fields[fieldName];
        const fieldValue = values[fieldName];
        
        if (fieldId && fieldValue) {
          const element = document.querySelector(`[name="${fieldId}"]`) as HTMLInputElement | HTMLTextAreaElement;
          if (element) {
            element.value = fieldValue;
            console.log(`Filled field ${fieldName} (${fieldId}) with value: ${fieldValue}`);
            
            // Dispatch input event to trigger any listeners
            const event = new Event('input', { bubbles: true });
            element.dispatchEvent(event);
          } else {
            console.warn(`Field ${fieldId} not found in form`);
          }
        }
      }
      
      // Log success and send response
      console.log("Content script completed autofill successfully");
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
