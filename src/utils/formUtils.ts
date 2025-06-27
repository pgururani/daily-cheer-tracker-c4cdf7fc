// Default form fields structure (simplified for autofill)
export const DEFAULT_FORM_FIELDS = {
  name: '',
  date: '',
  client: '',
  time: '',
  description: '',
  githubIssue: ''
};

// Function to get today's date in YYYY-MM-DD format
export const getTodaysDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Daily Cheer Tracker specific form fields
export const DAILY_CHEER_FORM_FIELDS = {
  person_name: '',      // "who are you" dropdown
  work_date: '',        // "Which day are you adding time for?" date field
  project_name: '',     // "Which project did you work on?" dropdown
  time_spent: '',       // "How much time did you spend on this client?" radio buttons (0.25, 0.5, 0.75, 1)
  work_description: '', // "Please write a brief description of work undertaken" textarea
  github_issue: ''      // "Github Issue #" text field
};

// Default user preferences - these can be customized
export const DEFAULT_USER_PREFERENCES = {
  person_name: 'PG',           // Default person name
  project_name: 'Project Alpha', // Default project name  
  time_spent: '1',             // Default time spent (1 hour)
  auto_use_today_date: true    // Automatically use today's date
};

// Sample data specifically for the daily cheer tracker form - uses today's date
export const DAILY_CHEER_SAMPLE_DATA = {
  person_name: DEFAULT_USER_PREFERENCES.person_name,
  work_date: getTodaysDate(), // Always use today's date
  project_name: DEFAULT_USER_PREFERENCES.project_name,
  time_spent: DEFAULT_USER_PREFERENCES.time_spent,
  work_description: 'Implemented new features and fixed critical bugs in the React components',
  github_issue: 'https://github.com/company/project/issues/123'
};

// Function to get user preferences from Chrome storage
export const getUserPreferences = async (): Promise<typeof DEFAULT_USER_PREFERENCES> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['userPreferences'], (result) => {
        const preferences = result.userPreferences || DEFAULT_USER_PREFERENCES;
        resolve({ ...DEFAULT_USER_PREFERENCES, ...preferences });
      });
    } else {
      resolve(DEFAULT_USER_PREFERENCES);
    }
  });
};

// Function to save user preferences to Chrome storage
export const saveUserPreferences = async (preferences: Partial<typeof DEFAULT_USER_PREFERENCES>): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ userPreferences: preferences }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

// Function to get personalized sample data based on user preferences
export const getPersonalizedSampleData = async (): Promise<typeof DAILY_CHEER_SAMPLE_DATA> => {
  const preferences = await getUserPreferences();
  
  return {
    person_name: preferences.person_name,
    work_date: preferences.auto_use_today_date ? getTodaysDate() : DAILY_CHEER_SAMPLE_DATA.work_date,
    project_name: preferences.project_name,
    time_spent: preferences.time_spent,
    work_description: 'Implemented new features and fixed critical bugs in the React components',
    github_issue: 'https://github.com/company/project/issues/123'
  };
};

// Function to generate proper field-to-value mapping for form filling
export const generateFormFieldMapping = async (detectedFields: Record<string, { element?: HTMLElement; type: string; name: string; id: string }>): Promise<Record<string, string>> => {
  const personalizedData = await getPersonalizedSampleData();
  const mapping: Record<string, string> = {};
  
  console.log('🗺️ Generating smart field mapping for detected fields:', Object.keys(detectedFields));
  console.log('🗺️ Using personalized data:', personalizedData);
  
  // Iterate through detected fields and map them to appropriate values
  for (const [fieldId, fieldInfo] of Object.entries(detectedFields)) {
    const fieldName = fieldInfo.name?.toLowerCase() || '';
    const fieldType = fieldInfo.type?.toLowerCase() || '';
    
    console.log(`🗺️ Processing field "${fieldId}" (name: "${fieldName}", type: "${fieldType}")`);
    
    // Debug: Show field classification results
    console.log(`  🔍 Field Analysis for "${fieldName}":`);
    console.log(`    - isProjectField: ${isProjectField(fieldName)}`);
    console.log(`    - isDescriptionField: ${isDescriptionField(fieldName)}`);
    console.log(`    - isPersonNameField: ${isPersonNameField(fieldName)}`);
    console.log(`    - isTimeField: ${isTimeField(fieldName)}`);
    console.log(`    - isGithubField: ${isGithubField(fieldName)}`);
    console.log(`    - isDateField: ${isDateField(fieldName)}`);
    
    // STEP 1: Handle by field type first (most reliable)
    if (fieldType === 'dropdown' || fieldType === 'select') {
      // For dropdowns, prioritize specific field types and be more restrictive
      if (isProjectField(fieldName)) {
        mapping[fieldId] = personalizedData.project_name;
        console.log(`✅ Dropdown (PROJECT) mapped to project_name: ${personalizedData.project_name}`);
      } else if (isPersonNameField(fieldName)) {
        mapping[fieldId] = personalizedData.person_name;
        console.log(`✅ Dropdown (NAME) mapped to person_name: ${personalizedData.person_name}`);
      } else if (isTimeField(fieldName)) {
        mapping[fieldId] = personalizedData.time_spent;
        console.log(`✅ Dropdown (TIME) mapped to time_spent: ${personalizedData.time_spent}`);
      } else {
        // For unrecognized dropdowns, try to use a simple text value
        mapping[fieldId] = personalizedData.project_name;
        console.log(`⚠️ Unknown dropdown "${fieldId}" mapped to project_name as fallback`);
      }
    } else if (fieldType === 'date') {
      // Date fields always get date values
      mapping[fieldId] = personalizedData.work_date;
      console.log(`✅ Date field mapped to work_date: ${personalizedData.work_date}`);
    } else if (fieldType === 'textarea') {
      // Textareas should get description text (prioritize description over project)
      if (isDescriptionField(fieldName)) {
        mapping[fieldId] = personalizedData.work_description;
        console.log(`✅ Textarea (DESCRIPTION) mapped to work_description`);
      } else if (isGithubField(fieldName)) {
        mapping[fieldId] = personalizedData.github_issue;
        console.log(`✅ Textarea (GITHUB) mapped to github_issue: ${personalizedData.github_issue}`);
      } else {
        // Default for textarea is description, not project
        mapping[fieldId] = personalizedData.work_description;
        console.log(`✅ Textarea (DEFAULT) mapped to work_description`);
      }
    } else if (fieldType === 'url') {
      // URL fields get GitHub issue URLs
      mapping[fieldId] = personalizedData.github_issue;
      console.log(`✅ URL field mapped to github_issue: ${personalizedData.github_issue}`);
    } else if (fieldType === 'email') {
      // Email fields get email addresses
      mapping[fieldId] = 'pradeep@example.com';
      console.log(`✅ Email field mapped to email address`);
    } else if (fieldType === 'text' || fieldType === 'input') {
      // STEP 2: For text inputs, determine by field name with clear priority
      if (isPersonNameField(fieldName)) {
        mapping[fieldId] = personalizedData.person_name;
        console.log(`✅ Text input (NAME) mapped to person_name: ${personalizedData.person_name}`);
      } else if (isProjectField(fieldName)) {
        mapping[fieldId] = personalizedData.project_name;
        console.log(`✅ Text input (PROJECT) mapped to project_name: ${personalizedData.project_name}`);
      } else if (isGithubField(fieldName)) {
        mapping[fieldId] = personalizedData.github_issue;
        console.log(`✅ Text input (GITHUB) mapped to github_issue: ${personalizedData.github_issue}`);
      } else if (isDescriptionField(fieldName)) {
        mapping[fieldId] = personalizedData.work_description;
        console.log(`✅ Text input (DESCRIPTION) mapped to work_description`);
      } else {
        // Default for unknown text fields
        mapping[fieldId] = personalizedData.person_name;
        console.log(`⚠️ Unknown text field "${fieldId}" mapped to person_name as fallback`);
      }
    } else if (fieldType === 'radio') {
      // Radio buttons typically for time selection
      mapping[fieldId] = personalizedData.time_spent;
      console.log(`✅ Radio field mapped to time_spent: ${personalizedData.time_spent}`);
    } else {
      // STEP 3: Final fallback based on field name only
      if (isPersonNameField(fieldName)) {
        mapping[fieldId] = personalizedData.person_name;
      } else if (isDateField(fieldName)) {
        mapping[fieldId] = personalizedData.work_date;
      } else if (isProjectField(fieldName)) {
        mapping[fieldId] = personalizedData.project_name;
      } else if (isTimeField(fieldName)) {
        mapping[fieldId] = personalizedData.time_spent;
      } else if (isDescriptionField(fieldName)) {
        mapping[fieldId] = personalizedData.work_description;
      } else if (isGithubField(fieldName)) {
        mapping[fieldId] = personalizedData.github_issue;
      } else {
        console.log(`❌ No mapping found for field "${fieldId}" (name: "${fieldName}", type: "${fieldType}")`);
        continue; // Skip unmappable fields
      }
      console.log(`✅ Fallback mapped ${fieldId} based on field name`);
    }
  }
  
  console.log('🗺️ Final intelligent field mapping:', mapping);
  return mapping;
};

// Simple URL validator (simplified function)
export const isValidGoogleFormUrl = (url: string): boolean => {
  return url.startsWith('http') && (
    url.includes('docs.google.com/forms') || 
    url.includes('forms.gle/')
  );
};

// Format tasks as a summary string
export const formatTasksAsSummary = (tasks: Array<{ text: string; client?: string; githubIssue?: string }>): string => {
  if (!tasks || tasks.length === 0) return "No tasks recorded";
  
  return tasks.map(task => {
    let summary = `- ${task.text}`;
    if (task.client) summary += ` [${task.client}]`;
    if (task.githubIssue) summary += ` (${task.githubIssue})`;
    return summary;
  }).join('\n');
};

// Enhanced form field detection for Google Forms
export const detectFormFields = async (url: string): Promise<{ url: string; fields: typeof DEFAULT_FORM_FIELDS; isGoogleForm: boolean }> => {
  console.log('Form field detection started for URL:', url);
  
  if (isValidGoogleFormUrl(url)) {
    console.log('Google Form URL detected - will use specialized detection');
    return {
      url: url,
      fields: DEFAULT_FORM_FIELDS,
      isGoogleForm: true
    };
  }
  
  return {
    url: url,
    fields: DEFAULT_FORM_FIELDS,
    isGoogleForm: false
  };
};

// Get current page form fields
export const getCurrentPageFormFields = async (): Promise<Record<string, { element: HTMLElement; type: string; name: string; id: string }>> => {
  return new Promise((resolve, reject) => {
    try {
      if (!chrome || !chrome.tabs) {
        reject(new Error('Chrome API not available'));
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('No active tab found'));
          return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, { action: 'detectFields' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            resolve(response.fields || {});
          } else {
            reject(new Error(response?.error || 'Failed to detect form fields'));
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Autofill form fields
export const autofillFormFields = async (fieldsData: Record<string, string>): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      if (!chrome || !chrome.tabs) {
        reject(new Error('Chrome API not available'));
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) {
          reject(new Error('No active tab found'));
          return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'autofillForm',
          data: fieldsData
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            resolve(true);
          } else {
            reject(new Error(response?.error || 'Failed to autofill form fields'));
          }
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Enhanced field mapping with better name handling
export const getFieldMapping = (): Record<string, string[]> => {
  return {
    // Name fields - enhanced with more variations
    name: [
      'name', 'full_name', 'fullname', 'full-name',
      'person_name', 'person-name', 'personname',
      'employee_name', 'employee-name', 'employeename',
      'user_name', 'user-name', 'username',
      'contact_name', 'contact-name', 'contactname',
      'agent_name', 'agent-name', 'agentname',
      'representative', 'rep', 'agent', 'staff',
      'assignee', 'assigned_to', 'assigned-to',
      'responsible_person', 'responsible-person',
      'team_member', 'team-member', 'teammember',
      // Google Forms variations
      'gform_name', 'gform_person', 'gform_agent',
      'gform_employee', 'gform_staff', 'gform_assignee'
    ],
    
    // First name variations
    first_name: [
      'first_name', 'first-name', 'firstname',
      'given_name', 'given-name', 'givenname',
      'fname', 'f_name', 'f-name'
    ],
    
    // Last name variations
    last_name: [
      'last_name', 'last-name', 'lastname',
      'family_name', 'family-name', 'familyname',
      'surname', 'lname', 'l_name', 'l-name'
    ],
    
    // Date fields - enhanced
    date: [
      'date', 'created_date', 'created-date', 'createddate',
      'submission_date', 'submission-date', 'submissiondate',
      'entry_date', 'entry-date', 'entrydate',
      'work_date', 'work-date', 'workdate',
      'activity_date', 'activity-date', 'activitydate',
      'event_date', 'event-date', 'eventdate',
      'start_date', 'start-date', 'startdate',
      'end_date', 'end-date', 'enddate',
      'due_date', 'due-date', 'duedate',
      // Google Forms variations
      'gform_date', 'gform_created', 'gform_submission',
      'gform_work_date', 'gform_activity_date'
    ],
    
    // Client/Customer fields - enhanced
    client: [
      'client', 'client_name', 'client-name', 'clientname',
      'customer', 'customer_name', 'customer-name', 'customername',
      'company', 'company_name', 'company-name', 'companyname',
      'organization', 'org', 'org_name', 'org-name',
      'business', 'business_name', 'business-name',
      'account', 'account_name', 'account-name',
      'project', 'project_name', 'project-name',
      // Google Forms variations
      'gform_client', 'gform_customer', 'gform_company',
      'gform_organization', 'gform_project'
    ],
    
    // Time fields - enhanced
    time: [
      'time', 'start_time', 'start-time', 'starttime',
      'end_time', 'end-time', 'endtime',
      'duration', 'hours', 'minutes',
      'work_time', 'work-time', 'worktime',
      'activity_time', 'activity-time', 'activitytime',
      'session_time', 'session-time', 'sessiontime',
      'logged_time', 'logged-time', 'loggedtime',
      // Google Forms variations
      'gform_time', 'gform_duration', 'gform_hours',
      'gform_start_time', 'gform_end_time'
    ],
    
    // Description/Notes fields - enhanced
    description: [
      'description', 'desc', 'details', 'notes',
      'comments', 'comment', 'remarks', 'remark',
      'summary', 'overview', 'explanation',
      'work_description', 'work-description', 'workdescription',
      'activity_description', 'activity-description', 'activitydescription',
      'task_description', 'task-description', 'taskdescription',
      'project_description', 'project-description', 'projectdescription',
      'additional_info', 'additional-info', 'additionalinfo',
      'message', 'content', 'text', 'body'
    ],
    
    // GitHub/Repository fields - enhanced
    github: [
      'github', 'github_url', 'github-url', 'githuburl',
      'repository', 'repo', 'repo_url', 'repo-url',
      'git_url', 'git-url', 'giturl',
      'source_code', 'source-code', 'sourcecode',
      'code_repository', 'code-repository', 'coderepository',
      'project_url', 'project-url', 'projecturl',
      'link', 'url', 'website', 'web_url', 'web-url'
    ],
    
    // Email fields
    email: [
      'email', 'email_address', 'email-address', 'emailaddress',
      'e_mail', 'e-mail', 'mail', 'contact_email', 'contact-email'
    ],
    
    // Phone fields
    phone: [
      'phone', 'phone_number', 'phone-number', 'phonenumber',
      'telephone', 'tel', 'mobile', 'cell', 'contact_number', 'contact-number'
    ],
    
    // Status/Priority fields
    status: [
      'status', 'state', 'condition', 'stage',
      'priority', 'urgency', 'importance', 'level'
    ],
    
    // Category/Type fields
    category: [
      'category', 'type', 'kind', 'classification',
      'tag', 'tags', 'label', 'labels'
    ],
    
    // Person/Name fields - "who are you"
    person_name: [
      'person_name', 'name', 'who_are_you', 'who_you_are',
      'employee', 'agent', 'user', 'person', 'staff',
      'assignee', 'team_member', 'developer'
    ],
    
    // Work date - "Which day are you adding time for?"
    work_date: [
      'work_date', 'date', 'day', 'work_day', 'time_date',
      'entry_date', 'activity_date', 'log_date',
      'which_day', 'adding_time', 'time_for'
    ],
    
    // Project name - "Which project did you work on?"
    project_name: [
      'project_name', 'project', 'work_project', 'client_project',
      'which_project', 'worked_on', 'project_worked', 'work_on',
      'client', 'account', 'assignment', 'project_did_you_work'
    ],
    
    // Time spent - "How much time did you spend on this client?"
    time_spent: [
      'time_spent', 'time', 'hours', 'duration', 'spent_time',
      'how_much_time', 'time_spend', 'client_time',
      'work_hours', 'logged_time', 'billable_time'
    ],
    
    // Work description - "Please write a brief description of work undertaken"
    work_description: [
      'work_description', 'description', 'work_undertaken', 'brief_description',
      'work_details', 'task_description', 'activity_description',
      'what_did_you_do', 'work_summary', 'details', 'notes',
      'describe', 'write', 'please_write'
    ],
    
    // GitHub issue - "Github Issue #"
    github_issue: [
      'github_issue', 'github', 'issue', 'github_url', 'issue_number',
      'github_link', 'repository', 'repo', 'ticket', 'bug_report',
      'feature_request', 'pull_request', 'pr'
    ]
  };
};

// Enhanced function to find the best field match with name-aware logic
export const findBestFieldMatch = (fieldName: string, availableFields: string[]): string | null => {
  const fieldMapping = getFieldMapping();
  const normalizedFieldName = normalizeFieldName(fieldName);
  
  console.log(`Finding best match for field: "${fieldName}" (normalized: "${normalizedFieldName}")`);
  console.log('Available fields:', availableFields);
  
  // First, try exact matches
  for (const availableField of availableFields) {
    const normalizedAvailable = normalizeFieldName(availableField);
    if (normalizedAvailable === normalizedFieldName) {
      console.log(`Exact match found: ${availableField}`);
      return availableField;
    }
  }
  
  // Then try mapping-based matches
  for (const [mappingKey, variations] of Object.entries(fieldMapping)) {
    if (variations.includes(normalizedFieldName)) {
      // Found the field type, now find the best available field for this type
      for (const availableField of availableFields) {
        const normalizedAvailable = normalizeFieldName(availableField);
        
        // Check if available field matches any variation of this type
        if (variations.includes(normalizedAvailable)) {
          console.log(`Mapping match found: ${fieldName} -> ${availableField} (type: ${mappingKey})`);
          return availableField;
        }
        
        // Special handling for name fields - check if it contains name-related keywords
        if (mappingKey === 'name' && isNameField(availableField)) {
          console.log(`Name field match found: ${fieldName} -> ${availableField}`);
          return availableField;
        }
        
        // Special handling for specific field types
        if (mappingKey === 'person_name' && isPersonNameField(availableField)) {
          console.log(`Person name field match found: ${fieldName} -> ${availableField}`);
          return availableField;
        }
        
        if (mappingKey === 'time_spent' && isTimeField(availableField)) {
          console.log(`Time field match found: ${fieldName} -> ${availableField}`);
          return availableField;
        }
      }
    }
  }
  
  // Finally, try fuzzy matching with enhanced name detection
  let bestMatch: { field: string, score: number } | null = null;
  
  for (const availableField of availableFields) {
    const score = calculateFieldMatchScore(normalizedFieldName, normalizeFieldName(availableField));
    
    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { field: availableField, score };
    }
  }
  
  if (bestMatch) {
    console.log(`Fuzzy match found: ${fieldName} -> ${bestMatch.field} (score: ${bestMatch.score})`);
    return bestMatch.field;
  }
  
  console.log(`No match found for field: ${fieldName}`);
  return null;
};

// Enhanced function to check if a field is likely a name field
const isNameField = (fieldName: string): boolean => {
  const nameKeywords = [
    'name', 'person', 'agent', 'employee', 'staff', 'user', 'contact',
    'assignee', 'responsible', 'team', 'member', 'representative', 'rep'
  ];
  
  const normalizedField = normalizeFieldName(fieldName);
  
  return nameKeywords.some(keyword => 
    normalizedField.includes(keyword) || keyword.includes(normalizedField)
  );
};

// Helper function to check if a field is likely a person name field
const isPersonNameField = (fieldName: string): boolean => {
  const nameKeywords = [
    'who', 'name', 'person', 'agent', 'employee', 'staff', 'user',
    'assignee', 'team', 'member', 'developer', 'you'
  ];
  
  const normalizedField = normalizeFieldName(fieldName);
  
  return nameKeywords.some(keyword => 
    normalizedField.includes(keyword) || keyword.includes(normalizedField)
  );
};

// Helper function to check if a field is likely a time field
const isTimeField = (fieldName: string): boolean => {
  const timeKeywords = [
    'time', 'hours', 'duration', 'spent', 'much', 'how',
    'billable', 'logged', 'work'
  ];
  
  const normalizedField = normalizeFieldName(fieldName);
  
  return timeKeywords.some(keyword => 
    normalizedField.includes(keyword) || keyword.includes(normalizedField)
  );
};

// Helper function to check if a field is likely a date field
const isDateField = (fieldName: string): boolean => {
  const dateKeywords = [
    'date', 'day', 'work_date', 'work_day', 'time_date',
    'entry_date', 'activity_date', 'log_date',
    'which_day', 'adding_time', 'time_for'
  ];
  
  const normalizedField = normalizeFieldName(fieldName);
  
  return dateKeywords.some(keyword => 
    normalizedField.includes(keyword) || keyword.includes(normalizedField)
  );
};

// Helper function to check if a field is likely a project field
const isProjectField = (fieldName: string): boolean => {
  const projectKeywords = [
    'project', 'project_name', 'work_project', 'client_project',
    'which_project', 'worked_on', 'project_worked', 'work_on',
    'client', 'account', 'assignment', 'project_did_you_work'
  ];
  
  const normalizedField = normalizeFieldName(fieldName);
  
  // More specific matching for project questions
  if (normalizedField.includes('which') && normalizedField.includes('project')) {
    return true;
  }
  
  if (normalizedField.includes('project') && (
    normalizedField.includes('work') || 
    normalizedField.includes('worked') || 
    normalizedField.includes('did')
  )) {
    return true;
  }
  
  return projectKeywords.some(keyword => 
    normalizedField.includes(keyword) || keyword.includes(normalizedField)
  );
};

// Helper function to check if a field is likely a description field
const isDescriptionField = (fieldName: string): boolean => {
  const descriptionKeywords = [
    'description', 'work_description', 'work_undertaken', 'brief_description',
    'work_details', 'task_description', 'activity_description',
    'what_did_you_do', 'work_summary', 'details', 'notes',
    'comments', 'summary', 'explanation', 'brief', 'undertaken',
    'describe', 'write', 'please_write'
  ];
  
  const normalizedField = normalizeFieldName(fieldName);
  
  // More specific matching for description questions
  if (normalizedField.includes('brief') && normalizedField.includes('description')) {
    return true;
  }
  
  if (normalizedField.includes('write') && (
    normalizedField.includes('description') || 
    normalizedField.includes('undertaken') ||
    normalizedField.includes('work')
  )) {
    return true;
  }
  
  if (normalizedField.includes('please') && normalizedField.includes('write')) {
    return true;
  }
  
  return descriptionKeywords.some(keyword => 
    normalizedField.includes(keyword) || keyword.includes(normalizedField)
  );
};

// Helper function to check if a field is likely a GitHub field
const isGithubField = (fieldName: string): boolean => {
  const githubKeywords = [
    'github', 'github_issue', 'github_url', 'issue', 'issue_number',
    'github_link', 'repository', 'repo', 'ticket', 'bug_report',
    'feature_request', 'pull_request', 'pr'
  ];
  
  const normalizedField = normalizeFieldName(fieldName);
  
  return githubKeywords.some(keyword => 
    normalizedField.includes(keyword) || keyword.includes(normalizedField)
  );
};

// Enhanced field name normalization
const normalizeFieldName = (fieldName: string): string => {
  return fieldName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Enhanced field matching score calculation
const calculateFieldMatchScore = (field1: string, field2: string): number => {
  if (field1 === field2) return 1.0;
  
  // Check for substring matches
  if (field1.includes(field2) || field2.includes(field1)) {
    const longer = field1.length > field2.length ? field1 : field2;
    const shorter = field1.length > field2.length ? field2 : field1;
    return shorter.length / longer.length;
  }
  
  // Calculate Levenshtein distance
  const distance = getLevenshteinDistance(field1, field2);
  const maxLength = Math.max(field1.length, field2.length);
  
  return 1 - (distance / maxLength);
};

// Levenshtein distance calculation
const getLevenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};
