
console.log("Daily Cheer Tracker content script loaded");

// Check if we're running in a Chrome extension environment
const isChromeExtension = (): boolean => {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
};

// Only add listeners if we're in an extension environment
if (isChromeExtension()) {
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'autofillForm') {
      handleFormAutofill(message.data);
      sendResponse({ success: true });
    }
    return true;
  });
}

// Function to handle auto-filling Google Form
function handleFormAutofill(data: any) {
  console.log("Auto-filling form with data:", data);
  
  try {
    // Give the form a moment to fully render
    setTimeout(() => {
      // Find and fill form fields
      const formInputs = document.querySelectorAll('input[type="text"], textarea');
      
      formInputs.forEach((input: Element) => {
        const inputElement = input as HTMLInputElement | HTMLTextAreaElement;
        const inputId = inputElement.id || '';
        const ariaLabel = inputElement.getAttribute('aria-label')?.toLowerCase() || '';
        
        // Try to match inputs with our data
        if (inputId.includes('entry.') || ariaLabel) {
          // Check for name field
          if (ariaLabel.includes('name') && data.userName) {
            inputElement.value = data.userName;
            simulateInputEvent(inputElement);
          }
          
          // Check for date field
          else if (ariaLabel.includes('date') && data.date) {
            inputElement.value = data.date;
            simulateInputEvent(inputElement);
          }
          
          // Check for client field
          else if (ariaLabel.includes('client') && data.client) {
            inputElement.value = data.client;
            simulateInputEvent(inputElement);
          }
          
          // Check for time field
          else if ((ariaLabel.includes('time') || ariaLabel.includes('hours')) && data.timeSpent) {
            inputElement.value = data.timeSpent;
            simulateInputEvent(inputElement);
          }
          
          // Check for description field
          else if ((ariaLabel.includes('description') || ariaLabel.includes('task') || 
                   ariaLabel.includes('summary')) && data.tasksDescription) {
            inputElement.value = data.tasksDescription;
            simulateInputEvent(inputElement);
          }
          
          // Check for GitHub issue field
          else if ((ariaLabel.includes('github') || ariaLabel.includes('issue')) && data.githubIssue) {
            inputElement.value = data.githubIssue;
            simulateInputEvent(inputElement);
          }
        }
      });
      
      console.log("Form auto-fill complete");
      
      // Alternative approach using known field IDs would be implemented here
      // if the above generic approach doesn't work well
      
    }, 1000);
  } catch (error) {
    console.error("Error auto-filling form:", error);
  }
}

// Helper function to simulate user input to trigger form validation
function simulateInputEvent(element: HTMLElement) {
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
  const changeEvent = new Event('change', { bubbles: true });
  element.dispatchEvent(changeEvent);
}

// Export functions for testing in browser environment
export { handleFormAutofill };
