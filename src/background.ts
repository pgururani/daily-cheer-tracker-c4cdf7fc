
// Background script for the Daily Cheer Tracker extension
import { loadFromChromeStorage } from './utils/chromeStorage';
import { createFormPrefillUrl } from './utils/formUtils';

// Listen for messages from the popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillForm') {
    handleFormFill(message.date, message.formConfig, message.userName, message.client, message.timeSpent, message.githubIssue)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indicates async response
  }
});

// Handle form filling request
async function handleFormFill(date: string, formConfig: any, userName: string, client: string, timeSpent: string, githubIssue: string) {
  try {
    // Load the tasks for the specified date
    const taskState = await loadFromChromeStorage();
    const selectedDay = taskState.dailyHistory.find(day => day.date === date);
    
    if (!selectedDay) {
      return { success: false, error: 'No tasks found for the selected date' };
    }

    // Generate summary of tasks
    // In a real extension, we would format the tasks here
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
      return { success: false, error: 'Failed to create form URL' };
    }

    // Open the form in a new tab
    chrome.tabs.create({ url: formUrl }, (tab) => {
      // After the tab is created, we'll send a message to the content script
      // to fill the form when it's loaded
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (info.status === 'complete' && tabId === tab.id) {
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

    return { success: true };
  } catch (error) {
    console.error('Error handling form fill:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Helper function to format tasks summary
function formatTasksSummary(tasks: any[]): string {
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
