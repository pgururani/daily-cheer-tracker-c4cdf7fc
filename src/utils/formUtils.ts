
import { GoogleFormConfig } from "../types/task";
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
    
    // Attempt to access the form using a CORS proxy
    // Note: This might still fail due to CORS restrictions
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${formUrl}`;
    
    toast("Detecting form fields...", {
      description: "This may take a moment.",
    });
    
    const response = await fetch(proxyUrl, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch form data");
    }
    
    const html = await response.text();
    
    // Extract field IDs using regex patterns
    const fields = extractFieldsFromFormHtml(html);
    
    return {
      url: formUrl,
      fields: fields
    };
    
  } catch (error) {
    console.error("Error detecting form fields:", error);
    
    toast("Field detection failed", {
      description: "Please enter field IDs manually or try again later.",
    });
    
    return null;
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
  // Basic check for Google Forms URL pattern
  return url.includes('docs.google.com/forms') || 
         url.includes('forms.gle') || 
         url.includes('forms.google.com');
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
