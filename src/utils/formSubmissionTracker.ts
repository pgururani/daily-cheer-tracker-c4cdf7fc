// Form submission tracking and dynamic value management

export interface FormSubmission {
  url: string;
  timestamp: number;
  submittedData: Record<string, string>;
  formHash: string; // Unique identifier for the form structure
}

export interface FieldMapping {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  defaultValue: string;
  currentValue: string;
  valueType: 'static' | 'dynamic' | 'incremental';
  lastUsed?: number;
  usageCount: number;
}

export interface FormTrackingData {
  formHash: string;
  url: string;
  submissions: FormSubmission[];
  fieldMappings: Record<string, FieldMapping>;
  lastSubmission?: number;
  totalSubmissions: number;
}

// Storage keys for Chrome extension
const STORAGE_KEYS = {
  FORM_TRACKING: 'formTrackingData',
  SUBMISSION_HISTORY: 'submissionHistory'
};

// Generate a hash for form structure to identify unique forms
export const generateFormHash = (detectedFields: Record<string, { element?: HTMLElement; type: string; name: string; id: string }>): string => {
  const fieldSignature = Object.keys(detectedFields)
    .sort()
    .map(key => {
      const field = detectedFields[key];
      return `${field.name || 'unknown'}_${field.type || 'unknown'}`;
    })
    .join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fieldSignature.length; i++) {
    const char = fieldSignature.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

// Get stored form tracking data
export const getFormTrackingData = async (formHash: string): Promise<FormTrackingData | null> => {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([STORAGE_KEYS.FORM_TRACKING], (result) => {
        const allTrackingData = result[STORAGE_KEYS.FORM_TRACKING] || {};
        resolve(allTrackingData[formHash] || null);
      });
    } else {
      resolve(null);
    }
  });
};

// Save form tracking data
export const saveFormTrackingData = async (formHash: string, trackingData: FormTrackingData): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([STORAGE_KEYS.FORM_TRACKING], (result) => {
        const allTrackingData = result[STORAGE_KEYS.FORM_TRACKING] || {};
        allTrackingData[formHash] = trackingData;
        
        chrome.storage.local.set({ [STORAGE_KEYS.FORM_TRACKING]: allTrackingData }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } else {
      resolve();
    }
  });
};

// Generate dynamic values based on field type and usage history
export const generateDynamicValue = (fieldMapping: FieldMapping, previousSubmissions: FormSubmission[]): string => {
  const { fieldType, fieldName, defaultValue, usageCount, valueType } = fieldMapping;
  const normalizedName = fieldName.toLowerCase();
  
  console.log(`🔄 Generating dynamic value for ${fieldName} (type: ${fieldType}, usage: ${usageCount})`);
  
  switch (valueType) {
    case 'static':
      return defaultValue;
      
    case 'incremental':
      return generateIncrementalValue(fieldMapping, previousSubmissions);
      
    case 'dynamic':
    default:
      return generateContextualValue(fieldMapping, previousSubmissions);
  }
};

// Generate incremental values (like issue numbers, session counts, etc.)
const generateIncrementalValue = (fieldMapping: FieldMapping, previousSubmissions: FormSubmission[]): string => {
  const { fieldName, defaultValue, usageCount } = fieldMapping;
  const normalizedName = fieldName.toLowerCase();
  
  // GitHub issue URLs - increment issue number
  if (normalizedName.includes('github') || normalizedName.includes('issue')) {
    const baseUrl = defaultValue.includes('github.com') ? defaultValue : 'https://github.com/company/project/issues/';
    const issueNumber = 123 + usageCount; // Start from 123, increment by usage
    return baseUrl.includes('/issues/') ? 
      baseUrl.replace(/\/issues\/\d+$/, `/issues/${issueNumber}`) :
      `${baseUrl}${issueNumber}`;
  }
  
  // Session or entry numbers
  if (normalizedName.includes('session') || normalizedName.includes('entry')) {
    return `Session ${usageCount + 1}`;
  }
  
  // Version numbers
  if (normalizedName.includes('version')) {
    const major = Math.floor(usageCount / 10) + 1;
    const minor = usageCount % 10;
    return `v${major}.${minor}`;
  }
  
  // Default: just append count
  return `${defaultValue} ${usageCount > 0 ? `(${usageCount + 1})` : ''}`;
};

// Generate contextual values based on time, patterns, etc.
const generateContextualValue = (fieldMapping: FieldMapping, previousSubmissions: FormSubmission[]): string => {
  const { fieldName, defaultValue, fieldType } = fieldMapping;
  const normalizedName = fieldName.toLowerCase();
  const now = new Date();
  
  // Date fields - always use today's date
  if (fieldType === 'date' || normalizedName.includes('date') || normalizedName.includes('day')) {
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  
  // Time-based descriptions
  if (normalizedName.includes('description') || normalizedName.includes('work') || normalizedName.includes('task')) {
    const timeOfDay = now.getHours();
    const timeDescriptors = [
      'morning', 'afternoon', 'evening'
    ][Math.floor(timeOfDay / 8)] || 'today';
    
    const activities = [
      'Implemented new features and optimized performance',
      'Fixed critical bugs and improved user experience',
      'Enhanced security measures and code quality',
      'Developed responsive components and UI improvements',
      'Refactored legacy code and added comprehensive tests',
      'Integrated third-party APIs and optimized data flow'
    ];
    
    const activityIndex = (previousSubmissions.length + timeOfDay) % activities.length;
    return `${activities[activityIndex]} during ${timeDescriptors} session`;
  }
  
  // Project names with rotation
  if (normalizedName.includes('project') || normalizedName.includes('client')) {
    const projects = [
      'Project Alpha', 'Beta Initiative', 'Gamma Platform',
      'Delta Service', 'Epsilon Framework', 'Zeta Dashboard'
    ];
    const projectIndex = previousSubmissions.length % projects.length;
    return projects[projectIndex];
  }
  
  // Time spent - vary based on complexity patterns
  if (normalizedName.includes('time') || normalizedName.includes('hours')) {
    const timeOptions = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '2'];
    const timeIndex = (previousSubmissions.length + now.getDate()) % timeOptions.length;
    return timeOptions[timeIndex];
  }
  
  // Default: return original value
  return defaultValue;
};

// Determine field value type based on field characteristics
export const determineValueType = (fieldName: string, fieldType: string): 'static' | 'dynamic' | 'incremental' => {
  const normalizedName = fieldName.toLowerCase();
  
  // Static fields (rarely change)
  if (normalizedName.includes('name') || normalizedName.includes('who') || normalizedName.includes('person')) {
    return 'static';
  }
  
  // Incremental fields (should increment with each submission)
  if (normalizedName.includes('github') || normalizedName.includes('issue') ||
      normalizedName.includes('session') || normalizedName.includes('entry') ||
      normalizedName.includes('version') || normalizedName.includes('number')) {
    return 'incremental';
  }
  
  // Dynamic fields (change based on context)
  return 'dynamic';
};

// Create field mappings from detected fields and user preferences
export const createFieldMappings = async (
  detectedFields: Record<string, { element?: HTMLElement; type: string; name: string; id: string }>,
  userPreferences: { person_name?: string; project_name?: string; time_spent?: string }
): Promise<Record<string, FieldMapping>> => {
  const mappings: Record<string, FieldMapping> = {};
  
  for (const [fieldId, fieldInfo] of Object.entries(detectedFields)) {
    const fieldName = fieldInfo.name || fieldId;
    const fieldType = fieldInfo.type || 'text';
    const valueType = determineValueType(fieldName, fieldType);
    
    // Determine default value based on field name and user preferences
    let defaultValue = '';
    const normalizedName = fieldName.toLowerCase();
    
    if (normalizedName.includes('name') || normalizedName.includes('who') || normalizedName.includes('person')) {
      defaultValue = userPreferences.person_name || 'PG';
    } else if (normalizedName.includes('date') || normalizedName.includes('day')) {
      defaultValue = new Date().toISOString().split('T')[0];
    } else if (normalizedName.includes('project') || normalizedName.includes('client')) {
      defaultValue = userPreferences.project_name || 'Project Alpha';
    } else if (normalizedName.includes('time') || normalizedName.includes('hours')) {
      defaultValue = userPreferences.time_spent || '1';
    } else if (normalizedName.includes('description') || normalizedName.includes('work')) {
      defaultValue = 'Implemented new features and fixed critical bugs';
    } else if (normalizedName.includes('github') || normalizedName.includes('issue')) {
      defaultValue = 'https://github.com/company/project/issues/123';
    }
    
    mappings[fieldId] = {
      fieldId,
      fieldName,
      fieldType,
      defaultValue,
      currentValue: defaultValue,
      valueType,
      usageCount: 0
    };
  }
  
  return mappings;
};

// Record a form submission
export const recordFormSubmission = async (
  formHash: string,
  url: string,
  submittedData: Record<string, string>,
  fieldMappings: Record<string, FieldMapping>
): Promise<void> => {
  try {
    let trackingData = await getFormTrackingData(formHash);
    
    if (!trackingData) {
      trackingData = {
        formHash,
        url,
        submissions: [],
        fieldMappings: {},
        totalSubmissions: 0
      };
    }
    
    // Create new submission record
    const submission: FormSubmission = {
      url,
      timestamp: Date.now(),
      submittedData,
      formHash
    };
    
    // Update tracking data
    trackingData.submissions.push(submission);
    trackingData.lastSubmission = submission.timestamp;
    trackingData.totalSubmissions += 1;
    
    // Update field mappings with usage counts
    for (const [fieldId, data] of Object.entries(submittedData)) {
      if (trackingData.fieldMappings[fieldId]) {
        trackingData.fieldMappings[fieldId].usageCount += 1;
        trackingData.fieldMappings[fieldId].lastUsed = Date.now();
      } else if (fieldMappings[fieldId]) {
        trackingData.fieldMappings[fieldId] = {
          ...fieldMappings[fieldId],
          usageCount: 1,
          lastUsed: Date.now()
        };
      }
    }
    
    // Keep only last 10 submissions to avoid storage bloat
    if (trackingData.submissions.length > 10) {
      trackingData.submissions = trackingData.submissions.slice(-10);
    }
    
    await saveFormTrackingData(formHash, trackingData);
    console.log(`📊 Recorded submission for form ${formHash}. Total submissions: ${trackingData.totalSubmissions}`);
  } catch (error) {
    console.error('Error recording form submission:', error);
  }
};

// Generate intelligent form data with tracking
export const generateIntelligentFormData = async (
  detectedFields: Record<string, { element?: HTMLElement; type: string; name: string; id: string }>,
  url: string,
  userPreferences: { person_name?: string; project_name?: string; time_spent?: string }
): Promise<Record<string, string>> => {
  try {
    const formHash = generateFormHash(detectedFields);
    console.log(`🧠 Generating intelligent data for form ${formHash}`);
    
    // Get existing tracking data
    const trackingData = await getFormTrackingData(formHash);
    let fieldMappings: Record<string, FieldMapping>;
    
    if (trackingData) {
      fieldMappings = trackingData.fieldMappings;
      console.log(`📊 Found existing tracking data. ${trackingData.totalSubmissions} previous submissions`);
    } else {
      // Create new field mappings
      fieldMappings = await createFieldMappings(detectedFields, userPreferences);
      console.log(`🆕 Created new field mappings for ${Object.keys(fieldMappings).length} fields`);
    }
    
    // Generate values for current submission
    const formData: Record<string, string> = {};
    const previousSubmissions = trackingData?.submissions || [];
    
    for (const [fieldId, fieldInfo] of Object.entries(detectedFields)) {
      const fieldMapping = fieldMappings[fieldId];
      
      if (fieldMapping) {
        const dynamicValue = generateDynamicValue(fieldMapping, previousSubmissions);
        formData[fieldId] = dynamicValue;
        
        // Update current value in mapping
        fieldMapping.currentValue = dynamicValue;
        
        console.log(`🔄 ${fieldMapping.fieldName}: "${dynamicValue}" (${fieldMapping.valueType})`);
      } else {
        // Fallback for unknown fields
        formData[fieldId] = '';
        console.log(`⚠️ No mapping found for field ${fieldId}`);
      }
    }
    
    console.log(`🧠 Generated intelligent form data:`, formData);
    return formData;
  } catch (error) {
    console.error('Error generating intelligent form data:', error);
    return {};
  }
};

// Get submission statistics for a form
export const getFormStatistics = async (formHash: string): Promise<{
  totalSubmissions: number;
  lastSubmission?: Date;
  mostUsedValues: Record<string, string>;
  fieldUsage: Record<string, number>;
} | null> => {
  try {
    const trackingData = await getFormTrackingData(formHash);
    
    if (!trackingData) {
      return null;
    }
    
    const mostUsedValues: Record<string, string> = {};
    const fieldUsage: Record<string, number> = {};
    
    // Calculate most used values and field usage
    for (const [fieldId, mapping] of Object.entries(trackingData.fieldMappings)) {
      mostUsedValues[fieldId] = mapping.currentValue;
      fieldUsage[fieldId] = mapping.usageCount;
    }
    
    return {
      totalSubmissions: trackingData.totalSubmissions,
      lastSubmission: trackingData.lastSubmission ? new Date(trackingData.lastSubmission) : undefined,
      mostUsedValues,
      fieldUsage
    };
  } catch (error) {
    console.error('Error getting form statistics:', error);
    return null;
  }
}; 