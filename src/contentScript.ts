
console.log("Daily Cheer Tracker content script loaded at", new Date().toISOString());

// Check if we're running in a Chrome extension environment
const isChromeExtension = (): boolean => {
  const isExtension = typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
  console.log("Content script running in Chrome extension environment:", isExtension);
  return isExtension;
};

// Only add listeners if we're in an extension environment
if (isChromeExtension()) {
  console.log("Setting up content script message listeners for form autofill");
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script received message:", message);
    
    if (message.action === 'autofillForm') {
      console.log("Attempting to autofill form with data:", message.data);
      handleFormAutofill(message.data);
      sendResponse({ success: true });
    }
    return true;
  });
  
  // Send a ready message to the background script
  try {
    chrome.runtime.sendMessage({ 
      action: 'contentScriptReady',
      url: window.location.href
    }, response => {
      if (response) {
        console.log("Background acknowledged content script is ready:", response);
      }
    });
  } catch (e) {
    console.log("Could not send ready message, likely in development mode");
  }
}

// Function to handle auto-filling Google Form
function handleFormAutofill(data: any) {
  console.log("Auto-filling form with data:", data);
  
  try {
    // Give the form a moment to fully render
    console.log("Waiting for form to render completely...");
    setTimeout(() => {
      console.log("Attempting to locate form fields...");
      // Find and fill form fields
      const formInputs = document.querySelectorAll('input[type="text"], textarea');
      console.log(`Found ${formInputs.length} potential form fields to fill`);
      
      let filledCount = 0;
      formInputs.forEach((input: Element) => {
        const inputElement = input as HTMLInputElement | HTMLTextAreaElement;
        const inputId = inputElement.id || '';
        const ariaLabel = inputElement.getAttribute('aria-label')?.toLowerCase() || '';
        
        console.log(`Examining field: ${inputId || ariaLabel}`);
        
        // Try to match inputs with our data
        if (inputId.includes('entry.') || ariaLabel) {
          // Check for name field
          if (ariaLabel.includes('name') && data.userName) {
            inputElement.value = data.userName;
            simulateInputEvent(inputElement);
            console.log(`Filled name field: ${data.userName}`);
            filledCount++;
          }
          
          // Check for date field
          else if (ariaLabel.includes('date') && data.date) {
            inputElement.value = data.date;
            simulateInputEvent(inputElement);
            console.log(`Filled date field: ${data.date}`);
            filledCount++;
          }
          
          // Check for client field
          else if (ariaLabel.includes('client') && data.client) {
            inputElement.value = data.client;
            simulateInputEvent(inputElement);
            console.log(`Filled client field: ${data.client}`);
            filledCount++;
          }
          
          // Check for time field
          else if ((ariaLabel.includes('time') || ariaLabel.includes('hours')) && data.timeSpent) {
            inputElement.value = data.timeSpent;
            simulateInputEvent(inputElement);
            console.log(`Filled time spent field: ${data.timeSpent}`);
            filledCount++;
          }
          
          // Check for description field
          else if ((ariaLabel.includes('description') || ariaLabel.includes('task') || 
                   ariaLabel.includes('summary')) && data.tasksDescription) {
            inputElement.value = data.tasksDescription;
            simulateInputEvent(inputElement);
            console.log(`Filled task description field`);
            filledCount++;
          }
          
          // Check for GitHub issue field
          else if ((ariaLabel.includes('github') || ariaLabel.includes('issue')) && data.githubIssue) {
            inputElement.value = data.githubIssue;
            simulateInputEvent(inputElement);
            console.log(`Filled GitHub issue field: ${data.githubIssue}`);
            filledCount++;
          }
        }
      });
      
      console.log(`Form auto-fill complete. Filled ${filledCount} fields out of ${formInputs.length}`);
      
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
