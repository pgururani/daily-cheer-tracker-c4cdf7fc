
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTimeBlockLabel } from '@/utils/storage';
import { SmileIcon } from 'lucide-react';

interface TaskPromptProps {
  timeBlock: number;
  onTaskAdd: (task: string) => void;
  onDismiss: () => void;
}

// Encouraging prompts for different times of day
const encouragingPrompts = [
  "What awesome thing did you just accomplish?",
  "Share a win from the last couple hours!",
  "What progress have you made recently?",
  "What task did you tackle successfully?",
  "What achievement would you like to note down?"
];

const TaskPrompt: React.FC<TaskPromptProps> = ({ timeBlock, onTaskAdd, onDismiss }) => {
  const [task, setTask] = useState('');
  
  // Get a random encouraging prompt
  const randomPrompt = encouragingPrompts[Math.floor(Math.random() * encouragingPrompts.length)];
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task.trim()) {
      onTaskAdd(task);
      setTask('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <CardHeader className="bg-gradient-to-r from-cheer-blue to-cheer-purple rounded-t-lg">
          <CardTitle className="text-white flex items-center gap-2">
            <SmileIcon className="animate-bounce-slow" />
            <span>Time Check! {getTimeBlockLabel(timeBlock)}</span>
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6">
            <p className="text-lg mb-4 text-center">{randomPrompt}</p>
            <div className="task-input-container">
              <Input
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="I completed..."
                className="w-full text-base"
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            <Button 
              variant="outline" 
              type="button" 
              onClick={onDismiss}
              className="w-full"
            >
              Skip for now
            </Button>
            <Button 
              type="submit" 
              className="w-full bg-cheer-green hover:bg-cheer-green/90"
              disabled={!task.trim()}
            >
              Add achievement
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default TaskPrompt;
