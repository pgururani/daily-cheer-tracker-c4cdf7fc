
import { GoogleFormConfig, UserSettings, Task } from "../types/task";
import { toast } from "sonner";

// Common field types in Google Forms
const COMMON_FIELD_PATTERNS = {
  name: ['name', 'full name', 'your name'],
  date: ['date', 'day', 'submission date'],
  client: ['client', 'project', 'client name', 'project name'],
  time: ['time', 'hours', 'duration', 'time spent'],
  description: ['description', 'details', 'task', 'summary', 'work done'],
  githubIssue: ['github', 'issue', 'ticket', 'pr', 'github issue']
};

// Default field IDs for Google Forms (fallback)
export const DEFAULT_FORM_FIELDS = {
  name: "entry.2005620554",
  date: "entry.1310344807",
  client: "entry.1065046570",
  time: "entry.1166974658", 
  description: "entry.839337160",
  githubIssue: "entry.1042224615"
};

/**
 * Attempts to extract Google Form field IDs from the form URL
 * 
 * @param formUrl The Google Form URL to analyze
 * @returns Promise resolving to GoogleFormConfig with extracted fields
 */
export const detectFormFields = async (formUrl: string): Promise<GoogleFormConfig | null> => {
  try {
    if (!isValidGoogleFormUrl(formUrl)) {
      throw new Error("Invalid Google Form URL");
    }
    
    // Direct CORS requests to Google Forms typically fail
    // We inform the user about the limitation
    toast("Detecting form fields...", {
      description: "Note: Automatic field detection may not work due to Google security restrictions.",
    });
    
    // Try to use a CORS proxy service
    // This still might fail due to Google's strict security
    try {
      const proxyUrl = `https://cors-anywhere.herokuapp.com/${formUrl}`;
      
      const response = await fetch(proxyUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch form data");
      }
      
      const html = await response.text();
      const fields = extractFieldsFromFormHtml(html);
      
      return {
        url: formUrl,
        fields: fields
      };
    } catch (error) {
      console.error("Error detecting form fields:", error);
      
      // Fall back to default field IDs
      return {
        url: formUrl,
        fields: DEFAULT_FORM_FIELDS
      };
    }
    
  } catch (error) {
    console.error("Error detecting form fields:", error);
    
    toast("Field detection failed", {
      description: "Using default field IDs. Please update them manually if needed.",
    });
    
    // Return default field configuration as fallback
    return {
      url: formUrl,
      fields: { ...DEFAULT_FORM_FIELDS }
    };
  }
};

/**
 * Fallback method that guides users through finding field IDs
 * @param formUrl The Google Form URL
 */
export const guideToFindFieldIds = (formUrl: string) => {
  // Open the form in a new tab
  window.open(formUrl, '_blank');
  
  // Show instructions toast
  toast("Finding field IDs manually", {
    description: "The form has opened in a new tab. Right-click, select 'View Page Source' and look for 'entry.' followed by numbers.",
    duration: 8000,
  });
};

/**
 * Check if a URL is a valid Google Form URL
 */
export const isValidGoogleFormUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    // Check if the URL is valid
    new URL(url);
    
    // Basic check for Google Forms URL pattern
    return url.includes('docs.google.com/forms') || 
           url.includes('forms.gle') || 
           url.includes('forms.google.com');
  } catch (e) {
    console.error("Invalid URL format:", e);
    return false;
  }
};

/**
 * Process and normalize a Google Form URL to ensure it works for prefilling
 */
export const normalizeGoogleFormUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // For short URLs, return as is
    if (url.includes('forms.gle') || url.includes('forms.app')) {
      return url;
    }
    
    // For regular Google Form URLs, ensure they're in the correct format
    if (url.includes('docs.google.com/forms')) {
      let baseUrl = parsedUrl.origin + parsedUrl.pathname;
      
      // Ensure URL ends with /viewform for prefilling
      if (!baseUrl.includes('/viewform')) {
        baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if present
        baseUrl += '/viewform';
      }
      
      return baseUrl;
    }
    
    // Default case
    return url;
  } catch (e) {
    console.error("Error normalizing URL:", e);
    return url;
  }
};

/**
 * Creates a Google Form prefill URL based on the form configuration and task data
 */
export const createFormPrefillUrl = (
  formConfig: GoogleFormConfig, 
  tasksDescription: string,
  userName: string,
  client: string,
  timeSpent: string,
  githubIssue: string
): string | null => {
  try {
    if (!isValidGoogleFormUrl(formConfig.url)) {
      toast.error("Invalid Google Form URL", {
        description: "Please check your form URL in settings.",
      });
      return null;
    }

    // Use current date in DD/MM/YYYY format
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${
      (today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Normalize the form URL for prefilling
    const baseFormUrl = normalizeGoogleFormUrl(formConfig.url);
    
    // Create URL parameters with proper encoding
    const params = new URLSearchParams();
    
    // Add each field with proper encoding
    if (userName && formConfig.fields.name) {
      params.append(formConfig.fields.name, userName);
    }
    
    if (formattedDate && formConfig.fields.date) {
      params.append(formConfig.fields.date, formattedDate);
    }
    
    if (client && formConfig.fields.client) {
      params.append(formConfig.fields.client, client);
    }
    
    if (timeSpent && formConfig.fields.time) {
      params.append(formConfig.fields.time, timeSpent);
    }
    
    if (tasksDescription && formConfig.fields.description) {
      params.append(formConfig.fields.description, tasksDescription);
    }
    
    if (githubIssue && formConfig.fields.githubIssue) {
      params.append(formConfig.fields.githubIssue, githubIssue);
    }
    
    // Create the complete URL
    let prefillUrl = baseFormUrl;
    const queryString = params.toString();
    
    // Add the parameters with the correct separator
    if (queryString) {
      prefillUrl += (prefillUrl.includes('?') ? '&' : '?') + queryString;
    }
    
    console.log("Generated prefill URL:", prefillUrl);
    return prefillUrl;
  } catch (error) {
    console.error('Error creating prefill URL:', error);
    toast.error("Failed to create form URL", {
      description: "An error occurred while generating the form URL.",
    });
    return null;
  }
};

/**
 * Formats task items into a readable summary text
 */
export const formatTasksAsSummary = (tasks: Task[]): string => {
  // Group tasks by time block
  const groupedTasks: Record<number, Task[]> = {};
  
  tasks.forEach(task => {
    if (!groupedTasks[task.timeBlock]) {
      groupedTasks[task.timeBlock] = [];
    }
    groupedTasks[task.timeBlock].push(task);
  });
  
  // Build summary text
  let summary = '';
  
  Object.keys(groupedTasks).map(Number).sort().forEach(timeBlock => {
    const timeLabel = getTimeBlockLabel(timeBlock);
    summary += `${timeLabel}:\n`;
    
    groupedTasks[timeBlock].forEach(task => {
      summary += `- ${task.text}\n`;
    });
    
    summary += '\n';
  });
  
  return summary;
};

/**
 * Gets a time block label (e.g., "8:00 - 10:00") for a given block number
 */
export const getTimeBlockLabel = (timeBlock: number): string => {
  const hour = timeBlock * 2;
  return `${hour}:00 - ${hour + 2}:00`;
};

/**
 * Attempts to extract form field IDs from HTML content
 * @param html The HTML content of the form
 * @returns An object mapping field names to their IDs
 */
const extractFieldsFromFormHtml = (html: string): {
  name: string;
  date: string;
  client: string;
  time: string;
  description: string;
  githubIssue: string;
} => {
  // Initialize result with default values
  const result = { ...DEFAULT_FORM_FIELDS };
  
  try {
    // Regular expression to find all form field entries
    const entryRegex = /entry\.(\d+)/g;
    const matches = html.matchAll(entryRegex);
    
    // Extract all entry IDs
    const entryIds = Array.from(matches, m => `entry.${m[1]}`);
    const uniqueEntryIds = [...new Set(entryIds)];
    
    // Try to map field names to entries based on surrounding text
    for (const fieldType of Object.keys(COMMON_FIELD_PATTERNS) as Array<keyof typeof COMMON_FIELD_PATTERNS>) {
      const patterns = COMMON_FIELD_PATTERNS[fieldType];
      
      // For each pattern, check if it appears near an entry ID
      for (const pattern of patterns) {
        const patternRegex = new RegExp(`([^>]{0,50}${pattern}[^<]{0,50})`, 'i');
        const patternMatch = html.match(patternRegex);
        
        if (patternMatch) {
          const matchText = patternMatch[1];
          // Find the closest entry ID to this text
          for (const entryId of uniqueEntryIds) {
            if (html.indexOf(matchText) - html.indexOf(entryId) < 200 && 
                html.indexOf(matchText) - html.indexOf(entryId) > -200) {
              // Found a likely match
              result[fieldType] = entryId;
              break;
            }
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting field IDs:', error);
    // Return default field IDs as fallback
    return { ...DEFAULT_FORM_FIELDS };
  }
};
