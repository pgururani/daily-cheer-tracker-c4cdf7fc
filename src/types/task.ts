
export interface Task {
  id: string;
  text: string;
  timestamp: string;
  timeBlock: number;
}

export interface DailyTasks {
  date: string;
  tasks: Task[];
}

export interface TaskState {
  tasks: Task[];
  dailyHistory: DailyTasks[];
}
