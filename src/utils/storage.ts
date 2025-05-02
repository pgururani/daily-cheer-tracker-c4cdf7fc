
import { Task, DailyTasks, TaskState } from "../types/task";

const STORAGE_KEY = 'daily-cheer-tracker-data';

export const saveToLocalStorage = (data: TaskState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const loadFromLocalStorage = (): TaskState => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return { tasks: [], dailyHistory: [] };
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return { tasks: [], dailyHistory: [] };
  }
};

export const clearTasksForToday = (): TaskState => {
  const currentData = loadFromLocalStorage();
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
      tasks: [...currentData.tasks]
    });
  }
  
  // Clear current tasks
  const newState = { ...currentData, tasks: [] };
  saveToLocalStorage(newState);
  return newState;
};

export const addTask = (task: Task): TaskState => {
  const currentData = loadFromLocalStorage();
  const newState = {
    ...currentData,
    tasks: [...currentData.tasks, task]
  };
  saveToLocalStorage(newState);
  return newState;
};

export const getTimeBlockLabel = (timeBlock: number): string => {
  const hour = timeBlock * 2;
  return `${hour}:00 - ${hour + 2}:00`;
};

export const getCurrentTimeBlock = (): number => {
  const hour = new Date().getHours();
  return Math.floor(hour / 2);
};
