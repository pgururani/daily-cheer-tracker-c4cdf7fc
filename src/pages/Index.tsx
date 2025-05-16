
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useTasks } from "@/hooks/useTasks";
import TaskList from "@/components/TaskList";
import TaskPrompt from "@/components/TaskPrompt";
import DailySummary from "@/components/DailySummary";
import SetupWizard from "@/components/SetupWizard";
import { ThumbsUp, Award } from "lucide-react";

const Index = () => {
  const [isExtension, setIsExtension] = useState(false);
  const [storageAccess, setStorageAccess] = useState(false);
  
  const { 
    tasks,
    dailyHistory,
    showPrompt,
    showSetupWizard,
    loading,
    addTask,
    dismissPrompt,
    finalizeDayTasks,
    completeSetup,
    closeSetupWizard,
    openSetupWizard,
    currentTimeBlock
  } = useTasks();

  useEffect(() => {
    // Check if running as extension
    const extensionCheck = !!chrome?.runtime?.id;
    console.log("Running as Chrome extension:", extensionCheck);
    setIsExtension(extensionCheck);
    
    // Check storage access
    if (extensionCheck && chrome.storage) {
      chrome.storage.local.get(["initialized"], (result) => {
        console.log("Storage access successful, initialized:", result.initialized);
        setStorageAccess(true);
        
        // Initialize if needed
        if (!result.initialized) {
          chrome.storage.local.set({ initialized: true, installDate: new Date().toISOString() }, () => {
            console.log("Extension initialized for first use");
            toast("Extension initialized", {
              description: "Setup complete. Ready to use.",
            });
          });
        }
      });
    }
  }, []);

  const handleAddTask = (text: string) => {
    addTask(text);
  };

  const handleFinalizeDayTasks = () => {
    finalizeDayTasks();
    toast("Day finalized!", {
      description: "Your tasks have been saved to history.",
      icon: <Award className="text-amber-500" />,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ThumbsUp className="text-blue-500" />
          <span>Daily Cheer Tracker</span>
        </h1>
        <Button variant="outline" size="sm" onClick={openSetupWizard}>
          Setup
        </Button>
      </div>
      
      {/* Setup Wizard */}
      {showSetupWizard && (
        <SetupWizard
          open={showSetupWizard}
          onComplete={completeSetup}
          onClose={closeSetupWizard}
        />
      )}
      
      {/* Task Input/List */}
      <Card className="mb-4 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle>Today's Achievements</CardTitle>
          <CardDescription>
            Track what you've accomplished today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskList tasks={tasks} />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleFinalizeDayTasks}
            disabled={tasks.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Finalize Today
          </Button>
        </CardFooter>
      </Card>
      
      {/* Daily History */}
      <DailySummary dailyHistory={dailyHistory} />
      
      {/* Task Prompt */}
      {showPrompt && (
        <TaskPrompt
          timeBlock={currentTimeBlock}
          onTaskAdd={handleAddTask}
          onDismiss={dismissPrompt}
        />
      )}
      
      {/* Extension Status */}
      <div className="mt-8 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Extension mode:</span>
          <span className={isExtension ? "text-green-600" : "text-amber-600"}>
            {isExtension ? "Active ✓" : "Development ⚠️"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Storage:</span>
          <span className={storageAccess ? "text-green-600" : "text-amber-600"}>
            {storageAccess ? "Available ✓" : "Unavailable ⚠️"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Index;
