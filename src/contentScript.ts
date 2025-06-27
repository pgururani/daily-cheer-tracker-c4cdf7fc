console.log('Daily Cheer Tracker content script loaded');

// Store detected fields globally for better matching
let detectedFormFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }> = {};

// Store already detected elements to prevent duplicates
const detectedElements = new Set<HTMLElement>();

// Track successfully filled fields
interface FieldFillResult {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  success: boolean;
  value: string;
  timestamp: number;
  attempts: number;
  error?: string;
}

const fieldFillTracker = new Map<string, FieldFillResult>();

// Function to track field filling results
const trackFieldFill = (
  fieldId: string, 
  fieldName: string, 
  fieldType: string, 
  success: boolean, 
  value: string, 
  attempts: number = 1,
  error?: string
): void => {
  const result: FieldFillResult = {
    fieldId,
    fieldName,
    fieldType,
    success,
    value,
    timestamp: Date.now(),
    attempts,
    error
  };
  
  fieldFillTracker.set(fieldId, result);
  
  const status = success ? '✅' : '❌';
  const attemptText = attempts > 1 ? ` (attempt ${attempts})` : '';
  console.log(`${status} Field Fill Result: "${fieldName}" (${fieldType}) = "${value}"${attemptText}`);
  
  if (error) {
    console.log(`   Error: ${error}`);
  }
};

// Function to get fill statistics
const getFieldFillStats = (): { total: number; successful: number; failed: number; successRate: string } => {
  const results = Array.from(fieldFillTracker.values());
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;
  const successRate = total > 0 ? `${Math.round((successful / total) * 100)}%` : '0%';
  
  return { total, successful, failed, successRate };
};

// Function to log fill statistics
const logFieldFillStats = (): void => {
  const stats = getFieldFillStats();
  console.log(`📊 Field Fill Statistics: ${stats.successful}/${stats.total} successful (${stats.successRate})`);
  
  if (fieldFillTracker.size > 0) {
    console.table(Array.from(fieldFillTracker.values()));
  }
};

// Function to check if an element is visible and not hidden
const isElementVisible = (element: HTMLElement): boolean => {
  // Check if element exists
  if (!element) return false;
  
  // Check computed styles
  const style = window.getComputedStyle(element);
  
  // Element is hidden if:
  // 1. display is none
  // 2. visibility is hidden
  // 3. opacity is 0
  // 4. width and height are both 0
  // 5. element is positioned off-screen
  if (style.display === 'none' || 
      style.visibility === 'hidden' || 
      style.opacity === '0' ||
      (style.width === '0px' && style.height === '0px') ||
      (element.offsetWidth === 0 && element.offsetHeight === 0)) {
    return false;
  }
  
  // Check if element is positioned off-screen
  const rect = element.getBoundingClientRect();
  if (rect.left < -1000 || rect.top < -1000 || rect.right < 0 || rect.bottom < 0) {
    return false;
  }
  
  // Check if any parent element is hidden
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === 'none' || 
        parentStyle.visibility === 'hidden' ||
        parentStyle.opacity === '0') {
      return false;
    }
    parent = parent.parentElement;
  }
  
  return true;
};

// Function to check if a form field should be included (visible and interactive)
const isValidFormField = (element: HTMLElement, type: string): boolean => {
  // Skip hidden input types
  if (type === 'hidden') {
    return false;
  }
  
  // Skip Google Forms system fields (they have specific patterns)
  const name = (element as HTMLInputElement).name || '';
  const id = (element as HTMLInputElement).id || '';
  
  // Google Forms system field patterns to skip
  const systemFieldPatterns = [
    /^gform_/,           // gform_gform_description, gform_gform_details, etc.
    /^fb_/,              // freebirdForm system fields
    /^entry\./,          // entry.xxxxx fields
    /^fvv-/,             // freebirdFormviewer fields
    /pageHistory/,       // page history tracking
    /timestamp/,         // timestamp fields
    /uuid/,              // UUID fields
    /draftResponse/,     // draft response fields
    /csrfToken/,         // CSRF tokens
    /sessionToken/       // session tokens
  ];
  
  // Check if field matches any system pattern
  for (const pattern of systemFieldPatterns) {
    if (pattern.test(name) || pattern.test(id)) {
      return false;
    }
  }
  
  // Check if element is visible
  if (!isElementVisible(element)) {
    return false;
  }
  
  // Check if element is disabled
  if (element.hasAttribute('disabled') || 
      (element as HTMLInputElement).disabled) {
    return false;
  }
  
  // Check if element is readonly (for inputs)
  if ((element as HTMLInputElement).readOnly) {
    return false;
  }
  
  // Additional checks for Google Forms specific hidden elements
  const classList = element.classList;
  const hiddenClasses = [
    'freebirdFormviewerViewItemsHidden',
    'hidden',
    'invisible',
    'sr-only', // screen reader only
    'visually-hidden',
    'freebirdFormviewerViewItemsHidden',
    'exportHidden'
  ];
  
  for (const hiddenClass of hiddenClasses) {
    if (classList.contains(hiddenClass)) {
      return false;
    }
  }
  
  // Check if element has zero dimensions (hidden via CSS)
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }
  
  // Check if parent containers are hidden
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') {
      return false;
    }
    parent = parent.parentElement;
  }
  
  return true;
};

// Function to detect and log all form fields on the page
const detectFormFields = () => {
  console.log('Detecting form fields on the page...');
  
  const formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }> = {};
  
  // Special handling for Google Forms
  const isGoogleForm = window.location.hostname.includes('docs.google.com') && 
                       window.location.pathname.includes('/forms/');
  
  if (isGoogleForm) {
    console.log('Google Form detected - using specialized detection');
    detectGoogleFormFields(formFields);
  } else {
    // Standard form field detection for regular websites
    detectStandardFormFields(formFields);
  }
  
  // Store detected fields globally
  detectedFormFields = formFields;
  
  return formFields;
};

// Detect fields in standard HTML forms
const detectStandardFormFields = (formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>) => {
  // Find all input, select, and textarea elements
  const inputElements = document.querySelectorAll('input, select, textarea');
  
  inputElements.forEach((element, index) => {
    const inputElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const name = inputElement.name || '';
    const id = inputElement.id || '';
    let type = inputElement.tagName.toLowerCase();
    
    // For input elements, get the specific type
    if (type === 'input') {
      type = (inputElement as HTMLInputElement).type;
    }
    
    // Filter out invalid fields (hidden, invisible, disabled, etc.)
    if (!isValidFormField(inputElement, type)) {
      return;
    }
    
    // Use name or id as the identifier, fall back to index if neither exists
    const fieldId = name || id || `field_${index}`;
    
    formFields[fieldId] = {
      element: inputElement,
      type,
      name,
      id
    };
    
    console.log(`Detected visible field: ${fieldId}`, {
      type,
      name,
      id,
      value: inputElement.value,
    });
  });
};

// Specialized detection for Google Forms - focused on actual interactive elements
const detectGoogleFormFields = (formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>) => {
  console.log('🔍 Running enhanced Google Forms field detection');
  
  // Clear the detected elements set for fresh detection
  detectedElements.clear();
  
  // Step 1: Find all form questions first to understand the structure
  const questions = findAllFormQuestions();
  console.log(`📋 Found ${questions.length} form questions`);
  
  // Step 2: For each question, find its associated interactive element
  questions.forEach((questionData, index) => {
    detectFieldsForQuestion(questionData, index, formFields);
  });
  
  console.log(`🎯 Total unique fields detected: ${Object.keys(formFields).length}`);
};

// Find all form questions on the page
const findAllFormQuestions = (): Array<{ element: HTMLElement, questionText: string }> => {
  const questions: Array<{ element: HTMLElement, questionText: string }> = [];
  
  // Google Forms question container selectors (ordered by reliability)
  const questionContainerSelectors = [
    '[role="listitem"]', // Most reliable for Google Forms
    '.freebirdFormviewerViewItemsItemItem',
    '[data-params*="question"]'
  ];
  
  for (const selector of questionContainerSelectors) {
    const questionContainers = document.querySelectorAll(selector);
    
    if (questionContainers.length > 0) {
      console.log(`📋 Using question container selector: ${selector} (${questionContainers.length} questions)`);
      
      questionContainers.forEach(container => {
        const questionText = extractQuestionText(container as HTMLElement);
        if (questionText && questionText.length > 2) {
          questions.push({
            element: container as HTMLElement,
            questionText: questionText
          });
        }
      });
      
      break; // Use the first selector that works
    }
  }
  
  return questions;
};

// Extract question text from a container element
const extractQuestionText = (container: HTMLElement): string => {
  const titleSelectors = [
    '.freebirdFormviewerComponentsQuestionBaseTitle',
    '.freebirdFormviewerComponentsQuestionBaseHeader',
    '[role="heading"]',
    '.Xb9hP',
    'h1', 'h2', 'h3', 'h4'
  ];
  
  for (const selector of titleSelectors) {
    const titleElement = container.querySelector(selector);
    if (titleElement) {
      const text = titleElement.textContent?.trim();
      if (text && text.length > 0) {
        return text;
      }
    }
  }
  
  return '';
};

// Detect interactive fields for a specific question
const detectFieldsForQuestion = (
  questionData: { element: HTMLElement, questionText: string }, 
  index: number,
  formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>
) => {
  const { element: questionContainer, questionText } = questionData;
  console.log(`🔍 Processing question ${index}: "${questionText}"`);
  
  // Priority order for field detection within each question
  const fieldDetectionStrategies = [
    () => detectDropdownInQuestion(questionContainer, questionText, index, formFields),
    () => detectDateFieldInQuestion(questionContainer, questionText, index, formFields),
    () => detectTextareaInQuestion(questionContainer, questionText, index, formFields),
    () => detectTextInputInQuestion(questionContainer, questionText, index, formFields),
    () => detectRadioInQuestion(questionContainer, questionText, index, formFields),
    () => detectCheckboxInQuestion(questionContainer, questionText, index, formFields)
  ];
  
  // Try each detection strategy until one succeeds
  let fieldDetected = false;
  for (const strategy of fieldDetectionStrategies) {
    if (strategy()) {
      fieldDetected = true;
      break; // Found a field, move to next question
    }
  }
  
  // If no strategy worked, log debugging info
  if (!fieldDetected) {
    console.log(`❌ No field detected for question: "${questionText}"`);
    console.log(`   Container HTML:`, questionContainer.outerHTML.substring(0, 200) + '...');
    
    // Debug: Check what elements are actually in this container
    const dropdowns = questionContainer.querySelectorAll('[role="listbox"], [aria-haspopup="listbox"], div[tabindex="0"][role="button"]');
    const radios = questionContainer.querySelectorAll('input[type="radio"]');
    const inputs = questionContainer.querySelectorAll('input');
    const textareas = questionContainer.querySelectorAll('textarea');
    
    console.log(`   Debug elements found:`);
    console.log(`     - Dropdowns: ${dropdowns.length}`);
    console.log(`     - Radio buttons: ${radios.length}`);
    console.log(`     - All inputs: ${inputs.length}`);
    console.log(`     - Textareas: ${textareas.length}`);
    
    if (inputs.length > 0) {
      inputs.forEach((input, i) => {
        console.log(`     - Input ${i}: type="${(input as HTMLInputElement).type}", name="${(input as HTMLInputElement).name}"`);
      });
    }
  }
};

// Detect dropdown field within a question container
const detectDropdownInQuestion = (
  container: HTMLElement, 
  questionText: string, 
  index: number,
  formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>
): boolean => {
  const dropdownSelectors = [
    '[role="listbox"]',
    '[aria-haspopup="listbox"]',
    '.freebirdFormviewerComponentsQuestionSelectRoot',
    '.quantumWizMenuPaperselectDropDown',
    '[role="button"][aria-haspopup="listbox"]',
    'div[tabindex="0"][role="button"]'
  ];
  
  for (const selector of dropdownSelectors) {
    const dropdown = container.querySelector(selector) as HTMLElement;
    if (dropdown && !detectedElements.has(dropdown) && isValidFormField(dropdown, 'select')) {
      const fieldId = `dropdown_${index}_${createSafeId(questionText)}`;
      
      formFields[fieldId] = {
        element: dropdown,
        type: 'dropdown',
        name: questionText,
        id: fieldId
      };
      
      detectedElements.add(dropdown);
      console.log(`✅ Added dropdown: "${questionText}"`);
      return true;
    }
  }
  
  return false;
};

// Detect date field within a question container
const detectDateFieldInQuestion = (
  container: HTMLElement, 
  questionText: string, 
  index: number,
  formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>
): boolean => {
  const dateSelectors = [
    'input[type="date"]',
    'input[type="datetime-local"]',
    '.freebirdFormviewerComponentsQuestionDateDate input'
  ];
  
  for (const selector of dateSelectors) {
    const dateField = container.querySelector(selector) as HTMLInputElement;
    if (dateField && !detectedElements.has(dateField) && isValidFormField(dateField, 'date')) {
      const fieldId = `date_${index}_${createSafeId(questionText)}`;
      
      formFields[fieldId] = {
        element: dateField,
        type: 'date',
        name: questionText,
        id: fieldId
      };
      
      detectedElements.add(dateField);
      console.log(`✅ Added date field: "${questionText}"`);
      return true;
    }
  }
  
  return false;
};

// Detect textarea within a question container
const detectTextareaInQuestion = (
  container: HTMLElement, 
  questionText: string, 
  index: number,
  formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>
): boolean => {
  const textareaSelectors = [
    'textarea',
    '.freebirdFormviewerComponentsQuestionTextLongText textarea',
    '.exportTextarea textarea'
  ];
  
  for (const selector of textareaSelectors) {
    const textarea = container.querySelector(selector) as HTMLTextAreaElement;
    if (textarea && !detectedElements.has(textarea) && isValidFormField(textarea, 'textarea')) {
      const fieldId = `textarea_${index}_${createSafeId(questionText)}`;
      
      // Determine if it's a GitHub field or regular textarea
      let fieldType = 'textarea';
      if (questionText.toLowerCase().includes('github') || 
          questionText.toLowerCase().includes('url') ||
          questionText.toLowerCase().includes('link')) {
        fieldType = 'url';
      }
      
      formFields[fieldId] = {
        element: textarea,
        type: fieldType,
        name: questionText,
        id: fieldId
      };
      
      detectedElements.add(textarea);
      console.log(`✅ Added textarea: "${questionText}" (type: ${fieldType})`);
      return true;
    }
  }
  
  return false;
};

// Detect text input within a question container
const detectTextInputInQuestion = (
  container: HTMLElement, 
  questionText: string, 
  index: number,
  formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>
): boolean => {
  const textInputSelectors = [
    'input[type="text"]',
    'input[type="email"]',
    'input[type="url"]',
    'input[type="tel"]',
    'input[type="number"]',
    '.freebirdFormviewerComponentsQuestionTextShortText input',
    '.quantumWizTextinputPapertextinput input'
  ];
  
  for (const selector of textInputSelectors) {
    const textInput = container.querySelector(selector) as HTMLInputElement;
    if (textInput && !detectedElements.has(textInput) && isValidFormField(textInput, textInput.type || 'text')) {
      const fieldId = `text_${index}_${createSafeId(questionText)}`;
      
      // Determine field type based on context and input type
      let fieldType = textInput.type || 'text';
      if (questionText.toLowerCase().includes('github') || 
          questionText.toLowerCase().includes('url') ||
          questionText.toLowerCase().includes('link')) {
        fieldType = 'url';
      } else if (questionText.toLowerCase().includes('email')) {
        fieldType = 'email';
      }
      
      formFields[fieldId] = {
        element: textInput,
        type: fieldType,
        name: questionText,
        id: fieldId
      };
      
      detectedElements.add(textInput);
      console.log(`✅ Added text input: "${questionText}" (type: ${fieldType})`);
      return true;
    }
  }
  
  return false;
};

// Detect radio buttons within a question container
const detectRadioInQuestion = (
  container: HTMLElement, 
  questionText: string, 
  index: number,
  formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>
): boolean => {
  console.log(`🔘 Attempting radio detection for: "${questionText}"`);
  
  // Enhanced selectors for Google Forms radio buttons
  const radioSelectors = [
    'input[type="radio"]',
    '[role="radio"]',
    '[role="radiogroup"]',
    '.freebirdFormviewerComponentsQuestionRadioRoot',
    '.quantumWizTogglepaperradioEl',
    '[data-params*="radio"]',
    '[jsmodel*="radio" i]'
  ];
  
  // First try direct radio input detection
  const radioInputs = container.querySelectorAll('input[type="radio"]');
  
  if (radioInputs.length > 0) {
    const fieldId = `radio_${index}_${createSafeId(questionText)}`;
    
    formFields[fieldId] = {
      element: container,
      type: 'radio',
      name: questionText,
      id: fieldId
    };
    
    console.log(`✅ Added radio group: "${questionText}" (${radioInputs.length} options)`);
    return true;
  }
  
  // Try alternative selectors for Google Forms
  for (const selector of radioSelectors) {
    const radioElements = container.querySelectorAll(selector);
    if (radioElements.length > 0) {
      console.log(`🔘 Found radio elements with selector "${selector}": ${radioElements.length}`);
      
      const fieldId = `radio_${index}_${createSafeId(questionText)}`;
      
      formFields[fieldId] = {
        element: container,
        type: 'radio',
        name: questionText,
        id: fieldId
      };
      
      console.log(`✅ Added radio group (alternative): "${questionText}" (${radioElements.length} elements)`);
      return true;
    }
  }
  
  // Check if this might be a radio-like question based on the HTML structure
  const hasRadioLikeStructure = (
    container.innerHTML.includes('data-params') && 
    container.innerHTML.includes('[') && 
    container.innerHTML.includes('"0.25"') || 
    container.innerHTML.includes('"0.5"') ||
    container.innerHTML.includes('"1"')
  );
  
  if (hasRadioLikeStructure) {
    console.log(`🔘 Detected radio-like structure in HTML for: "${questionText}"`);
    
    // Look for clickable elements that might be radio options
    const clickableElements = container.querySelectorAll(
      '[role="button"], [tabindex="0"], .freebirdFormviewerComponentsQuestionRadioChoice, [data-value]'
    );
    
    if (clickableElements.length > 0) {
      const fieldId = `radio_${index}_${createSafeId(questionText)}`;
      
      formFields[fieldId] = {
        element: container,
        type: 'radio',
        name: questionText,
        id: fieldId
      };
      
      console.log(`✅ Added radio group (structure-based): "${questionText}" (${clickableElements.length} clickable elements)`);
      return true;
    }
  }
  
  console.log(`❌ No radio elements found for: "${questionText}"`);
  return false;
};

// Detect checkboxes within a question container
const detectCheckboxInQuestion = (
  container: HTMLElement, 
  questionText: string, 
  index: number,
  formFields: Record<string, { element: HTMLElement, type: string, name: string, id: string }>
): boolean => {
  const checkboxInputs = container.querySelectorAll('input[type="checkbox"]');
  
  if (checkboxInputs.length > 0) {
    const fieldId = `checkbox_${index}_${createSafeId(questionText)}`;
    
    formFields[fieldId] = {
      element: container,
      type: 'checkbox',
      name: questionText,
      id: fieldId
    };
    
    console.log(`✅ Added checkbox group: "${questionText}" (${checkboxInputs.length} options)`);
    return true;
  }
  
  return false;
};

// Helper function to create a safe ID from question text
const createSafeId = (questionText: string): string => {
  return questionText
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
};

// Function to autofill form fields with provided values
const autofillFormFields = async (fields: Record<string, string>) => {
  console.log('Autofilling form with data:', fields);
  console.log('Available detected fields:', Object.keys(detectedFormFields));
  
  const isGoogleForm = window.location.hostname.includes('docs.google.com') && 
                       window.location.pathname.includes('/forms/');
  
  if (isGoogleForm) {
    await autofillGoogleForm(fields);
    return;
  }
  
  // Standard form field autofill
  for (const [selector, value] of Object.entries(fields)) {
    // Try to find element by name, id, or as a fallback, class
    const element = 
      document.querySelector(`[name="${selector}"]`) || 
      document.getElementById(selector) ||
      document.querySelector(`.${selector}`);
    
    if (element && (element instanceof HTMLInputElement || 
                    element instanceof HTMLSelectElement || 
                    element instanceof HTMLTextAreaElement)) {
      // Set the value
      element.value = value;
      console.log(`Filled field ${selector} with value: ${value}`);
      
      // Dispatch input event to trigger any listeners
      const event = new Event('input', { bubbles: true });
      element.dispatchEvent(event);
      
      // For select elements, also dispatch change event
      if (element instanceof HTMLSelectElement) {
        const changeEvent = new Event('change', { bubbles: true });
        element.dispatchEvent(changeEvent);
      }
    } else {
      console.warn(`Field ${selector} not found in form`);
    }
  }
};

// Improved function to autofill Google Forms
const autofillGoogleForm = async (fields: Record<string, string>) => {
  console.log('🎯 Autofilling Google Form with enhanced tracking');
  console.log('Fields to fill:', fields);
  console.log('Detected form fields:', detectedFormFields);
  
  // Clear previous tracking data for this form fill session
  fieldFillTracker.clear();
  
  let fieldsProcessed = 0;
  let fieldsSuccessful = 0;
  
  // First, try exact field ID matching
  for (const [fieldKey, value] of Object.entries(fields)) {
    if (!value.trim()) continue;
    
    console.log(`🎯 Trying to fill field: ${fieldKey} with value: ${value}`);
    fieldsProcessed++;
    
    // Try exact match first
    if (detectedFormFields[fieldKey]) {
      const fieldInfo = detectedFormFields[fieldKey];
      console.log(`✅ Found exact match for ${fieldKey}:`, fieldInfo);
      
      try {
        const success = await fillGoogleFormField(fieldInfo, value);
        if (success) {
          fieldsSuccessful++;
          console.log(`✅ Successfully filled ${fieldKey} with exact match`);
          continue;
        }
      } catch (error) {
        console.error(`❌ Error filling ${fieldKey}:`, error);
      }
    }
    
    // Try fuzzy matching if exact match fails
    let filled = false;
    for (const [detectedId, fieldInfo] of Object.entries(detectedFormFields)) {
      // Check if the field key matches the question name or detected ID
      const questionName = fieldInfo.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const fieldKeyLower = fieldKey.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      
      if (detectedId.includes(fieldKeyLower) || 
          questionName.includes(fieldKeyLower) ||
          fieldKeyLower.includes(questionName)) {
        
        console.log(`🔍 Found fuzzy match: ${fieldKey} -> ${detectedId} (${fieldInfo.name})`);
        
        try {
          const success = await fillGoogleFormField(fieldInfo, value);
          if (success) {
            fieldsSuccessful++;
            console.log(`✅ Successfully filled ${fieldKey} with fuzzy match`);
            filled = true;
            break;
          }
        } catch (error) {
          console.error(`❌ Error filling ${fieldKey} with fuzzy match:`, error);
        }
      }
    }
    
    if (!filled) {
      console.warn(`⚠️ Could not fill field: ${fieldKey}`);
      // Track failed field
      trackFieldFill(fieldKey, fieldKey, 'unknown', false, value, 0, 'No matching field found');
    }
    
    // Add delay between fields for better stability
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`🎯 Autofill completed: ${fieldsSuccessful}/${fieldsProcessed} fields successful`);
  
  // Log detailed statistics
  logFieldFillStats();
};

// Enhanced helper function to fill a specific Google Form field
const fillGoogleFormField = async (fieldInfo: { element: HTMLElement, type: string, name: string, id: string }, value: string, maxAttempts: number = 3): Promise<boolean> => {
  console.log(`🔧 Filling field: "${fieldInfo.name}" (${fieldInfo.type}) with value: "${value}"`);
  console.log('🔧 Field element details:', {
    tagName: fieldInfo.element.tagName,
    className: fieldInfo.element.className,
    id: fieldInfo.element.id,
    type: (fieldInfo.element as HTMLInputElement).type,
    name: (fieldInfo.element as HTMLInputElement).name
  });
  
  let success = false;
  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const element = fieldInfo.element;
      const attemptLog = maxAttempts > 1 ? ` (attempt ${attempt}/${maxAttempts})` : '';
      console.log(`🔧 Processing${attemptLog}: "${fieldInfo.name}" (${fieldInfo.type})`);
      
      switch (fieldInfo.type) {
        case 'text':
        case 'email':
        case 'url':
        case 'tel':
        case 'number':
          console.log(`📝 Filling text-based field: ${fieldInfo.type}${attemptLog}`);
          success = fillTextInput(element, value);
          break;
        
        case 'textarea':
          console.log(`📝 Filling textarea field${attemptLog}`);
          success = fillTextInput(element, value);
          break;
        
        case 'date':
          console.log(`📅 Filling date field${attemptLog}`);
          success = fillDateField(element, value);
          break;
        
        case 'dropdown':
          console.log(`🔽 Filling dropdown field${attemptLog}`);
          success = await fillDropdownFieldWithRetry(element, value, attempt);
          break;
        
        case 'radio':
          console.log(`📻 Filling radio field${attemptLog}`);
          success = fillRadioField(element, value);
          break;
        
        case 'checkbox':
          console.log(`☑️ Filling checkbox field${attemptLog}`);
          success = fillCheckboxField(element, value);
          break;
        
        default:
          console.warn(`⚠️ Unknown field type: ${fieldInfo.type}, trying text input as fallback${attemptLog}`);
          success = fillTextInput(element, value);
          break;
      }
      
      if (success) {
        trackFieldFill(fieldInfo.id, fieldInfo.name, fieldInfo.type, true, value, attempt);
        console.log(`✅ Successfully filled "${fieldInfo.name}" on attempt ${attempt}`);
        return true;
      } else {
        lastError = `Field filling returned false`;
        console.log(`❌ Attempt ${attempt} failed for "${fieldInfo.name}"`);
        
        // Wait before retry (progressive delay)
        if (attempt < maxAttempts) {
          const delay = attempt * 500; // 500ms, 1000ms, 1500ms...
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error on attempt ${attempt} for field "${fieldInfo.name}" (${fieldInfo.id}):`, error);
      
      // Wait before retry
      if (attempt < maxAttempts) {
        const delay = attempt * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All attempts failed
  trackFieldFill(fieldInfo.id, fieldInfo.name, fieldInfo.type, false, value, maxAttempts, lastError);
  
  // Final fallback: try text input regardless of detected type
  console.log('🔄 Attempting final fallback text input filling...');
  try {
    const fallbackSuccess = fillTextInput(fieldInfo.element, value);
    if (fallbackSuccess) {
      trackFieldFill(fieldInfo.id, fieldInfo.name, fieldInfo.type, true, value, maxAttempts + 1, 'Succeeded with fallback');
      console.log(`✅ Fallback succeeded for "${fieldInfo.name}"`);
      return true;
    }
  } catch (fallbackError) {
    console.error('❌ Fallback also failed:', fallbackError);
  }
  
  console.error(`❌ All attempts failed for "${fieldInfo.name}" after ${maxAttempts} attempts`);
  return false;
};

// Enhanced dropdown filling with retry logic
const fillDropdownFieldWithRetry = async (element: HTMLElement, value: string, attempt: number): Promise<boolean> => {
  console.log(`🔽 Dropdown fill attempt ${attempt} for value: "${value}"`);
  
  // Progressive timeout - longer waits for later attempts
  const baseTimeout = 1000;
  const timeout = baseTimeout + (attempt - 1) * 500; // 1000ms, 1500ms, 2000ms...
  
  return fillDropdownField(element, value, timeout);
};

// Fill text input fields
const fillTextInput = (element: HTMLElement, value: string): boolean => {
  console.log(`📝 Attempting to fill text field with value: "${value}"`);
  console.log('📝 Element details:', {
    tagName: element.tagName,
    type: (element as HTMLInputElement).type,
    className: element.className,
    id: element.id,
    name: (element as HTMLInputElement).name
  });

  // Strategy 1: Direct input element
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    console.log('📝 Strategy 1: Direct element filling');
    return fillDirectInputElement(element, value);
  }
  
  // Strategy 2: Look for input/textarea within the container
  const inputSelectors = [
    'input[type="text"]',
    'input[type="email"]',
    'input[type="url"]',
    'input[type="number"]',
    'textarea',
    // Google Forms specific selectors
    '.freebirdFormviewerComponentsQuestionTextShortText input',
    '.freebirdFormviewerComponentsQuestionTextLongText textarea',
    '.quantumWizTextinputPapertextinput input',
    '.quantumWizTextinputPaperinputInput',
    '[data-initial-value]'
  ];
  
  for (const selector of inputSelectors) {
    const inputElement = element.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    if (inputElement && isElementVisible(inputElement)) {
      console.log(`📝 Strategy 2: Found input using selector: ${selector}`);
      return fillDirectInputElement(inputElement, value);
    }
  }
  
  // Strategy 3: Look for Google Forms specific structures
  console.log('📝 Strategy 3: Google Forms specific structure');
  const googleFormsInput = element.querySelector('[role="textbox"], [contenteditable="true"]') as HTMLElement;
  if (googleFormsInput) {
    console.log('📝 Found Google Forms textbox or contenteditable element');
    return fillContentEditableElement(googleFormsInput, value);
  }
  
  console.log('❌ No suitable input element found');
  return false;
};

// Helper function to fill direct input/textarea elements
const fillDirectInputElement = (element: HTMLInputElement | HTMLTextAreaElement, value: string): boolean => {
  try {
    console.log(`📝 Filling direct element: ${element.tagName}`);
    
    // Step 1: Focus the element
    element.focus();
    
    // Step 2: Clear existing value (multiple methods)
    element.value = '';
    element.textContent = '';
    
    // Step 3: Set the new value
    element.value = value;
    
    // Step 4: Simulate typing for better Google Forms compatibility
    // This helps trigger validation and dynamic form behaviors
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      element.dispatchEvent(new KeyboardEvent('keydown', { 
        key: char, 
        bubbles: true, 
        cancelable: true 
      }));
      element.dispatchEvent(new KeyboardEvent('keypress', { 
        key: char, 
        bubbles: true, 
        cancelable: true 
      }));
      element.dispatchEvent(new KeyboardEvent('keyup', { 
        key: char, 
        bubbles: true, 
        cancelable: true 
      }));
    }
    
    // Step 5: Dispatch essential events for Google Forms
    const events = [
      { type: 'input', options: { bubbles: true, cancelable: true } },
      { type: 'change', options: { bubbles: true, cancelable: true } },
      { type: 'blur', options: { bubbles: true, cancelable: true } },
      { type: 'focusout', options: { bubbles: true, cancelable: true } }
    ];
    
    events.forEach(({ type, options }) => {
      element.dispatchEvent(new Event(type, options));
    });
    
    // Step 6: Special handling for textareas
    if (element instanceof HTMLTextAreaElement) {
      // Dispatch additional events that Google Forms might listen for
      element.dispatchEvent(new Event('paste', { bubbles: true }));
      element.dispatchEvent(new InputEvent('input', { 
        bubbles: true, 
        data: value,
        inputType: 'insertText'
      }));
    }
    
    // Step 7: Update any hidden inputs that might be associated
    const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
    hiddenInputs.forEach(input => {
      const hiddenInput = input as HTMLInputElement;
      if (hiddenInput.name && hiddenInput.name.includes('entry')) {
        // Google Forms often use entry.xxx.xxx naming convention
        const elementName = element.name || element.id;
        if (elementName && hiddenInput.name.includes(elementName)) {
          hiddenInput.value = value;
          console.log(`📝 Updated associated hidden input: ${hiddenInput.name}`);
        }
      }
    });
    
    console.log(`✅ Successfully filled text field with: "${value}"`);
    return true;
  } catch (error) {
    console.error('❌ Error filling text field:', error);
    return false;
  }
};

// Helper function to fill contenteditable elements
const fillContentEditableElement = (element: HTMLElement, value: string): boolean => {
  try {
    console.log('📝 Filling contenteditable element');
    
    // Focus the element
    element.focus();
    
    // Clear existing content
    element.textContent = '';
    element.innerHTML = '';
    
    // Set new content
    element.textContent = value;
    element.innerHTML = value;
    
    // Dispatch events for contenteditable elements
    const events = [
      'input',
      'change', 
      'blur',
      'keyup',
      'paste'
    ];
    
    events.forEach(eventType => {
      element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
    });
    
    // Also dispatch input event with inputType for modern browsers
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      data: value,
      inputType: 'insertText'
    }));
    
    console.log(`✅ Successfully filled contenteditable element with: "${value}"`);
    return true;
  } catch (error) {
    console.error('❌ Error filling contenteditable element:', error);
    return false;
  }
};

// Enhanced date field filling
const fillDateField = (element: HTMLElement, value: string): boolean => {
  console.log('Attempting to fill date field:', element, 'with value:', value);
  
  // Try to parse and format the date value
  let formattedDate = value;
  
  // If the value looks like a date, try to format it properly
  if (value.includes('/') || value.includes('-') || value.includes('.')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        // Format as YYYY-MM-DD for HTML date inputs
        formattedDate = date.toISOString().split('T')[0];
      }
    } catch (e) {
      console.log('Could not parse date, using original value');
    }
  }
  
  // Try different approaches for date fields
  
  // 1. Direct input field
  if (element instanceof HTMLInputElement) {
    element.focus();
    element.value = formattedDate;
    
    const events = ['input', 'change', 'blur'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });
    
    console.log(`Filled date input with: ${formattedDate}`);
    return true;
  }
  
  // 2. Look for date inputs within the container
  const dateInputs = element.querySelectorAll('input[type="date"], input[type="text"]');
  if (dateInputs.length > 0) {
    for (const input of Array.from(dateInputs)) {
      const inputElement = input as HTMLInputElement;
      inputElement.focus();
      inputElement.value = formattedDate;
      
      const events = ['input', 'change', 'blur'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true, cancelable: true });
        inputElement.dispatchEvent(event);
      });
    }
    console.log(`Filled date container inputs with: ${formattedDate}`);
    return true;
  }
  
  // 3. Try to find and fill separate day/month/year inputs
  const dayInput = element.querySelector('input[aria-label*="Day" i], input[placeholder*="day" i]') as HTMLInputElement;
  const monthInput = element.querySelector('input[aria-label*="Month" i], input[placeholder*="month" i]') as HTMLInputElement;
  const yearInput = element.querySelector('input[aria-label*="Year" i], input[placeholder*="year" i]') as HTMLInputElement;
  
  if (dayInput || monthInput || yearInput) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        if (dayInput) {
          dayInput.value = date.getDate().toString();
          dayInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (monthInput) {
          monthInput.value = (date.getMonth() + 1).toString();
          monthInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (yearInput) {
          yearInput.value = date.getFullYear().toString();
          yearInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        console.log(`Filled separate date inputs for: ${value}`);
        return true;
      }
    } catch (e) {
      console.log('Could not parse date for separate inputs');
    }
  }
  
  return false;
};

// Enhanced dropdown field filling with better closing logic
const fillDropdownField = async (element: HTMLElement, value: string, timeout: number = 1000): Promise<boolean> => {
  console.log('🔽 Attempting to fill dropdown field:', element, 'with value:', value);
  console.log('Dropdown element details:', {
    tagName: element.tagName,
    className: element.className,
    role: element.getAttribute('role'),
    ariaExpanded: element.getAttribute('aria-expanded'),
    ariaHaspopup: element.getAttribute('aria-haspopup'),
    id: element.id,
    name: (element as HTMLInputElement).name
  });
  
  // Strategy 1: Try multiple ways to open the dropdown
  console.log('🔽 Step 1: Opening dropdown...');
  
  // Method 1: Direct click and focus
  element.click();
  element.focus();
  
  // Method 2: Try clicking clickable parent elements with enhanced selectors
  const clickableParentSelectors = [
    '[role="button"]',
    '.freebirdFormviewerComponentsQuestionSelectRoot',
    '.quantumWizMenuPaperselectDropDown',
    '.freebirdFormviewerComponentsQuestionSelectPlaceholder',
    '.exportSelectPopup',
    '[aria-haspopup="listbox"]',
    '[aria-haspopup="menu"]',
    '.freebirdFormviewerComponentsQuestionDropdownRoot'
  ];
  
  for (const selector of clickableParentSelectors) {
    const clickableParent = element.closest(selector);
    if (clickableParent && clickableParent !== element) {
      console.log(`🔽 Clicking parent element (${selector}):`, clickableParent);
      (clickableParent as HTMLElement).click();
      (clickableParent as HTMLElement).focus();
      break;
    }
  }
  
  // Method 3: Try clicking child elements that might be the actual trigger
  const clickableChildSelectors = [
    '[role="button"]',
    '.quantumWizMenuPaperselectOption', 
    'div[aria-expanded]',
    '.freebirdFormviewerComponentsQuestionSelectPlaceholder',
    '[data-value]',
    '.exportSelectPopupOption'
  ];
  
  for (const selector of clickableChildSelectors) {
    const clickableChild = element.querySelector(selector) as HTMLElement;
    if (clickableChild) {
      console.log(`🔽 Found clickable child (${selector}), clicking:`, clickableChild);
      clickableChild.click();
      clickableChild.focus();
      break;
    }
  }
  
  // Method 4: Enhanced mouse event sequence
  const mouseEvents = [
    { type: 'mousedown', options: { bubbles: true, cancelable: true } },
    { type: 'mouseup', options: { bubbles: true, cancelable: true } },
    { type: 'click', options: { bubbles: true, cancelable: true } },
    { type: 'focus', options: { bubbles: true } }
  ];
  
  for (const { type, options } of mouseEvents) {
    if (type === 'focus') {
      element.focus();
    } else {
      element.dispatchEvent(new MouseEvent(type, options));
    }
  }
  
  // Method 5: Try keyboard events to open dropdown
  const keyboardEvents = [
    { key: 'Enter', code: 'Enter' },
    { key: 'ArrowDown', code: 'ArrowDown' },
    { key: ' ', code: 'Space' }
  ];
  
  for (const { key, code } of keyboardEvents) {
    element.dispatchEvent(new KeyboardEvent('keydown', { 
      key, 
      code, 
      bubbles: true, 
      cancelable: true 
    }));
  }
  
  // Wait for dropdown to open and then look for options
  return new Promise<boolean>((resolve) => {
    setTimeout(async () => {
      console.log('🔽 Step 2: Looking for dropdown options...');
      
      // Enhanced option detection with more comprehensive selectors
      const optionSelectors = [
        '[role="option"]',
        '.quantumWizMenuPaperselectOption',
        '.freebirdFormviewerComponentsQuestionSelectOption',
        '.freebirdFormviewerComponentsQuestionSelectMenuOption',
        '.freebirdFormviewerComponentsQuestionDropdownMenuOption',
        'li[data-value]',
        '.option',
        '[data-value]',
        '.exportSelectPopupOption',
        'div[role="menuitem"]',
        '.quantumMenuSelectOption',
        '.freebirdMenuSelectOption',
        '.quantumWizMenuItemListItem',
        '.freebirdFormviewerViewItemsItemGrading',
        '[aria-selected]',
        '.quantumMenuSelectMenuItem',
        '.freebirdFormviewerComponentsQuestionSelectOptGroupOption',
        // Additional selectors for Google Forms dropdown options
        '.quantumWizMenuPaperselectOptionList div',
        '.freebirdFormviewerComponentsQuestionSelectMenu div',
        'div[jsaction*="click"]',
        'span[jsaction*="click"]'
      ];
      
      let options: NodeListOf<Element> | null = null;
      let foundSelector = '';
      
      // First, try to find options with each selector
      for (const selector of optionSelectors) {
        options = document.querySelectorAll(selector);
        // Filter out options that aren't visible or don't contain text
        const visibleOptions = Array.from(options).filter(option => {
          const element = option as HTMLElement;
          const text = element.textContent?.trim();
          const isVisible = isElementVisible(element);
          return text && text.length > 0 && isVisible;
        });
        
        if (visibleOptions.length > 0) {
          options = document.querySelectorAll(selector); // Keep original NodeList
          foundSelector = selector;
          console.log(`🔽 Found ${visibleOptions.length} visible dropdown options using selector: ${selector}`);
          console.log('🔽 Visible options:', visibleOptions.map(opt => opt.textContent?.trim()));
          break;
        } else if (options.length > 0) {
          console.log(`🔽 Found ${options.length} options with selector "${selector}" but none are visible`);
        }
      }
      
      // If no options found with standard selectors, try a more aggressive search
      if (!options || options.length === 0) {
        console.log('🔽 No options found with standard selectors, trying aggressive search...');
        
        // Look for any div/span elements that might be options in dropdown containers
        const containerSelectors = [
          '.quantumWizMenuPaperselectMenu',
          '.freebirdFormviewerComponentsQuestionSelectMenu',
          '[role="listbox"]',
          '[role="menu"]'
        ];
        
        for (const containerSelector of containerSelectors) {
          const containers = document.querySelectorAll(containerSelector);
          for (const container of containers) {
            const potentialOptions = container.querySelectorAll('div, span, li');
            const textOptions = Array.from(potentialOptions).filter(el => {
              const text = el.textContent?.trim();
              const element = el as HTMLElement;
              return text && text.length > 0 && isElementVisible(element) && 
                     text !== 'Choose' && !text.includes('dropdown');
            });
            
            if (textOptions.length > 0) {
              options = container.querySelectorAll('div, span, li');
              foundSelector = `${containerSelector} div/span/li`;
              console.log(`🔽 Found ${textOptions.length} potential options in container: ${containerSelector}`);
              console.log('🔽 Container options:', textOptions.map(opt => opt.textContent?.trim()));
              break;
            }
          }
          if (options && options.length > 0) break;
        }
      }
      
      if (options && options.length > 0) {
        console.log('🔽 Step 3: Matching options...');
        
        // Filter and log all available options
        const availableOptions = Array.from(options).filter(opt => {
          const element = opt as HTMLElement;
          const text = element.textContent?.trim();
          return text && text.length > 0 && isElementVisible(element);
        });
        
        console.log('Available options:', availableOptions.map((opt, idx) => ({
          index: idx,
          text: opt.textContent?.trim(),
          value: opt.getAttribute('data-value'),
          ariaLabel: opt.getAttribute('aria-label'),
          className: opt.className,
          visible: isElementVisible(opt as HTMLElement)
        })));
        
        if (availableOptions.length === 0) {
          console.log('❌ No visible options found');
          await closeDropdown(element);
          resolve(false);
          return;
        }
        
        // Enhanced name matching logic
        const matchingOption = findBestNameMatch(availableOptions, value);
        
        if (matchingOption) {
          console.log(`🔽 Found best match for "${value}":`, {
            text: matchingOption.text,
            score: matchingOption.score,
            element: matchingOption.element,
            elementDetails: {
              tagName: (matchingOption.element as HTMLElement).tagName,
              className: (matchingOption.element as HTMLElement).className,
              id: (matchingOption.element as HTMLElement).id
            }
          });
          
          // Try multiple selection strategies
          console.log('🔽 Attempting selection with multiple strategies...');
          
          // Strategy 1: Enhanced selection with proper closing
          let success = await selectDropdownOptionAndClose(matchingOption.element, element);
          
          if (!success) {
            // Strategy 2: Try direct click without complex logic
            console.log('🔽 Strategy 1 failed, trying direct click...');
            try {
              (matchingOption.element as HTMLElement).click();
              await new Promise(resolve => setTimeout(resolve, 200));
              success = true;
            } catch (error) {
              console.log('🔽 Direct click failed:', error);
            }
          }
          
          if (!success) {
            // Strategy 3: Try mouse events
            console.log('🔽 Strategy 2 failed, trying mouse events...');
            try {
              const optionEl = matchingOption.element as HTMLElement;
              optionEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              optionEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              optionEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 200));
              success = true;
            } catch (error) {
              console.log('🔽 Mouse events failed:', error);
            }
          }
          
          if (!success) {
            // Strategy 4: Try clicking parent elements
            console.log('🔽 Strategy 3 failed, trying parent element clicks...');
            const parentSelectors = ['[role="option"]', 'li', 'div'];
            for (const selector of parentSelectors) {
              const parent = (matchingOption.element as HTMLElement).closest(selector);
              if (parent && parent !== matchingOption.element) {
                try {
                  (parent as HTMLElement).click();
                  await new Promise(resolve => setTimeout(resolve, 200));
                  success = true;
                  console.log(`🔽 Successfully clicked parent: ${selector}`);
                  break;
                } catch (error) {
                  console.log(`🔽 Failed to click parent ${selector}:`, error);
                }
              }
            }
          }
          
          if (success) {
            console.log(`✅ Successfully selected: "${matchingOption.text}"`);
            await closeDropdown(element);
            resolve(true);
            return;
          } else {
            console.log(`❌ All selection strategies failed for: "${matchingOption.text}"`);
          }
        } else {
          console.log(`❌ No suitable match found for: "${value}"`);
          console.log('Available option texts:', availableOptions.map(opt => `"${opt.textContent?.trim()}"`));
        }
        
        // Close dropdown if no successful selection
        await closeDropdown(element);
        resolve(false);
      } else {
        console.log('🔽 Step 2b: No options found with role selectors, trying fallback strategies...');
        
        // Strategy 2: If no options found with role selectors, try looking for a select element
        const selectElement = element.querySelector('select') as HTMLSelectElement;
        if (selectElement) {
          console.log('🔽 Fallback to standard select element');
          const matchingOption = findBestSelectOptionMatch(selectElement, value);
          if (matchingOption) {
            selectElement.selectedIndex = matchingOption.index;
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
            selectElement.dispatchEvent(new Event('input', { bubbles: true }));
            console.log(`✅ Selected select option: "${matchingOption.text}"`);
            resolve(true);
            return;
          }
        }
        
        // Strategy 3: Try to find dropdown in the document (for cases where options are rendered elsewhere)
        console.log('🔽 Looking for options in the entire document...');
        const globalOptions = document.querySelectorAll('[role="option"]:not([style*="display: none"]), .quantumWizMenuPaperselectOption:not([style*="display: none"])');
        if (globalOptions.length > 0) {
          console.log(`🔽 Found ${globalOptions.length} global options`);
          console.log('Global options:', Array.from(globalOptions).map((opt, idx) => ({
            index: idx,
            text: opt.textContent?.trim(),
            value: opt.getAttribute('data-value'),
            visible: isElementVisible(opt as HTMLElement)
          })));
          
          const matchingOption = findBestNameMatch(Array.from(globalOptions), value);
          if (matchingOption) {
            console.log(`🔽 Found global match: "${matchingOption.text}"`);
            const success = await selectDropdownOptionAndClose(matchingOption.element, element);
            if (success) {
              console.log(`✅ Selected global option: "${matchingOption.text}"`);
              resolve(true);
              return;
            }
          }
        }
        
        console.log(`❌ Could not find matching option for: ${value}`);
        // Close dropdown if opened but no selection made
        await closeDropdown(element);
        resolve(false);
      }
    }, timeout);
  });
};

// Enhanced name matching function
const findBestNameMatch = (options: Element[], searchValue: string): { element: Element, text: string, score: number } | null => {
  console.log(`Searching for best name match for: "${searchValue}"`);
  
  const candidates: { element: Element, text: string, score: number }[] = [];
  const searchLower = searchValue.toLowerCase().trim();
  
  // Split search value into parts (for handling "First Last" names)
  const searchParts = searchLower.split(/\s+/).filter(part => part.length > 0);
  
  for (const option of options) {
    const optionText = option.textContent?.trim() || '';
    const optionValue = option.getAttribute('data-value') || '';
    const optionAriaLabel = option.getAttribute('aria-label') || '';
    
    if (!optionText && !optionValue && !optionAriaLabel) continue;
    
    // Calculate match score for each text source
    const textScore = calculateNameMatchScore(optionText, searchValue, searchParts);
    const valueScore = calculateNameMatchScore(optionValue, searchValue, searchParts);
    const ariaScore = calculateNameMatchScore(optionAriaLabel, searchValue, searchParts);
    
    const bestScore = Math.max(textScore, valueScore, ariaScore);
    
    if (bestScore > 0) {
      candidates.push({
        element: option,
        text: optionText || optionValue || optionAriaLabel,
        score: bestScore
      });
      
      console.log(`Option "${optionText}" scored: ${bestScore}`);
    }
  }
  
  if (candidates.length === 0) {
    console.log('No matching candidates found');
    return null;
  }
  
  // Sort by score (highest first) and return the best match
  candidates.sort((a, b) => b.score - a.score);
  
  console.log('Top candidates:', candidates.slice(0, 3).map(c => ({ text: c.text, score: c.score })));
  
  return candidates[0];
};

// Calculate name matching score
const calculateNameMatchScore = (optionText: string, searchValue: string, searchParts: string[]): number => {
  if (!optionText) return 0;
  
  const optionLower = optionText.toLowerCase().trim();
  const searchLower = searchValue.toLowerCase().trim();
  
  // Exact match gets highest score
  if (optionLower === searchLower) {
    return 100;
  }
  
  // Check if option contains the full search value
  if (optionLower.includes(searchLower)) {
    return 90;
  }
  
  // Check if search value contains the option (for abbreviations like "PG")
  if (searchLower.includes(optionLower)) {
    return 85;
  }
  
  // Split option text into parts for name matching
  const optionParts = optionLower.split(/\s+/).filter(part => part.length > 0);
  
  let score = 0;
  let matchedParts = 0;
  
  // Check for partial matches between search parts and option parts
  for (const searchPart of searchParts) {
    for (const optionPart of optionParts) {
      if (optionPart.includes(searchPart) || searchPart.includes(optionPart)) {
        matchedParts++;
        score += 20;
        break; // Don't double-count the same search part
      }
      
      // Check for initials matching (e.g., "PG" matches "Pradeep Gururani")
      if (searchPart.length === 1 && optionPart.startsWith(searchPart)) {
        matchedParts++;
        score += 15;
        break;
      }
      
      // Check for name abbreviations (e.g., "agent1" matches "agent 1")
      const normalizedOption = optionPart.replace(/\s+/g, '');
      const normalizedSearch = searchPart.replace(/\s+/g, '');
      if (normalizedOption.includes(normalizedSearch) || normalizedSearch.includes(normalizedOption)) {
        matchedParts++;
        score += 25;
        break;
      }
    }
  }
  
  // Bonus for matching multiple parts of a name
  if (matchedParts > 1) {
    score += matchedParts * 10;
  }
  
  // Check for fuzzy matching (Levenshtein-like)
  if (score === 0) {
    const similarity = calculateStringSimilarity(optionLower, searchLower);
    if (similarity > 0.6) {
      score = Math.floor(similarity * 50);
    }
  }
  
  return score;
};

// Simple string similarity calculation
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

// Calculate edit distance (simplified Levenshtein)
const getEditDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Enhanced select option matching for standard select elements
const findBestSelectOptionMatch = (selectElement: HTMLSelectElement, searchValue: string): { index: number, text: string } | null => {
  const options = Array.from(selectElement.options);
  const candidates: { index: number, text: string, score: number }[] = [];
  const searchParts = searchValue.toLowerCase().trim().split(/\s+/).filter(part => part.length > 0);
  
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const textScore = calculateNameMatchScore(option.text, searchValue, searchParts);
    const valueScore = calculateNameMatchScore(option.value, searchValue, searchParts);
    
    const bestScore = Math.max(textScore, valueScore);
    
    if (bestScore > 0) {
      candidates.push({
        index: i,
        text: option.text,
        score: bestScore
      });
    }
  }
  
  if (candidates.length === 0) return null;
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
};

// Enhanced option selection with proper dropdown closing
const selectDropdownOptionAndClose = async (option: Element, originalDropdown: HTMLElement): Promise<boolean> => {
  try {
    const optionElement = option as HTMLElement;
    const optionText = optionElement.textContent?.trim();
    
    console.log('🔽 Selecting option:', optionText);
    
    // Method 1: Focus the option first
    optionElement.focus();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Method 2: Enhanced click sequence with multiple attempts
    const clickMethods = [
      () => optionElement.click(),
      () => {
        // Mouse event sequence
        optionElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
        optionElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
        optionElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        optionElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        optionElement.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      },
      () => {
        // Keyboard events
        optionElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        optionElement.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true, cancelable: true }));
        optionElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }));
      },
      () => {
        // Space key (alternative selection method)
        optionElement.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
        optionElement.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
      }
    ];
    
    // Try each click method with a small delay
    for (let i = 0; i < clickMethods.length; i++) {
      console.log(`🔽 Trying click method ${i + 1}...`);
      clickMethods[i]();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Check if option appears to be selected (option might disappear or get aria-selected)
      const isSelected = optionElement.getAttribute('aria-selected') === 'true' ||
                        optionElement.classList.contains('selected') ||
                        !document.contains(optionElement); // Option might be removed from DOM after selection
      
      if (isSelected) {
        console.log(`🔽 Option appears selected after method ${i + 1}`);
        break;
      }
    }
    
    // Method 3: Try clicking parent or container elements
    const parentSelectors = [
      '[role="option"]',
      '.quantumWizMenuPaperselectOption',
      '.freebirdFormviewerComponentsQuestionSelectOption',
      '.freebirdFormviewerComponentsQuestionSelectMenuOption'
    ];
    
    for (const selector of parentSelectors) {
      const parent = optionElement.closest(selector);
      if (parent && parent !== optionElement) {
        console.log(`🔽 Clicking parent element (${selector}):`, parent);
        (parent as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Method 4: Try clicking nested clickable elements
    const clickableChildSelectors = [
      '[role="button"]',
      'button',
      '.clickable',
      '[data-value]',
      'span[jsaction]',
      'div[jsaction]'
    ];
    
    for (const selector of clickableChildSelectors) {
      const clickableChild = optionElement.querySelector(selector) as HTMLElement;
      if (clickableChild) {
        console.log(`🔽 Clicking nested element (${selector}):`, clickableChild);
        clickableChild.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Wait for the selection to register
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Method 5: Ensure dropdown closes
    console.log('🔽 Ensuring dropdown closes...');
    await closeDropdown(originalDropdown);
    
    // Method 6: Enhanced event dispatch on original dropdown
    const events = [
      { type: 'change', options: { bubbles: true, cancelable: true } },
      { type: 'input', options: { bubbles: true, cancelable: true } },
      { type: 'blur', options: { bubbles: true, cancelable: true } },
      { type: 'focusout', options: { bubbles: true, cancelable: true } }
    ];
    
    for (const { type, options } of events) {
      originalDropdown.dispatchEvent(new Event(type, options));
    }
    
    // Method 7: Try to update any hidden input values that Google Forms might use
    const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
    hiddenInputs.forEach(input => {
      const hiddenInput = input as HTMLInputElement;
      if (hiddenInput.name && hiddenInput.name.includes('entry') && optionText) {
        const originalValue = hiddenInput.value;
        hiddenInput.value = optionText;
        console.log(`🔽 Updated hidden input ${hiddenInput.name}: "${originalValue}" → "${optionText}"`);
      }
    });
    
    console.log(`✅ Option selection completed: "${optionText}"`);
    return true;
  } catch (error) {
    console.error('❌ Error selecting dropdown option:', error);
    return false;
  }
};

// Function to close dropdown properly
const closeDropdown = async (dropdownElement: HTMLElement): Promise<void> => {
  try {
    console.log('Attempting to close dropdown');
    
    // Method 1: Press Escape key
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }));
    
    // Method 2: Click outside the dropdown
    const body = document.body;
    if (body) {
      body.click();
    }
    
    // Method 3: Blur the dropdown element
    dropdownElement.blur();
    
    // Method 4: Click the dropdown again to toggle it closed
    setTimeout(() => {
      const isStillOpen = document.querySelector('[role="option"]');
      if (isStillOpen) {
        console.log('Dropdown still open, trying to close it');
        dropdownElement.click();
      }
    }, 100);
    
    // Method 5: Look for close buttons or overlay elements
    const closeButton = document.querySelector('[aria-label*="close"], [aria-label*="Close"], .close, .overlay');
    if (closeButton) {
      (closeButton as HTMLElement).click();
    }
    
  } catch (error) {
    console.error('Error closing dropdown:', error);
  }
};

// Enhanced radio button field filling for time spent values
const fillRadioField = (element: HTMLElement, value: string): boolean => {
  console.log(`🔘 Attempting to fill radio field with value: "${value}"`);
  
  // Find the radio container (could be the element itself or a parent)
  let radioContainer = element;
  
  // Try to find the actual radio group container
  if (!element.querySelector('input[type="radio"]')) {
    radioContainer = element.closest('[role="listitem"]') || 
                    element.closest('.freebirdFormviewerViewItemsItemItem') ||
                    element.parentElement ||
                    element;
  }
  
  console.log(`🔘 Using radio container:`, radioContainer.className);
  
  if (radioContainer) {
         // Method 1: Try standard radio inputs
     const radioInputs = radioContainer.querySelectorAll('input[type="radio"]');
    console.log(`🔘 Found ${radioInputs.length} standard radio inputs`);
    
    // Method 2: If no standard radio inputs, try Google Forms specific selectors
    if (radioInputs.length === 0) {
      const googleRadioSelectors = [
        '[role="radio"]',
        '[role="radiogroup"] [role="button"]',
        '.freebirdFormviewerComponentsQuestionRadioChoice',
        '[data-value]',
        '[tabindex="0"]:not(input):not(select):not(textarea)'
      ];
      
      for (const selector of googleRadioSelectors) {
        const customRadios = radioContainer.querySelectorAll(selector);
        if (customRadios.length > 0) {
          console.log(`🔘 Found ${customRadios.length} custom radio elements with selector: ${selector}`);
          return fillCustomRadioElements(customRadios, value, selector);
        }
      }
    }
    
    // Method 3: Standard radio input handling
    if (radioInputs.length > 0) {
      return fillStandardRadioInputs(radioInputs, value);
    }
    
    console.log(`❌ No radio elements found in container`);
  }
  
  return false;
};

// Handle standard HTML radio inputs
const fillStandardRadioInputs = (radioInputs: NodeListOf<Element>, value: string): boolean => {
  console.log(`🔘 Processing ${radioInputs.length} standard radio inputs`);
  
  // Log all available options for debugging
  const availableOptions: { element: HTMLInputElement, label: string, value: string }[] = [];
  radioInputs.forEach((radio, index) => {
    const radioElement = radio as HTMLInputElement;
    const label = radio.closest('label')?.textContent?.trim() || 
                 radio.parentElement?.textContent?.trim() ||
                 radioElement.value ||
                 `Option ${index + 1}`;
    
    availableOptions.push({
      element: radioElement,
      label: label,
      value: radioElement.value || label
    });
    
    console.log(`  Radio option ${index}: label="${label}", value="${radioElement.value}"`);
  });
  
  // Find best match
  const bestMatch = findBestRadioMatch(availableOptions, value);
  
  if (bestMatch) {
    try {
      // Select the radio button
      bestMatch.element.checked = true;
      bestMatch.element.click();
      
      // Dispatch events to ensure Google Forms recognizes the selection
      bestMatch.element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      bestMatch.element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      bestMatch.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      
      // Also try clicking the label if it exists
      const label = bestMatch.element.closest('label');
      if (label) {
        label.click();
      }
      
      console.log(`✅ Successfully selected standard radio option with score ${bestMatch.score}`);
      return true;
    } catch (error) {
      console.error('❌ Error selecting standard radio option:', error);
    }
  }
  
  return false;
};

// Handle custom Google Forms radio elements
const fillCustomRadioElements = (customRadios: NodeListOf<Element>, value: string, selectorUsed: string): boolean => {
  console.log(`🔘 Processing ${customRadios.length} custom radio elements (${selectorUsed})`);
  
  const availableOptions: { element: HTMLElement, label: string, value: string }[] = [];
  customRadios.forEach((radio, index) => {
    const radioElement = radio as HTMLElement;
    const label = radioElement.textContent?.trim() || 
                 radioElement.getAttribute('data-value') ||
                 radioElement.getAttribute('aria-label') ||
                 `Option ${index + 1}`;
    
    availableOptions.push({
      element: radioElement,
      label: label,
      value: radioElement.getAttribute('data-value') || label
    });
    
    console.log(`  Custom radio option ${index}: label="${label}"`);
  });
  
  // Find best match using the same logic
  const bestMatch = findBestCustomRadioMatch(availableOptions, value);
  
  if (bestMatch) {
    try {
      // Click the custom radio element
      bestMatch.element.click();
      
      // Dispatch additional events
      bestMatch.element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      bestMatch.element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      bestMatch.element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      
      // Add focus for good measure
      bestMatch.element.focus();
      
      console.log(`✅ Successfully selected custom radio option with score ${bestMatch.score}`);
      return true;
    } catch (error) {
      console.error('❌ Error selecting custom radio option:', error);
    }
  }
  
  return false;
};

// Find best match for standard radio inputs
const findBestRadioMatch = (options: { element: HTMLInputElement, label: string, value: string }[], searchValue: string): { element: HTMLInputElement, score: number } | null => {
  const cleanSearchValue = searchValue.toLowerCase().trim();
  let bestMatch: { element: HTMLInputElement, score: number } | null = null;
  
  for (const option of options) {
    const optionLabel = option.label.toLowerCase().trim();
    const optionValue = option.value.toLowerCase().trim();
    let score = 0;
    
    // Exact matches get highest priority
    if (optionLabel === cleanSearchValue || optionValue === cleanSearchValue) {
      score = 100;
    }
    // Check for numeric time values (0.25, 0.5, 0.75, 1, etc.)
    else if (isNumericTimeMatch(cleanSearchValue, optionLabel) || isNumericTimeMatch(cleanSearchValue, optionValue)) {
      score = 95;
    }
    // Partial matches
    else if (optionLabel.includes(cleanSearchValue) || cleanSearchValue.includes(optionLabel)) {
      score = 80;
    }
    else if (optionValue.includes(cleanSearchValue) || cleanSearchValue.includes(optionValue)) {
      score = 75;
    }
    // Special handling for common time formats
    else if (isTimeFormatMatch(cleanSearchValue, optionLabel) || isTimeFormatMatch(cleanSearchValue, optionValue)) {
      score = 70;
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { element: option.element, score };
      console.log(`  🎯 New best match: "${option.label}" with score ${score}`);
    }
  }
  
  if (!bestMatch) {
    console.log(`❌ No suitable radio option found for value: "${searchValue}"`);
    console.log('Available options:', options.map(opt => ({ label: opt.label, value: opt.value })));
  }
  
  return bestMatch;
};

// Find best match for custom radio elements (similar logic but different element type)
const findBestCustomRadioMatch = (options: { element: HTMLElement, label: string, value: string }[], searchValue: string): { element: HTMLElement, score: number } | null => {
  const cleanSearchValue = searchValue.toLowerCase().trim();
  let bestMatch: { element: HTMLElement, score: number } | null = null;
  
  for (const option of options) {
    const optionLabel = option.label.toLowerCase().trim();
    const optionValue = option.value.toLowerCase().trim();
    let score = 0;
    
    // Exact matches get highest priority
    if (optionLabel === cleanSearchValue || optionValue === cleanSearchValue) {
      score = 100;
    }
    // Check for numeric time values (0.25, 0.5, 0.75, 1, etc.)
    else if (isNumericTimeMatch(cleanSearchValue, optionLabel) || isNumericTimeMatch(cleanSearchValue, optionValue)) {
      score = 95;
    }
    // Partial matches
    else if (optionLabel.includes(cleanSearchValue) || cleanSearchValue.includes(optionLabel)) {
      score = 80;
    }
    else if (optionValue.includes(cleanSearchValue) || cleanSearchValue.includes(optionValue)) {
      score = 75;
    }
    // Special handling for common time formats
    else if (isTimeFormatMatch(cleanSearchValue, optionLabel) || isTimeFormatMatch(cleanSearchValue, optionValue)) {
      score = 70;
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { element: option.element, score };
      console.log(`  🎯 New best custom match: "${option.label}" with score ${score}`);
    }
  }
  
  if (!bestMatch) {
    console.log(`❌ No suitable custom radio option found for value: "${searchValue}"`);
    console.log('Available custom options:', options.map(opt => ({ label: opt.label, value: opt.value })));
  }
  
  return bestMatch;
};

// Fill checkbox fields
const fillCheckboxField = (element: HTMLElement, value: string): boolean => {
  const checkboxContainer = element.closest('[role="listitem"]');
  if (checkboxContainer) {
    const checkboxInputs = checkboxContainer.querySelectorAll('input[type="checkbox"]');
    const valuesToCheck = value.split(',').map(v => v.trim().toLowerCase());
    
    let anyChecked = false;
    for (const checkbox of Array.from(checkboxInputs)) {
      const checkboxLabel = checkbox.closest('label')?.textContent?.trim() || '';
      if (valuesToCheck.some(val => 
        checkboxLabel.toLowerCase().includes(val) || 
        val.includes(checkboxLabel.toLowerCase()))) {
        (checkbox as HTMLInputElement).click();
        console.log(`Checked checkbox option: ${checkboxLabel}`);
        anyChecked = true;
      }
    }
    return anyChecked;
  }
  return false;
};

// Listen for messages from background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  try {
    if (message.action === 'detectFields') {
      // Detect and return form fields on the page
      const fields = detectFormFields();
      sendResponse({ 
        success: true, 
        fields,
        url: window.location.href
      });
    } else if (message.action === 'autofillForm') {
      // Handle autofill request
      console.log("Processing autofill request with data:", message.data);
      
      // Use async/await for autofill
      autofillFormFields(message.data).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        console.error("Error in autofill:", error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
      });
      
      return true; // Keep message channel open for async response
    }
  } catch (error) {
    console.error("Error in content script:", error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
  
  return true; // Indicate async response
});

// Run field detection when the content script loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded in content script context:', window.location.href);
  detectFormFields();
});

// Also run detection when the page is fully loaded (for dynamic content)
window.addEventListener('load', () => {
  setTimeout(() => {
    console.log('Page fully loaded, re-detecting fields');
    detectFormFields();
  }, 1000);
});

// Export for testing
export {};

// Helper function to check if values match as numeric time values
const isNumericTimeMatch = (searchValue: string, optionText: string): boolean => {
  // Extract numbers from both strings
  const searchNum = parseFloat(searchValue.replace(/[^0-9.]/g, ''));
  const optionNum = parseFloat(optionText.replace(/[^0-9.]/g, ''));
  
  // Check if both are valid numbers and match
  if (!isNaN(searchNum) && !isNaN(optionNum)) {
    return Math.abs(searchNum - optionNum) < 0.01; // Allow for small floating point differences
  }
  
  return false;
};

// Helper function to check for common time format matches
const isTimeFormatMatch = (searchValue: string, optionText: string): boolean => {
  const timeFormats = [
    // Convert common time formats
    { search: ['0.25', '0,25', '1/4', 'quarter'], option: ['0.25', '0,25', '1/4', 'quarter'] },
    { search: ['0.5', '0,5', '1/2', 'half'], option: ['0.5', '0,5', '1/2', 'half'] },
    { search: ['0.75', '0,75', '3/4', 'three quarter'], option: ['0.75', '0,75', '3/4', 'three quarter'] },
    { search: ['1', '1.0', '1,0', 'one', 'full'], option: ['1', '1.0', '1,0', 'one', 'full'] }
  ];
  
  for (const format of timeFormats) {
    const searchMatches = format.search.some(s => searchValue.includes(s));
    const optionMatches = format.option.some(o => optionText.includes(o));
    
    if (searchMatches && optionMatches) {
      return true;
    }
  }
  
  return false;
};

