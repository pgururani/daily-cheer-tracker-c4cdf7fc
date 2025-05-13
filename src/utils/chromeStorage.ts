
import { Task, DailyTasks, TaskState, UserSettings } from "../types/task";

const STORAGE_KEY = 'daily-cheer-tracker-data';
const USER_SETTINGS_KEY = 'daily-cheer-user-settings';
const SETUP_COMPLETE_KEY = 'daily-cheer-setup-complete';

// Save task state to Chrome storage
export const saveToChromeStorage = async (data: TaskState): Promise<void> => {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  } catch (error) {
    console.error('Error saving to Chrome storage:', error);
    // Fallback to localStorage for development purposes or when running in browser
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (localError) {
      console.error('Error with fallback localStorage:', localError);
    }
  }
};

// Load task state from Chrome storage
export const loadFromChromeStorage = async (): Promise<TaskState> => {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    if (result[STORAGE_KEY]) {
      return result[STORAGE_KEY] as TaskState;
    }
    
    // Try fallback to localStorage
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
      const parsedData = JSON.parse(localData);
      // Store it in chrome.storage for future use
      await saveToChromeStorage(parsedData);
      return parsedData;
    }
    
    return { tasks: [], dailyHistory: [] };
  } catch (error) {
    console.error('Error loading from Chrome storage:', error);
    
    // Fallback to localStorage
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (localError) {
      console.error('Error with fallback localStorage:', localError);
    }
    
    return { tasks: [], dailyHistory: [] };
  }
};

// Save user settings to Chrome storage
export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  try {
    await chrome.storage.local.set({ [USER_SETTINGS_KEY]: settings });
    
    // Also save setup complete flag separately for quick access
    if (settings.setupComplete) {
      await chrome.storage.local.set({ [SETUP_COMPLETE_KEY]: true });
    } else if (settings.setupComplete === false) {
      await chrome.storage.local.remove([SETUP_COMPLETE_KEY]);
    }
  } catch (error) {
    console.error('Error saving user settings to Chrome storage:', error);
    
    // Fallback to localStorage for development
    try {
      localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
      if (settings.setupComplete) {
        localStorage.setItem(SETUP_COMPLETE_KEY, 'true');
      } else if (settings.setupComplete === false) {
        localStorage.removeItem(SETUP_COMPLETE_KEY);
      }
    } catch (localError) {
      console.error('Error with fallback localStorage:', localError);
    }
  }
};

// Load user settings from Chrome storage
export const loadUserSettings = async (): Promise<UserSettings | null> => {
  try {
    const result = await chrome.storage.local.get([USER_SETTINGS_KEY]);
    if (result[USER_SETTINGS_KEY]) {
      return result[USER_SETTINGS_KEY] as UserSettings;
    }
    
    // Try fallback to localStorage
    const localSettings = localStorage.getItem(USER_SETTINGS_KEY);
    if (localSettings) {
      return JSON.parse(localSettings);
    }
    
    return null;
  } catch (error) {
    console.error('Error loading user settings from Chrome storage:', error);
    
    // Fallback to localStorage
    try {
      const settings = localStorage.getItem(USER_SETTINGS_KEY);
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (localError) {
      console.error('Error with fallback localStorage:', localError);
    }
    
    return null;
  }
};

// Check if setup is complete
export const isSetupComplete = async (): Promise<boolean> => {
  try {
    const result = await chrome.storage.local.get([SETUP_COMPLETE_KEY]);
    return result[SETUP_COMPLETE_KEY] === true;
  } catch (error) {
    console.error('Error checking setup complete status:', error);
    
    // Fallback to localStorage
    return localStorage.getItem(SETUP_COMPLETE_KEY) === 'true';
  }
};

// Reset setup status
export const resetSetup = async (): Promise<void> => {
  try {
    await chrome.storage.local.remove([SETUP_COMPLETE_KEY]);
    const settings = await loadUserSettings();
    if (settings) {
      settings.setupComplete = false;
      await saveUserSettings(settings);
    }
  } catch (error) {
    console.error('Error resetting setup:', error);
    
    // Fallback to localStorage
    try {
      localStorage.removeItem(SETUP_COMPLETE_KEY);
      const settings = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || 'null');
      if (settings) {
        settings.setupComplete = false;
        localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
      }
    } catch (localError) {
      console.error('Error with fallback localStorage:', localError);
    }
  }
};

// Clear tasks for today
export const clearTasksForToday = async (): Promise<TaskState> => {
  const currentData = await loadFromChromeStorage();
  const today = new Date().toISOString().split('T')[0];
  
  // Check if we already have an entry for today
  const todayTaskIndex = currentData.dailyHistory.findIndex(day => day.date === today);
  
  if (todayTaskIndex !== -1) {
    // Add today's tasks to history
    currentData.dailyHistory[todayTaskIndex].tasks = [...currentData.tasks];
  } else {
    // Create a new entry for today
    currentData.dailyHistory.push({
      date: today,
      tasks: [...currentData.tasks],
      userName: currentData.userName
    });
  }
  
  // Clear current tasks
  const newState = { ...currentData, tasks: [] };
  await saveToChromeStorage(newState);
  return newState;
};

// Add a task
export const addTask = async (task: Task): Promise<TaskState> => {
  const currentData = await loadFromChromeStorage();
  const newState = {
    ...currentData,
    tasks: [...currentData.tasks, task]
  };
  await saveToChromeStorage(newState);
  return newState;
};

// Helper function to get time block label
export const getTimeBlockLabel = (timeBlock: number): string => {
  const hour = timeBlock * 2;
  return `${hour}:00 - ${hour + 2}:00`;
};

// Helper function to get current time block
export const getCurrentTimeBlock = (): number => {
  const hour = new Date().getHours();
  return Math.floor(hour / 2);
};
