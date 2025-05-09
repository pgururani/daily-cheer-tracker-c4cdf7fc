
import { useState, useEffect } from 'react';
import { Task, TaskState, UserSettings, GoogleFormConfig, StaticFieldValues } from '../types/task';
import { 
  loadFromLocalStorage, 
  saveToLocalStorage, 
  addTask as addTaskToStorage,
  clearTasksForToday,
  getCurrentTimeBlock,
  saveUserSettings,
  loadUserSettings,
  isSetupComplete
} from '../utils/storage';
import { DEFAULT_FORM_FIELDS, formatTasksAsSummary } from '../utils/formUtils';
import { toast } from 'sonner';

export const useTasks = () => {
  const [taskState, setTaskState] = useState<TaskState>({ tasks: [], dailyHistory: [] });
  const [loading, setLoading] = useState(true);
  const [currentTimeBlock, setCurrentTimeBlock] = useState(getCurrentTimeBlock());
  const [lastPromptedTimeBlock, setLastPromptedTimeBlock] = useState<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [userName, setUserName] = useState('');
  const [userSettings, setUserSettings] = useState<UserSettings>({
    formConfig: {
      url: '',
      fields: DEFAULT_FORM_FIELDS
    }
  });

  // Load tasks and user settings on initial render
  useEffect(() => {
    const loadTasks = () => {
      const data = loadFromLocalStorage();
      setTaskState(data);
      
      // Load user name if available
      const savedUserName = localStorage.getItem('daily-cheer-user-name');
      if (savedUserName) {
        setUserName(savedUserName);
      }
      
      // Load user settings
      const settings = loadUserSettings();
      if (settings) {
        setUserSettings(settings);
        
        // If settings include userName, use it
        if (settings.userName) {
          setUserName(settings.userName);
        }
      }
      
      // Check if setup is complete
      const setupDone = isSetupComplete();
      setShowSetupWizard(!setupDone);
      
      setLoading(false);
    };
    loadTasks();
  }, []);

  // Check time blocks for prompting
  useEffect(() => {
    const checkTimeBlock = () => {
      const newTimeBlock = getCurrentTimeBlock();
      
      // Update current time block if it changed
      if (newTimeBlock !== currentTimeBlock) {
        setCurrentTimeBlock(newTimeBlock);
      }

      // If we haven't prompted for this time block yet, show the prompt
      if (newTimeBlock !== lastPromptedTimeBlock) {
        setShowPrompt(true);
      }
    };

    // Check time block immediately and then every minute
    checkTimeBlock();
    const intervalId = setInterval(checkTimeBlock, 60000);
    
    return () => clearInterval(intervalId);
  }, [currentTimeBlock, lastPromptedTimeBlock]);
  
  // Add a new task
  const addTask = (text: string, client?: string, githubIssue?: string) => {
    if (!text.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      timeBlock: currentTimeBlock,
      client: client,
      githubIssue: githubIssue
    };
    
    const updatedState = addTaskToStorage(newTask);
    setTaskState(updatedState);
    setLastPromptedTimeBlock(currentTimeBlock);
    setShowPrompt(false);

    toast("Task added!", {
      description: "Keep up the great work!",
    });
    
    return newTask;
  };

  // Set user name
  const setUser = (name: string) => {
    setUserName(name);
    localStorage.setItem('daily-cheer-user-name', name);
    
    // Also update taskState with userName
    const updatedState = { ...taskState, userName: name };
    setTaskState(updatedState);
    saveToLocalStorage(updatedState);
  };

  // Save user settings
  const saveSettings = (settings: UserSettings) => {
    const updatedSettings = {
      ...settings,
      userName: settings.userName || userName
    };
    
    setUserSettings(updatedSettings);
    saveUserSettings(updatedSettings);
    
    // Update userName if provided in settings
    if (settings.userName) {
      setUserName(settings.userName);
    }
    
    // Update taskState with user settings
    const updatedState = { ...taskState, userSettings: updatedSettings, userName: updatedSettings.userName };
    setTaskState(updatedState);
    saveToLocalStorage(updatedState);
    
    return updatedState;
  };

  // Complete setup wizard
  const completeSetup = (settings: UserSettings) => {
    setShowSetupWizard(false);
    return saveSettings({
      ...settings,
      setupComplete: true
    });
  };

  // Format tasks as summary
  const getTasksSummary = (tasks: Task[]): string => {
    return formatTasksAsSummary(tasks);
  };

  // Clear tasks and store them in history
  const finalizeDayTasks = () => {
    const updatedState = clearTasksForToday();
    setTaskState(updatedState);
    
    toast("Day finalized!", {
      description: "Your tasks have been saved to history.",
    });
    
    return updatedState;
  };

  // Mark prompt as responded to without adding a task
  const dismissPrompt = () => {
    setLastPromptedTimeBlock(currentTimeBlock);
    setShowPrompt(false);
  };

  // Open setup wizard
  const openSetupWizard = () => {
    setShowSetupWizard(true);
  };

  return {
    tasks: taskState.tasks,
    dailyHistory: taskState.dailyHistory,
    currentTimeBlock,
    showPrompt,
    showSetupWizard,
    loading,
    userName,
    userSettings,
    addTask,
    finalizeDayTasks,
    dismissPrompt,
    setUser,
    saveSettings,
    completeSetup,
    openSetupWizard,
    getTasksSummary
  };
};
