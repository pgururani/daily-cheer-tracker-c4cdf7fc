
import { useState, useEffect } from 'react';
import { Task, TaskState } from '../types/task';
import { 
  loadFromLocalStorage, 
  saveToLocalStorage, 
  addTask as addTaskToStorage,
  clearTasksForToday,
  getCurrentTimeBlock
} from '../utils/storage';
import { toast } from 'sonner';

export const useTasks = () => {
  const [taskState, setTaskState] = useState<TaskState>({ tasks: [], dailyHistory: [] });
  const [loading, setLoading] = useState(true);
  const [currentTimeBlock, setCurrentTimeBlock] = useState(getCurrentTimeBlock());
  const [lastPromptedTimeBlock, setLastPromptedTimeBlock] = useState<number | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Load tasks on initial render
  useEffect(() => {
    const loadTasks = () => {
      const data = loadFromLocalStorage();
      setTaskState(data);
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
  const addTask = (text: string) => {
    if (!text.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      timeBlock: currentTimeBlock
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

  return {
    tasks: taskState.tasks,
    dailyHistory: taskState.dailyHistory,
    currentTimeBlock,
    showPrompt,
    loading,
    addTask,
    finalizeDayTasks,
    dismissPrompt
  };
};
