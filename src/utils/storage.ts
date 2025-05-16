
import { Task, DailyTasks, TaskState } from '../types/task';

// Helper function to check if we're running in a Chrome extension environment
const isChromeExtension = (): boolean => {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
};

// Save data to Chrome storage
export const saveToStorage = async (key: string, data: any): Promise<void> => {
  try {
    if (isChromeExtension()) {
      // Running as Chrome extension
      await chrome.storage.local.set({ [key]: data });
    } else {
      // Fallback to localStorage for development purposes
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
};

// Load data from Chrome storage
export const loadFromStorage = async (key: string): Promise<any> => {
  try {
    if (isChromeExtension()) {
      // Running as Chrome extension
      const result = await chrome.storage.local.get([key]);
      if (result[key]) {
        return result[key];
      }
    } else {
      // Fallback to localStorage for development
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    }
    return null;
  } catch (error) {
    console.error('Error loading from storage:', error);
    return null;
  }
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
