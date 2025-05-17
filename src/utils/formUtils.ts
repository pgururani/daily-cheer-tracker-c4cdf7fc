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
  return url.startsWith('http') && (
    url.includes('docs.google.com/forms') || 
    url.includes('forms.gle/')
  );
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

// Enhanced form field detection for Google Forms
export const detectFormFields = async (url: string): Promise<any> => {
  console.log('Form field detection started for URL:', url);
  
  if (isValidGoogleFormUrl(url)) {
    console.log('Google Form URL detected - will use specialized detection');
    return {
      url: url,
      fields: DEFAULT_FORM_FIELDS,
      isGoogleForm: true
    };
  }
  
  return {
    url: url,
    fields: DEFAULT_FORM_FIELDS,
    isGoogleForm: false
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

// Map generic form fields to Google Form fields
export const mapFieldsToGoogleForm = (fieldsData: Record<string, string>): Record<string, string> => {
  // This function maps generic field names to more specific Google Form field identifiers
  // The content script will handle the actual matching logic
  
  const mappedFields: Record<string, string> = {};
  
  // Map common field names to potential Google Form question patterns
  for (const [key, value] of Object.entries(fieldsData)) {
    switch (key.toLowerCase()) {
      case 'name':
        mappedFields['name'] = value;
        mappedFields['full_name'] = value;
        mappedFields['your_name'] = value;
        break;
      case 'date':
        mappedFields['date'] = value;
        mappedFields['day'] = value;
        mappedFields['work_date'] = value;
        break;
      case 'client':
        mappedFields['client'] = value;
        mappedFields['client_name'] = value;
        mappedFields['company'] = value;
        break;
      case 'time':
        mappedFields['time'] = value;
        mappedFields['time_spent'] = value;
        mappedFields['hours'] = value;
        mappedFields['duration'] = value;
        break;
      case 'description':
        mappedFields['description'] = value;
        mappedFields['work_description'] = value;
        mappedFields['tasks'] = value;
        mappedFields['details'] = value;
        break;
      case 'githubissue':
      case 'githubIssue':
        mappedFields['github'] = value;
        mappedFields['issue'] = value;
        mappedFields['ticket'] = value;
        mappedFields['github_issue'] = value;
        break;
      default:
        // Keep original key
        mappedFields[key] = value;
    }
  }
  
  return mappedFields;
};
