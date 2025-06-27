import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, ArrowRight, Bug, Settings, Zap } from "lucide-react";
import { getFieldMapping, findBestFieldMatch, getPersonalizedSampleData, getTodaysDate, generateFormFieldMapping } from "@/utils/formUtils";
import { generateIntelligentFormData, recordFormSubmission, generateFormHash, getFormStatistics } from "@/utils/formSubmissionTracker";
import UserSettings from "./UserSettings";

// Function to check if we're running in a Chrome extension environment
const isChromeExtension = (): boolean => {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
};

const FormFieldDetector: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedFields, setDetectedFields] = useState<Record<string, { element?: HTMLElement; type: string; name: string; id: string }>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [isGoogleForm, setIsGoogleForm] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [formStats, setFormStats] = useState<{ totalSubmissions: number; lastSubmission?: Date } | null>(null);

  // Detect form fields in the current tab
  const detectFields = async () => {
    if (!isChromeExtension()) {
      toast.error("This feature is only available in the extension");
      return;
    }

    setDetecting(true);
    setDebugInfo('Starting field detection...');
    
    try {
      // Send message to background script to detect fields in current tab
      chrome.runtime.sendMessage({ action: "detectFields" }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          const errorMsg = chrome.runtime.lastError.message;
          setDebugInfo(`Connection Error: ${errorMsg}`);
          
          if (errorMsg.includes("Receiving end does not exist")) {
            toast.error("Content script not loaded. Please refresh the page and try again.");
          } else {
            toast.error("Failed to detect fields");
          }
          setDetecting(false);
          return;
        }

        if (response && response.success) {
          const fieldsCount = Object.keys(response.fields || {}).length;
          setDetectedFields(response.fields || {});
          setCurrentUrl(response.url || '');
          
          // Check if this is a Google Form
          const isGForm = response.url && (
            response.url.includes('docs.google.com/forms') || 
            response.url.includes('forms.gle/')
          );
          setIsGoogleForm(isGForm);
          
          // Initialize field values with empty strings
          const initialValues: Record<string, string> = {};
          Object.keys(response.fields || {}).forEach(key => {
            initialValues[key] = '';
          });
          setFieldValues(initialValues);
          
          setDebugInfo(`Detected ${fieldsCount} fields. Google Form: ${isGForm ? 'Yes' : 'No'}`);
          toast.success(`Detected ${fieldsCount} form fields`);
          
          // Load form statistics
          try {
            const formHash = generateFormHash(response.fields || {});
            const stats = await getFormStatistics(formHash);
            setFormStats(stats);
            if (stats && stats.totalSubmissions > 0) {
              setDebugInfo(prev => `${prev} | Previous submissions: ${stats.totalSubmissions}`);
            }
          } catch (error) {
            console.error('Error loading form stats:', error);
          }
          
          // Log field details for debugging
          console.log('Detected fields:', response.fields);
        } else {
          const errorMsg = response?.error || "Unknown error";
          setDebugInfo(`Detection failed: ${errorMsg}`);
          toast.error(`Failed to detect fields: ${errorMsg}`);
        }
        setDetecting(false);
      });
    } catch (error) {
      console.error("Error detecting fields:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setDebugInfo(`Exception: ${errorMsg}`);
      toast.error("Failed to detect fields");
      setDetecting(false);
    }
  };

  // Autofill the form with provided values
  const autofillForm = async () => {
    if (!isChromeExtension()) {
      toast.error("This feature is only available in the extension");
      return;
    }

    if (Object.keys(fieldValues).length === 0) {
      toast.warning("No field values to fill");
      return;
    }

    setLoading(true);
    setDebugInfo('Starting autofill process...');
    
    try {
      // Filter out empty values
      const valuesToFill = Object.fromEntries(
        Object.entries(fieldValues).filter(([_, value]) => value.trim() !== '')
      );
      
      if (Object.keys(valuesToFill).length === 0) {
        toast.warning("No non-empty values to fill");
        setLoading(false);
        return;
      }
      
      setDebugInfo(`Filling ${Object.keys(valuesToFill).length} fields...`);
      console.log('Values to fill:', valuesToFill);
      
      // Prepare data for autofill
      const dataToSend = valuesToFill;
      
      // For Google Forms, use the detected fields directly without creating variations
      if (isGoogleForm) {
        console.log('Using detected Google Form fields directly:', Object.keys(detectedFields));
      }

      console.log('Data for autofill:', dataToSend);
      setDebugInfo(`Filling ${Object.keys(dataToSend).length} detected fields`);

      // Send message to background script to autofill form
      chrome.runtime.sendMessage({ 
        action: "autofillForm", 
        data: dataToSend 
      }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          const errorMsg = chrome.runtime.lastError.message;
          setDebugInfo(`Autofill error: ${errorMsg}`);
          toast.error("Failed to autofill form");
          setLoading(false);
          return;
        }

        if (response && response.success) {
          setDebugInfo('Autofill completed successfully!');
          toast.success("Form autofilled successfully");
          
          // Record the submission for tracking
          try {
            const formHash = generateFormHash(detectedFields);
            const userPreferences = await chrome.storage.sync.get(['userPreferences']);
            const prefs = userPreferences.userPreferences || { person_name: 'PG', project_name: 'Project Alpha', time_spent: '1' };
            
            await recordFormSubmission(formHash, currentUrl, dataToSend, {});
            console.log('📊 Recorded form submission for tracking');
          } catch (trackingError) {
            console.error('Error recording submission:', trackingError);
            // Don't show error to user as this is background tracking
          }
        } else {
          const errorMsg = response?.error || "Unknown error";
          setDebugInfo(`Autofill failed: ${errorMsg}`);
          toast.error(`Failed to autofill form: ${errorMsg}`);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error("Error autofilling form:", error);
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setDebugInfo(`Exception during autofill: ${errorMsg}`);
      toast.error("Failed to autofill form");
      setLoading(false);
    }
  };

  // Update field value
  const updateFieldValue = (fieldId: string, value: string) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Intelligent fill with tracking and dynamic values
  const intelligentFill = async () => {
    try {
      console.log('🧠 Starting intelligent fill with tracking...');
      setDebugInfo('Generating intelligent data with tracking...');
      
      // Get user preferences
      const userPreferences = await chrome.storage.sync.get(['userPreferences']);
      const prefs = userPreferences.userPreferences || { person_name: 'PG', project_name: 'Project Alpha', time_spent: '1' };
      
      // Generate intelligent form data
      const intelligentData = await generateIntelligentFormData(detectedFields, currentUrl, prefs);
      
      console.log('🧠 Generated intelligent data:', intelligentData);
      setFieldValues(intelligentData);
      setDebugInfo(`Generated ${Object.keys(intelligentData).length} intelligent values based on form history`);
      
      toast.success("Intelligent data generated with tracking!");
    } catch (error) {
      console.error('Error in intelligent fill:', error);
      setDebugInfo(`Intelligent fill error: ${error}`);
      toast.error("Failed to generate intelligent data");
    }
  };

  // Quick fill using smart field mapping
  const quickFillData = async () => {
    try {
      console.log('🚀 Starting quick fill with smart mapping...');
      const smartMapping = await generateFormFieldMapping(detectedFields);
      
      console.log('🚀 Generated smart mapping:', smartMapping);
      setFieldValues(smartMapping);
      
      toast.success("Smart data filled successfully!");
    } catch (error) {
      console.error('Error in quick fill:', error);
      toast.error("Failed to generate smart data mapping");
    }
  };

  // Enhanced sample data filling using user preferences
  const fillSampleData = async () => {
    try {
      const personalizedData = await getPersonalizedSampleData();
      const updatedValues: Record<string, string> = {};
      
      // Use the personalized data based on user preferences
      Object.keys(detectedFields).forEach(fieldId => {
        const fieldInfo = detectedFields[fieldId];
        const fieldName = fieldInfo.name?.toLowerCase() || fieldId.toLowerCase();
        
        // Map detected fields to personalized sample data
        if (fieldId === 'person_name' || fieldName.includes('who') || fieldName.includes('you')) {
          updatedValues[fieldId] = personalizedData.person_name;
        }
        else if (fieldId === 'work_date' || fieldName.includes('day') || fieldName.includes('date')) {
          updatedValues[fieldId] = personalizedData.work_date;
        }
        else if (fieldId === 'project_name' || fieldName.includes('project')) {
          updatedValues[fieldId] = personalizedData.project_name;
        }
        else if (fieldId === 'time_spent' || (fieldName.includes('time') && fieldName.includes('spend'))) {
          updatedValues[fieldId] = personalizedData.time_spent;
        }
        else if (fieldId === 'work_description' || fieldName.includes('description')) {
          updatedValues[fieldId] = personalizedData.work_description;
        }
        else if (fieldId === 'github_issue' || fieldName.includes('github')) {
          updatedValues[fieldId] = personalizedData.github_issue;
        }
        // Fallback for other field types
        else {
          if (fieldInfo.type === 'date') {
            updatedValues[fieldId] = personalizedData.work_date;
          } else if (fieldInfo.type === 'dropdown') {
            // Try to determine if it's a person or project dropdown
            if (fieldName.includes('who') || fieldName.includes('person') || fieldName.includes('agent')) {
              updatedValues[fieldId] = personalizedData.person_name;
            } else {
              updatedValues[fieldId] = personalizedData.project_name;
            }
          } else if (fieldInfo.type === 'radio') {
            updatedValues[fieldId] = personalizedData.time_spent;
          } else if (fieldInfo.type === 'textarea' || fieldInfo.type === 'text') {
            if (fieldName.includes('github') || fieldName.includes('issue')) {
              updatedValues[fieldId] = personalizedData.github_issue;
            } else {
              updatedValues[fieldId] = personalizedData.work_description;
            }
          }
        }
      });
      
      setFieldValues(prev => ({ ...prev, ...updatedValues }));
      toast.success(`Filled with your personalized data (${getTodaysDate()})`);
      
      // Log what was filled for debugging
      console.log('Filled personalized data:', updatedValues);
    } catch (error) {
      console.error('Error filling personalized data:', error);
      toast.error('Failed to load personalized data');
    }
  };

  // Quick fill function for immediate use
  const quickFill = async () => {
    try {
      const personalizedData = await getPersonalizedSampleData();
      
      // Auto-fill the form immediately with personalized data
      const dataToSend = {
        person_name: personalizedData.person_name,
        work_date: personalizedData.work_date,
        project_name: personalizedData.project_name,
        time_spent: personalizedData.time_spent,
        work_description: personalizedData.work_description,
        github_issue: personalizedData.github_issue
      };

      setLoading(true);
      setDebugInfo('Quick filling with your personalized data...');

      // Send message to background script to autofill form
      chrome.runtime.sendMessage({ 
        action: "autofillForm", 
        data: dataToSend 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          toast.error("Failed to quick fill form");
          setLoading(false);
          return;
        }

        if (response && response.success) {
          setDebugInfo('Quick fill completed successfully!');
          toast.success(`Form filled with your defaults (${getTodaysDate()})`);
        } else {
          const errorMsg = response?.error || "Unknown error";
          setDebugInfo(`Quick fill failed: ${errorMsg}`);
          toast.error(`Failed to quick fill: ${errorMsg}`);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error in quick fill:', error);
      toast.error('Failed to quick fill form');
      setLoading(false);
    }
  };

  // Detect fields on component mount
  useEffect(() => {
    if (isChromeExtension()) {
      detectFields();
    }
  }, []);

  if (showSettings) {
    return <UserSettings onClose={() => setShowSettings(false)} />;
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Daily Cheer Tracker</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </CardTitle>
        <CardDescription>
          {currentUrl ? (
            <>
              For {currentUrl.substring(0, 50)}{currentUrl.length > 50 ? '...' : ''}
              {isGoogleForm && <span className="text-green-600 ml-2">(Google Form)</span>}
            </>
          ) : "Detect and fill fields in the current page"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {detecting ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p>Detecting form fields...</p>
          </div>
        ) : Object.keys(detectedFields).length > 0 ? (
          <div className="space-y-4">
            {/* Smart Fill Buttons - Prominent placement */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-purple-800">AI Fill</h4>
                    <p className="text-sm text-purple-600">Tracking & dynamic values</p>
                  </div>
                  <Button 
                    onClick={intelligentFill}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <Zap className="mr-1 h-4 w-4" />
                    AI Fill
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-800">Smart Fill</h4>
                    <p className="text-sm text-green-600">Intelligent field mapping</p>
                  </div>
                  <Button 
                    onClick={quickFillData}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Zap className="mr-1 h-4 w-4" />
                    Smart Fill
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-800">Quick Fill</h4>
                    <p className="text-sm text-blue-600">Direct form submission</p>
                  </div>
                  <Button 
                    onClick={quickFill}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    {!loading && <ArrowRight className="mr-1 h-4 w-4" />}
                    Quick Fill
                  </Button>
                </div>
              </div>
            </div>

            {Object.entries(detectedFields).map(([fieldId, fieldInfo]) => (
              <div key={fieldId} className="space-y-2">
                <Label htmlFor={`field-${fieldId}`}>
                  {fieldInfo.name || fieldInfo.id || fieldId} ({fieldInfo.type})
                </Label>
                <Input
                  id={`field-${fieldId}`}
                  value={fieldValues[fieldId] || ''}
                  onChange={(e) => updateFieldValue(fieldId, e.target.value)}
                  placeholder={`Enter value for ${fieldInfo.name || fieldInfo.id || fieldId}`}
                />
              </div>
            ))}
            
            {/* Debug information */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="h-4 w-4" />
                  <span className="font-medium">Debug Info:</span>
                </div>
                <p className="text-gray-700">{debugInfo}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-center">No form fields detected. Try refreshing the page or click the button below to detect fields.</p>
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm max-w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="h-4 w-4" />
                  <span className="font-medium">Debug Info:</span>
                </div>
                <p className="text-gray-700 break-words">{debugInfo}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={detectFields} 
            disabled={detecting}
          >
            {detecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Detect Fields
          </Button>
          
          {Object.keys(detectedFields).length > 0 && (
            <Button 
              variant="outline" 
              onClick={fillSampleData}
              size="sm"
            >
              Fill My Data
            </Button>
          )}
        </div>
        
        <Button 
          onClick={autofillForm} 
          disabled={loading || Object.keys(detectedFields).length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {!loading && <ArrowRight className="mr-2 h-4 w-4" />}
          Autofill Form
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FormFieldDetector;
