
console.log('Daily Cheer Tracker content script loaded');

// Function to detect and log all form fields on the page
const detectFormFields = () => {
  console.log('Detecting form fields on the page...');
  
  const formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }> = {};
  
  // Special handling for Google Forms
  const isGoogleForm = window.location.hostname.includes('docs.google.com') && 
                       window.location.pathname.includes('/forms/');
  
  if (isGoogleForm) {
    console.log('Google Form detected - using specialized detection');
    detectGoogleFormFields(formFields);
  } else {
    // Standard form field detection for regular websites
    detectStandardFormFields(formFields);
  }
  
  return formFields;
};

// Detect fields in standard HTML forms
const detectStandardFormFields = (formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>) => {
  // Find all input, select, and textarea elements
  const inputElements = document.querySelectorAll('input, select, textarea');
  
  inputElements.forEach((element, index) => {
    const inputElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const name = inputElement.name || '';
    const id = inputElement.id || '';
    let type = inputElement.tagName.toLowerCase();
    
    // For input elements, get the specific type
    if (type === 'input') {
      type = (inputElement as HTMLInputElement).type;
    }
    
    // Skip hidden fields
    if (type === 'hidden') {
      console.log('Skipping hidden field:', name || id);
      return;
    }
    
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
};

// Specialized detection for Google Forms
const detectGoogleFormFields = (formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>) => {
  console.log('Running Google Forms specialized detection');
  
  // Google Forms structure:
  // - Questions are in divs with role="listitem"
  // - Each question has a text label and an input field
  const questionItems = document.querySelectorAll('[role="listitem"]');
  
  questionItems.forEach((item, index) => {
    // Try to find the question label
    const questionLabel = item.querySelector('.freebirdFormviewerComponentsQuestionBaseTitle');
    const questionText = questionLabel ? questionLabel.textContent?.trim() : `Question ${index + 1}`;
    
    // Try to find input elements within this question
    const inputs = item.querySelectorAll('input, textarea, select');
    const dropdown = item.querySelector('[role="listbox"]');
    
    if (inputs && inputs.length > 0) {
      // Process standard inputs
      inputs.forEach((input, inputIndex) => {
        const inputElement = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const fieldId = `gform_${questionText}_${inputIndex}`.replace(/\s+/g, '_').toLowerCase();
        
        formFields[fieldId] = {
          element: inputElement,
          type: inputElement.tagName.toLowerCase(),
          name: questionText || '',
          id: fieldId
        };
        
        console.log(`Detected Google Form field: ${fieldId}`, {
          type: inputElement.tagName.toLowerCase(),
          name: questionText,
          id: fieldId
        });
      });
    } else if (dropdown) {
      // Process dropdown fields
      const fieldId = `gform_${questionText}`.replace(/\s+/g, '_').toLowerCase();
      
      formFields[fieldId] = {
        element: dropdown as HTMLElement,
        type: 'dropdown',
        name: questionText || '',
        id: fieldId
      };
      
      console.log(`Detected Google Form dropdown: ${fieldId}`, {
        type: 'dropdown',
        name: questionText,
        id: fieldId
      });
    }
  });
};

// Function to autofill form fields with provided values
const autofillFormFields = (fields: Record<string, string>) => {
  console.log('Autofilling form with data:', fields);
  
  const isGoogleForm = window.location.hostname.includes('docs.google.com') && 
                       window.location.pathname.includes('/forms/');
  
  if (isGoogleForm) {
    autofillGoogleForm(fields);
    return;
  }
  
  // Standard form field autofill
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

// Special function to autofill Google Forms
const autofillGoogleForm = (fields: Record<string, string>) => {
  console.log('Autofilling Google Form with specialized method');
  
  // For each field we want to fill
  for (const [fieldKey, value] of Object.entries(fields)) {
    if (!value.trim()) continue; // Skip empty values
    
    // Try to find matching question by looking at the question text
    const questionItems = document.querySelectorAll('[role="listitem"]');
    
    for (const item of Array.from(questionItems)) {
      const questionLabel = item.querySelector('.freebirdFormviewerComponentsQuestionBaseTitle');
      if (!questionLabel) continue;
      
      const questionText = questionLabel.textContent?.trim() || '';
      const normalizedQuestionText = questionText.toLowerCase().replace(/\s+/g, '_');
      
      // Check if this question matches our field key
      if (fieldKey.toLowerCase().includes(normalizedQuestionText) || 
          normalizedQuestionText.includes(fieldKey.toLowerCase())) {
        
        // Try to identify the field type
        const textInput = item.querySelector('input[type="text"], textarea');
        const radioInputs = item.querySelectorAll('input[type="radio"]');
        const checkboxInputs = item.querySelectorAll('input[type="checkbox"]');
        const dropdownField = item.querySelector('[role="listbox"]');
        
        // Fill text input
        if (textInput) {
          (textInput as HTMLInputElement).value = value;
          const event = new Event('input', { bubbles: true });
          textInput.dispatchEvent(event);
          console.log(`Filled text field "${questionText}" with: ${value}`);
          break;
        }
        
        // Handle dropdown selection
        else if (dropdownField) {
          // Click to open dropdown
          dropdownField.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          
          // Wait for the dropdown options to appear
          setTimeout(() => {
            // Find the option that matches our value
            const options = document.querySelectorAll('[role="option"]');
            for (const option of Array.from(options)) {
              if (option.textContent?.toLowerCase().includes(value.toLowerCase())) {
                // Click the matching option
                option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                console.log(`Selected dropdown option "${option.textContent}" for field "${questionText}"`);
                break;
              }
            }
          }, 300);
          break;
        }
        
        // Handle radio buttons
        else if (radioInputs.length > 0) {
          for (const radio of Array.from(radioInputs)) {
            const radioLabel = radio.closest('label')?.textContent?.trim() || '';
            if (radioLabel.toLowerCase().includes(value.toLowerCase())) {
              (radio as HTMLInputElement).click();
              console.log(`Selected radio option "${radioLabel}" for field "${questionText}"`);
              break;
            }
          }
          break;
        }
        
        // Handle checkboxes
        else if (checkboxInputs.length > 0) {
          const valuesToCheck = value.split(',').map(v => v.trim().toLowerCase());
          for (const checkbox of Array.from(checkboxInputs)) {
            const checkboxLabel = checkbox.closest('label')?.textContent?.trim() || '';
            if (valuesToCheck.some(val => checkboxLabel.toLowerCase().includes(val))) {
              (checkbox as HTMLInputElement).click();
              console.log(`Checked checkbox "${checkboxLabel}" for field "${questionText}"`);
            }
          }
          break;
        }
      }
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
