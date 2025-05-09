
export interface Task {
  id: string;
  text: string;
  timestamp: string;
  timeBlock: number;
  client?: string;
  githubIssue?: string;
  timeSpent?: number; // in quarters (0.25, 0.5, 0.75, 1)
}

export interface DailyTasks {
  date: string;
  tasks: Task[];
  userName?: string;
}

export interface TaskState {
  tasks: Task[];
  dailyHistory: DailyTasks[];
  userName?: string;
  userSettings?: UserSettings;
}

// Google Form field configuration
export interface GoogleFormConfig {
  url: string;
  fields: {
    name: string;
    date: string;
    client: string;
    time: string;
    description: string;
    githubIssue: string;
  };
}

// Static field value configuration
export interface StaticFieldValue {
  isStatic: boolean;
  value: string;
}

// Static field values mapping
export interface StaticFieldValues {
  [key: string]: StaticFieldValue;
}

// User preferences and settings
export interface UserSettings {
  userName?: string;
  formConfig: GoogleFormConfig;
  defaultClient?: string;
  defaultTimeSpent?: string;
  staticValues?: StaticFieldValues;
  setupComplete?: boolean;
}
