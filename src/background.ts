
// Background script for the Daily Cheer Tracker extension
import { loadFromChromeStorage } from './utils/chromeStorage';
import { createFormPrefillUrl } from './utils/formUtils';

console.log("Background script loaded at", new Date().toISOString());

// Check if we're running in a Chrome extension environment
const isChromeExtension = (): boolean => {
  const isExtension = typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
  console.log("Running in Chrome extension environment:", isExtension);
  return isExtension;
};

// Log that background script has successfully initialized
if (isChromeExtension()) {
  console.log("Chrome extension background script initialized");
  
  // Set up a listener for when the extension is installed or updated
  chrome.runtime.onInstalled.addListener((details) => {
    console.log("Extension installed/updated:", details.reason);
    
    // Set initial badge
    if (chrome.action?.setBadgeText) {
      chrome.action.setBadgeText({ text: "NEW" });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
      
      // Clear the badge after 5 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 5000);
    }
  });

  // Listen for messages from the popup or content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message in background script:", message, "from:", sender);
    
    if (message.action === 'fillForm') {
      console.log("Processing fillForm request");
      handleFormFill(message.date, message.formConfig, message.userName, message.client, message.timeSpent, message.githubIssue)
        .then(result => {
          console.log("Form fill result:", result);
          sendResponse(result);
        })
        .catch(error => {
          console.error("Form fill error:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true; // Indicates async response
    }
    
    if (message.action === 'test') {
      console.log("Received test message");
      sendResponse({ 
        success: true, 
        message: "Background script received test message",
        timestamp: new Date().toISOString()
      });
      return true;
    }
  });
}

// Handle form filling request
async function handleFormFill(date: string, formConfig: any, userName: string, client: string, timeSpent: string, githubIssue: string) {
  console.log("Handling form fill request with date:", date);
  try {
    // Load the tasks for the specified date
    const taskState = await loadFromChromeStorage();
    console.log("Task state loaded:", taskState);
    
    const selectedDay = taskState.dailyHistory.find(day => day.date === date);
    
    if (!selectedDay) {
      console.warn("No tasks found for date:", date);
      return { success: false, error: 'No tasks found for the selected date' };
    }

    // Generate summary of tasks
    console.log("Generating summary for tasks:", selectedDay.tasks.length);
    const tasksDescription = formatTasksSummary(selectedDay.tasks);
    
    // Create the form URL with prefilled data
    const formUrl = createFormPrefillUrl(
      formConfig,
      tasksDescription,
      userName,
      client,
      timeSpent,
      githubIssue
    );

    if (!formUrl) {
      console.error("Failed to create form URL");
      return { success: false, error: 'Failed to create form URL' };
    }

    console.log("Form URL generated:", formUrl);

    // Only proceed with opening tabs if in extension environment
    if (isChromeExtension()) {
      // Open the form in a new tab
      chrome.tabs.create({ url: formUrl }, (tab) => {
        console.log("Tab created with ID:", tab.id);
        
        // After the tab is created, we'll send a message to the content script
        // to fill the form when it's loaded
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (info.status === 'complete' && tabId === tab.id) {
            console.log("Tab loaded completely, sending autofill message");
            chrome.tabs.onUpdated.removeListener(listener);
            
            // Send message to the content script to fill the form
            chrome.tabs.sendMessage(tabId, {
              action: 'autofillForm',
              data: {
                userName,
                date: new Date().toLocaleDateString(),
                client,
                timeSpent,
                tasksDescription,
                githubIssue
              }
            });
          }
        });
      });
    } else {
      // In browser environment, just return the URL
      console.log('Form URL generated (would open in extension mode):', formUrl);
    }

    return { success: true };
  } catch (error) {
    console.error('Error handling form fill:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to format tasks summary
function formatTasksSummary(tasks: any[]): string {
  console.log("Formatting tasks summary for", tasks.length, "tasks");
  
  // Group tasks by time block
  const groupedTasks: Record<number, any[]> = {};
  
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
}

// Helper function to get time block label
function getTimeBlockLabel(timeBlock: number): string {
  const hour = timeBlock * 2;
  return `${hour}:00 - ${hour + 2}:00`;
}

// Export for testing in browser environment
export { handleFormFill };
