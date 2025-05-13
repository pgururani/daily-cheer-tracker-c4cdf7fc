
import { useState, useEffect } from 'react';
import { Task, TaskState, UserSettings, GoogleFormConfig, StaticFieldValues } from '../types/task';
import { 
  loadFromChromeStorage, 
  saveToChromeStorage, 
  addTask as addTaskToStorage,
  clearTasksForToday,
  getCurrentTimeBlock,
  saveUserSettings,
  loadUserSettings,
  isSetupComplete
} from '../utils/chromeStorage';
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
    const loadTasks = async () => {
      try {
        const data = await loadFromChromeStorage();
        setTaskState(data);
        
        // Load user settings
        const settings = await loadUserSettings();
        if (settings) {
          setUserSettings(settings);
          
          // If settings include userName, use it
          if (settings.userName) {
            setUserName(settings.userName);
          }
        }
        
        // Check if setup is complete
        const setupDone = await isSetupComplete();
        setShowSetupWizard(!setupDone);
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
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
  const addTask = async (text: string, client?: string, githubIssue?: string) => {
    if (!text.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      timeBlock: currentTimeBlock,
      client: client,
      githubIssue: githubIssue
    };
    
    try {
      const updatedState = await addTaskToStorage(newTask);
      setTaskState(updatedState);
      setLastPromptedTimeBlock(currentTimeBlock);
      setShowPrompt(false);

      toast("Task added!", {
        description: "Keep up the great work!",
      });
      
      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error("Failed to add task");
    }
  };

  // Set user name
  const setUser = async (name: string) => {
    setUserName(name);
    
    try {
      // Also update taskState with userName
      const updatedState = { ...taskState, userName: name };
      setTaskState(updatedState);
      await saveToChromeStorage(updatedState);
    } catch (error) {
      console.error('Error setting user name:', error);
    }
  };

  // Save user settings
  const saveSettings = async (settings: UserSettings) => {
    const updatedSettings = {
      ...settings,
      userName: settings.userName || userName
    };
    
    setUserSettings(updatedSettings);
    await saveUserSettings(updatedSettings);
    
    // Update userName if provided in settings
    if (settings.userName) {
      setUserName(settings.userName);
    }
    
    // Update taskState with user settings
    const updatedState = { ...taskState, userSettings: updatedSettings, userName: updatedSettings.userName };
    setTaskState(updatedState);
    await saveToChromeStorage(updatedState);
    
    return updatedState;
  };

  // Complete setup wizard
  const completeSetup = async (settings: UserSettings) => {
    setShowSetupWizard(false);
    return saveSettings({
      ...settings,
      setupComplete: true
    });
  };

  // Close setup wizard without completing
  const closeSetupWizard = async () => {
    // If user has already completed setup before, just close it
    const setupDone = await isSetupComplete();
    if (setupDone) {
      setShowSetupWizard(false);
    } else {
      // If this is initial setup, show a warning
      toast("Setup not complete", { 
        description: "You'll need to complete setup to use all features."
      });
      setShowSetupWizard(false);
    }
  };

  // Format tasks as summary
  const getTasksSummary = (tasks: Task[]): string => {
    return formatTasksAsSummary(tasks);
  };

  // Clear tasks and store them in history
  const finalizeDayTasks = async () => {
    try {
      const updatedState = await clearTasksForToday();
      setTaskState(updatedState);
      
      toast("Day finalized!", {
        description: "Your tasks have been saved to history.",
      });
      
      return updatedState;
    } catch (error) {
      console.error('Error finalizing day tasks:', error);
      toast.error("Failed to finalize day");
    }
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

  // Fill a Google Form with data
  const fillForm = async (date: string, client: string, timeSpent: string, githubIssue: string) => {
    if (!userSettings?.formConfig?.url) {
      toast.error("Missing form configuration");
      return false;
    }

    try {
      // Send message to background script to handle form filling
      chrome.runtime.sendMessage({
        action: 'fillForm',
        date,
        formConfig: userSettings.formConfig,
        userName,
        client,
        timeSpent,
        githubIssue
      }, response => {
        if (response && response.success) {
          toast.success("Form opened in new tab");
        } else {
          toast.error(`Failed to fill form: ${response?.error || 'Unknown error'}`);
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error filling form:', error);
      toast.error("Failed to communicate with extension");
      return false;
    }
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
    closeSetupWizard,
    openSetupWizard,
    getTasksSummary,
    fillForm
  };
};
