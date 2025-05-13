
// Content script for the Daily Cheer Tracker extension
// This script runs on Google Form pages to handle auto-filling

console.log('Daily Cheer Tracker content script loaded');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'autofillForm') {
    fillFormWithData(message.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
});

// Fill the form with the provided data
async function fillFormWithData(data: {
  userName: string;
  date: string;
  client: string;
  timeSpent: string;
  tasksDescription: string;
  githubIssue: string;
}) {
  console.log('Attempting to fill form with data:', data);
  
  try {
    // Give the form a moment to fully load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get all input fields on the page
    const inputFields = document.querySelectorAll('input, textarea');
    console.log(`Found ${inputFields.length} input fields on the page`);
    
    // For each field, try to identify what it is and fill it
    inputFields.forEach(field => {
      // Get field name attributes and other identifying info
      const ariaLabel = field.getAttribute('aria-label')?.toLowerCase() || '';
      const name = field.getAttribute('name')?.toLowerCase() || '';
      const id = field.getAttribute('id')?.toLowerCase() || '';
      const placeholder = (field as HTMLInputElement).placeholder?.toLowerCase() || '';
      
      console.log(`Processing field: ${name} (${ariaLabel})`);
      
      // Try to identify field type and fill accordingly
      if (name.includes('entry.')) {
        // This is a Google Form field, let's try to identify it
        
        // Name field detection
        if (ariaLabel.includes('name') || ariaLabel.includes('your name')) {
          (field as HTMLInputElement).value = data.userName;
          simulateUserInput(field as HTMLInputElement);
          console.log('Filled name field:', data.userName);
        }
        
        // Date field detection
        else if (ariaLabel.includes('date') || ariaLabel.includes('day')) {
          (field as HTMLInputElement).value = data.date;
          simulateUserInput(field as HTMLInputElement);
          console.log('Filled date field:', data.date);
        }
        
        // Client field detection
        else if (ariaLabel.includes('client') || ariaLabel.includes('project')) {
          (field as HTMLInputElement).value = data.client;
          simulateUserInput(field as HTMLInputElement);
          console.log('Filled client field:', data.client);
        }
        
        // Time field detection
        else if (ariaLabel.includes('time') || ariaLabel.includes('hours') || ariaLabel.includes('duration')) {
          (field as HTMLInputElement).value = data.timeSpent;
          simulateUserInput(field as HTMLInputElement);
          console.log('Filled time field:', data.timeSpent);
        }
        
        // Description field detection
        else if (ariaLabel.includes('description') || ariaLabel.includes('details') || 
                ariaLabel.includes('summary') || field instanceof HTMLTextAreaElement) {
          (field as HTMLInputElement).value = data.tasksDescription;
          simulateUserInput(field as HTMLInputElement);
          console.log('Filled description field');
        }
        
        // GitHub issue field detection
        else if (ariaLabel.includes('github') || ariaLabel.includes('issue') || 
                ariaLabel.includes('ticket')) {
          (field as HTMLInputElement).value = data.githubIssue;
          simulateUserInput(field as HTMLInputElement);
          console.log('Filled GitHub issue field:', data.githubIssue);
        }
      }
    });
    
    // Show success notification to the user
    showNotification('Successfully filled the form! Please review before submitting.');
    
    return { success: true };
  } catch (error) {
    console.error('Error filling form:', error);
    showNotification('Error filling form. Please try manual entry.', true);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper to simulate user input to trigger any event listeners on the form
function simulateUserInput(element: HTMLInputElement | HTMLTextAreaElement) {
  element.focus();
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  element.blur();
}

// Helper to show a notification to the user
function showNotification(message: string, isError: boolean = false) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '8px';
  notification.style.zIndex = '9999';
  notification.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
  notification.style.color = 'white';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  notification.style.fontSize = '14px';
  notification.style.maxWidth = '300px';
  notification.style.transition = 'opacity 0.5s';
  notification.textContent = message;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after a few seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => document.body.removeChild(notification), 500);
  }, 5000);
}
