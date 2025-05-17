
// Default form fields structure (simplified for autofill)
export const DEFAULT_FORM_FIELDS = {
  name: '',
  date: '',
  client: '',
  time: '',
  description: '',
  githubIssue: ''
};

// Simple URL validator (simplified function)
export const isValidGoogleFormUrl = (url: string): boolean => {
  return url.startsWith('http');
};

// Format tasks as a summary string
export const formatTasksAsSummary = (tasks: any[]): string => {
  if (!tasks || tasks.length === 0) return "No tasks recorded";
  
  return tasks.map(task => {
    let summary = `- ${task.text}`;
    if (task.client) summary += ` [${task.client}]`;
    if (task.githubIssue) summary += ` (${task.githubIssue})`;
    return summary;
  }).join('\n');
};

// Simplified stub function for form field detection
export const detectFormFields = async (url: string): Promise<any> => {
  console.log('Form field detection is simplified - now using direct field detection');
  return {
    url: url,
    fields: DEFAULT_FORM_FIELDS
  };
};

// Get current page form fields
export const getCurrentPageFormFields = async (): Promise<Record<string, any>> => {
  return new Promise((resolve, reject) => {
    try {
      if (!chrome || !chrome.tabs) {
        reject(new Error('Chrome API not available'));
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('No active tab found'));
          return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, { action: 'detectFields' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            resolve(response.fields || {});
          } else {
            reject(new Error(response?.error || 'Failed to detect form fields'));
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Autofill form fields
export const autofillFormFields = async (fieldsData: Record<string, string>): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      if (!chrome || !chrome.tabs) {
        reject(new Error('Chrome API not available'));
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('No active tab found'));
          return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'autofillForm',
          data: fieldsData
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            resolve(true);
          } else {
            reject(new Error(response?.error || 'Failed to autofill form fields'));
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};
