
import React from 'react';
import { Task } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTimeBlockLabel } from '@/utils/storage';
import { CheckIcon, ClockIcon } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
}

// Group tasks by time block
const groupTasksByTimeBlock = (tasks: Task[]): Record<number, Task[]> => {
  return tasks.reduce((acc, task) => {
    const timeBlock = task.timeBlock;
    if (!acc[timeBlock]) {
      acc[timeBlock] = [];
    }
    acc[timeBlock].push(task);
    return acc;
  }, {} as Record<number, Task[]>);
};

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  const groupedTasks = groupTasksByTimeBlock(tasks);
  const timeBlocks = Object.keys(groupedTasks).map(Number).sort((a, b) => b - a); // Sort in reverse order (newest first)

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg">No tasks recorded yet for today.</p>
        <p>Tasks you add will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {timeBlocks.map((timeBlock) => (
        <Card key={timeBlock} className="overflow-hidden">
          <CardHeader className="bg-muted py-2 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClockIcon size={16} />
              <span>{getTimeBlockLabel(timeBlock)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {groupedTasks[timeBlock].map((task) => (
                <li key={task.id} className="p-3 flex items-start gap-2">
                  <div className="mt-1 text-cheer-green">
                    <CheckIcon size={18} />
                  </div>
                  <p>{task.text}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TaskList;
