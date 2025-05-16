
import { GoogleFormConfig, Task } from "../types/task";

// Default field IDs for Google Forms
export const DEFAULT_FORM_FIELDS = {
  name: "entry.2005620554",
  date: "entry.1310344807",
  client: "entry.1065046570",
  time: "entry.1166974658",
  description: "entry.839337160",
  githubIssue: "entry.1042224615"
};

// Check if a URL is a valid Google Form URL
export function isValidGoogleFormUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.hostname.includes('docs.google.com') && 
      parsedUrl.pathname.includes('/forms/') &&
      (parsedUrl.pathname.includes('/viewform') || parsedUrl.pathname.includes('/formResponse'))
    );
  } catch (error) {
    return false;
  }
}

// Create a URL with prefilled form data
export function createFormPrefillUrl(
  formConfig: GoogleFormConfig,
  tasksDescription: string,
  userName: string,
  client: string,
  timeSpent: string,
  githubIssue: string
): string {
  if (!formConfig.url) {
    return '';
  }

  try {
    const url = new URL(formConfig.url);
    
    // Add form parameters
    if (formConfig.fields.name) {
      url.searchParams.append(formConfig.fields.name, userName);
    }
    
    if (formConfig.fields.date) {
      url.searchParams.append(formConfig.fields.date, new Date().toLocaleDateString());
    }
    
    if (formConfig.fields.client && client) {
      url.searchParams.append(formConfig.fields.client, client);
    }
    
    if (formConfig.fields.time && timeSpent) {
      url.searchParams.append(formConfig.fields.time, timeSpent);
    }
    
    if (formConfig.fields.description && tasksDescription) {
      url.searchParams.append(formConfig.fields.description, tasksDescription);
    }
    
    if (formConfig.fields.githubIssue && githubIssue) {
      url.searchParams.append(formConfig.fields.githubIssue, githubIssue);
    }
    
    return url.toString();
  } catch (error) {
    console.error("Error creating form URL:", error);
    return '';
  }
}

// Format tasks as a summary string for reporting
export function formatTasksAsSummary(tasks: Task[]): string {
  if (!tasks || tasks.length === 0) {
    return "No tasks recorded for this day.";
  }
  
  // Group tasks by timeblock
  const tasksByTimeBlock = tasks.reduce((acc: Record<number, Task[]>, task) => {
    const timeBlock = task.timeBlock;
    if (!acc[timeBlock]) {
      acc[timeBlock] = [];
    }
    acc[timeBlock].push(task);
    return acc;
  }, {});
  
  // Format tasks by timeblock
  let summary = "";
  
  // Sort timeblocks chronologically
  const timeBlocks = Object.keys(tasksByTimeBlock).map(Number).sort();
  
  timeBlocks.forEach(timeBlock => {
    const blockTasks = tasksByTimeBlock[timeBlock];
    const hour = timeBlock * 2;
    const timeRange = `${hour}:00-${hour + 2}:00`;
    
    summary += `${timeRange}:\n`;
    blockTasks.forEach(task => {
      summary += `- ${task.text}\n`;
    });
    summary += "\n";
  });
  
  return summary;
}

// Detect Google Form fields (simplified version)
export async function detectFormFields(formUrl: string): Promise<GoogleFormConfig | null> {
  console.log("Attempting to detect form fields for:", formUrl);
  
  // In a real implementation, we might fetch the form and parse it
  // For this simplified version, we'll just return default fields
  return Promise.resolve({
    url: formUrl,
    fields: DEFAULT_FORM_FIELDS
  });
}
