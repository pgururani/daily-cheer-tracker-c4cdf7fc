
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { mapFieldsToGoogleForm } from "@/utils/formUtils";

// Function to check if we're running in a Chrome extension environment
const isChromeExtension = (): boolean => {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
};

const FormFieldDetector: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedFields, setDetectedFields] = useState<Record<string, any>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [isGoogleForm, setIsGoogleForm] = useState(false);

  // Detect form fields in the current tab
  const detectFields = async () => {
    if (!isChromeExtension()) {
      toast.error("This feature is only available in the extension");
      return;
    }

    setDetecting(true);
    try {
      // Send message to background script to detect fields in current tab
      chrome.runtime.sendMessage({ action: "detectFields" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          toast.error("Failed to detect fields");
          setDetecting(false);
          return;
        }

        if (response && response.success) {
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
          
          toast.success(`Detected ${Object.keys(response.fields || {}).length} form fields`);
        } else {
          toast.error(`Failed to detect fields: ${response?.error || "Unknown error"}`);
        }
        setDetecting(false);
      });
    } catch (error) {
      console.error("Error detecting fields:", error);
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
    try {
      // Filter out empty values
      const valuesToFill = Object.fromEntries(
        Object.entries(fieldValues).filter(([_, value]) => value.trim() !== '')
      );
      
      // For Google Forms, use mapping to increase chances of correct field identification
      const dataToSend = isGoogleForm ? 
        mapFieldsToGoogleForm(valuesToFill) : 
        valuesToFill;

      // Send message to background script to autofill form
      chrome.runtime.sendMessage({ 
        action: "autofillForm", 
        data: dataToSend 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError);
          toast.error("Failed to autofill form");
          setLoading(false);
          return;
        }

        if (response && response.success) {
          toast.success("Form autofilled successfully");
        } else {
          toast.error(`Failed to autofill form: ${response?.error || "Unknown error"}`);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error("Error autofilling form:", error);
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

  // Detect fields on component mount
  useEffect(() => {
    if (isChromeExtension()) {
      detectFields();
    }
  }, []);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Form Field Autofill</CardTitle>
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
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-center">No form fields detected. Try refreshing the page or click the button below to detect fields.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={detectFields} 
          disabled={detecting}
        >
          {detecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Detect Fields
        </Button>
        <Button 
          onClick={autofillForm} 
          disabled={loading || Object.keys(detectedFields).length === 0}
          className="bg-green-600 hover:bg-green-700"
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
