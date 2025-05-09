
import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTasks } from "@/hooks/useTasks";
import TaskPrompt from "@/components/TaskPrompt";
import TaskList from "@/components/TaskList";
import DailySummary from "@/components/DailySummary";
import SetupWizard from "@/components/SetupWizard";
import { Calendar, CheckCircle, ListTodo, Timer, Settings } from "lucide-react";

const Index = () => {
  const { 
    tasks, 
    dailyHistory, 
    showPrompt, 
    showSetupWizard,
    currentTimeBlock, 
    userSettings,
    addTask, 
    finalizeDayTasks,
    dismissPrompt,
    completeSetup,
    openSetupWizard
  } = useTasks();

  return (
    <div className="min-h-screen bg-background">
      {/* Setup wizard that shows on first launch */}
      <SetupWizard 
        open={showSetupWizard} 
        onComplete={completeSetup}
        initialSettings={userSettings}
      />
      
      {/* Task prompt that shows every 2 hours */}
      {showPrompt && (
        <TaskPrompt 
          timeBlock={currentTimeBlock} 
          onTaskAdd={addTask} 
          onDismiss={dismissPrompt}
        />
      )}
      
      {/* App header */}
      <header className="bg-gradient-to-r from-cheer-blue to-cheer-purple text-white py-4 px-4 shadow-md">
        <div className="container max-w-2xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Timer className="animate-pulse" />
              <span>Daily Cheer Tracker</span>
            </h1>
            <div className="flex gap-2">
              <Button 
                onClick={() => addTask("I opened the app!")} 
                variant="secondary" 
                size="sm"
                className="text-sm bg-white/20 hover:bg-white/30 border-none"
              >
                <CheckCircle size={16} className="mr-2" />
                Quick Add
              </Button>
              {userSettings?.setupComplete && (
                <Button 
                  onClick={openSetupWizard} 
                  variant="secondary" 
                  size="sm"
                  className="text-sm bg-white/20 hover:bg-white/30 border-none"
                >
                  <Settings size={16} className="mr-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container max-w-2xl mx-auto p-4 pt-6">
        <Tabs defaultValue="today">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <ListTodo size={16} />
              <span>Today's Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar size={16} />
              <span>History</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="space-y-6">
            <TaskList tasks={tasks} />
            
            <div className="pt-4 border-t">
              <Button 
                onClick={finalizeDayTasks}
                className="w-full bg-cheer-green hover:bg-cheer-green/90"
                disabled={tasks.length === 0}
              >
                <CheckCircle size={18} className="mr-2" />
                Complete Today's Tasks
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <DailySummary dailyHistory={dailyHistory} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
