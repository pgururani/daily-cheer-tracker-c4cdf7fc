
console.log('Daily Cheer Tracker content script loaded');

// Function to detect and log all form fields on the page
const detectFormFields = () => {
  console.log('Detecting form fields on the page...');
  
  // Find all input, select, and textarea elements
  const inputElements = document.querySelectorAll('input, select, textarea');
  const formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }> = {};
  
  inputElements.forEach((element, index) => {
    const inputElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const name = inputElement.name || '';
    const id = inputElement.id || '';
    const type = inputElement.tagName.toLowerCase() === 'input' 
      ? (inputElement as HTMLInputElement).type 
      : inputElement.tagName.toLowerCase();
    
    // Use name or id as the identifier, fall back to index if neither exists
    const fieldId = name || id || `field_${index}`;
    
    formFields[fieldId] = {
      element: inputElement,
      type,
      name,
      id
    };
    
    console.log(`Detected field: ${fieldId}`, {
      type,
      name,
      id,
      value: inputElement.value,
    });
  });
  
  return formFields;
};

// Function to autofill form fields with provided values
const autofillFormFields = (fields: Record<string, string>) => {
  console.log('Autofilling form with data:', fields);
  
  for (const [selector, value] of Object.entries(fields)) {
    // Try to find element by name, id, or as a fallback, class
    const element = 
      document.querySelector(`[name="${selector}"]`) || 
      document.getElementById(selector) ||
      document.querySelector(`.${selector}`);
    
    if (element && (element instanceof HTMLInputElement || 
                    element instanceof HTMLSelectElement || 
                    element instanceof HTMLTextAreaElement)) {
      // Set the value
      element.value = value;
      console.log(`Filled field ${selector} with value: ${value}`);
      
      // Dispatch input event to trigger any listeners
      const event = new Event('input', { bubbles: true });
      element.dispatchEvent(event);
      
      // For select elements, also dispatch change event
      if (element instanceof HTMLSelectElement) {
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
      }
    } else {
      console.warn(`Field ${selector} not found in form`);
    }
  }
};

// Listen for messages from background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  try {
    if (message.action === 'detectFields') {
      // Detect and return form fields on the page
      const fields = detectFormFields();
      sendResponse({ 
        success: true, 
        fields,
        url: window.location.href
      });
    } else if (message.action === 'autofillForm') {
      // Handle autofill request
      console.log("Processing autofill request with data:", message.data);
      autofillFormFields(message.data);
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error("Error in content script:", error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
  
  return true; // Indicate async response
});

// Run field detection when the content script loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded in content script context:', window.location.href);
  detectFormFields();
});

// Export for testing
export {};
