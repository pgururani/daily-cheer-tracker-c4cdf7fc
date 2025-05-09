
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Settings, Search, ArrowRight, CheckCircle, X } from "lucide-react";
import { GoogleFormConfig, UserSettings } from '@/types/task';
import { DEFAULT_FORM_FIELDS, detectFormFields, isValidGoogleFormUrl } from '@/utils/formUtils';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SetupWizardProps {
  open: boolean;
  onComplete: (settings: UserSettings) => void;
  initialSettings?: UserSettings | null;
  onClose?: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ open, onComplete, initialSettings, onClose }) => {
  // Setup wizard steps
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Form state
  const [userName, setUserName] = useState(initialSettings?.userName || '');
  const [formConfig, setFormConfig] = useState<GoogleFormConfig>(
    initialSettings?.formConfig || { url: '', fields: DEFAULT_FORM_FIELDS }
  );
  const [defaultClient, setDefaultClient] = useState(initialSettings?.defaultClient || '');
  const [isDetectingFields, setIsDetectingFields] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [fieldMappingTab, setFieldMappingTab] = useState('automatic');
  const [staticValues, setStaticValues] = useState(initialSettings?.staticValues || {});

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Go to next step if validation passes
  const nextStep = () => {
    if (currentStep === 1) {
      // Validate user name
      if (!userName.trim()) {
        toast("Please enter your name", { description: "Your name is required to continue." });
        return;
      }
    } else if (currentStep === 2) {
      // Validate form URL
      if (!isValidGoogleFormUrl(formConfig.url)) {
        toast("Invalid Google Form URL", { description: "Please enter a valid Google Form URL." });
        return;
      }
    }
    
    // Go to next step
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  // Go to previous step
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Handle field detection
  const handleDetectFields = async () => {
    if (!isValidGoogleFormUrl(formConfig.url)) {
      toast("Invalid Google Form URL", { description: "Please enter a valid Google Form URL" });
      return;
    }
    
    setIsDetectingFields(true);
    
    try {
      const detectedFields = await detectFormFields(formConfig.url);
      
      if (detectedFields) {
        setFormConfig(detectedFields);
        toast("Fields detected!", { description: "Form fields have been automatically detected." });
      } else {
        toast("Detection limited", { description: "We've provided default field IDs. You may need to adjust them manually." });
      }
    } catch (error) {
      console.error('Field detection error:', error);
      toast("Detection failed", { description: "Please enter field IDs manually." });
    } finally {
      setIsDetectingFields(false);
      setFieldMappingTab('advanced');
      setShowAdvancedConfig(true);
    }
  };

  // Handle static value change
  const handleStaticValueChange = (fieldKey: string, isStatic: boolean, value?: string) => {
    setStaticValues(prev => ({
      ...prev,
      [fieldKey]: {
        isStatic,
        value: value || ''
      }
    }));
  };

  // Complete setup
  const completeSetup = () => {
    const settings: UserSettings = {
      userName: userName,
      formConfig: formConfig,
      defaultClient: defaultClient,
      staticValues: staticValues,
      setupComplete: true
    };
    
    onComplete(settings);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Daily Cheer Tracker Setup {currentStep > 1 && `(Step ${currentStep}/${totalSteps})`}
          </DialogTitle>
          <DialogDescription>
            Configure your app to track and submit your daily tasks.
          </DialogDescription>
        </DialogHeader>

        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2" 
          onClick={handleClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Step 1: Welcome & User Name */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                Welcome to Daily Cheer Tracker! Let's set up your profile to get started.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="user-name">Your Name</Label>
                <Input
                  id="user-name"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This will be used when you submit your tasks to the form.
                </p>
              </div>
            </div>
            
            <Button onClick={nextStep} className="w-full mt-4 flex items-center justify-center gap-2">
              <span>Continue</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* Step 2: Google Form Configuration */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                Now let's link your Google Form. This is used to submit your daily tasks.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Google Form URL</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    placeholder="https://forms.google.com/..."
                    value={formConfig.url}
                    onChange={(e) => setFormConfig({...formConfig, url: e.target.value})}
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleDetectFields} 
                    disabled={isDetectingFields || !formConfig.url}
                  >
                    {isDetectingFields ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Detect
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste the URL of your Google Form here and click "Detect" to automatically extract field IDs.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Default Client/Project</Label>
                <Select 
                  value={defaultClient} 
                  onValueChange={setDefaultClient}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Project A">Project A</SelectItem>
                    <SelectItem value="Project B">Project B</SelectItem>
                    <SelectItem value="Project C">Project C</SelectItem>
                    <SelectItem value="Internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Form Field Configuration */}
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                >
                  <Settings className="h-4 w-4" />
                  <span>{showAdvancedConfig ? 'Hide' : 'Show'} Advanced Form Settings</span>
                </Button>
              </div>

              {showAdvancedConfig && (
                <div className="space-y-3 border p-3 rounded-md bg-slate-50 mt-2">
                  <h4 className="font-medium text-sm">Form Field IDs</h4>
                  
                  <Tabs value={fieldMappingTab} onValueChange={setFieldMappingTab}>
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="automatic">Automatic</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="automatic" className="space-y-4 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Click the "Detect" button next to the form URL to automatically identify field IDs.
                      </p>
                      <Button 
                        onClick={handleDetectFields} 
                        disabled={isDetectingFields || !formConfig.url}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {isDetectingFields ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-1" />
                        )}
                        <span>Detect Form Fields</span>
                      </Button>
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="space-y-3 pt-2">
                      <ScrollArea className="h-60 pr-4">
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            These field IDs must match your Google Form. They look like "entry.1234567890".
                          </p>
                          
                          <div className="grid gap-2">
                            <Label className="text-xs">Name Field ID</Label>
                            <Input
                              placeholder="entry.2005620554"
                              value={formConfig.fields.name}
                              onChange={(e) => setFormConfig({
                                ...formConfig, 
                                fields: {...formConfig.fields, name: e.target.value}
                              })}
                              className="text-xs h-8"
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label className="text-xs">Date Field ID</Label>
                            <Input
                              placeholder="entry.1310344807"
                              value={formConfig.fields.date}
                              onChange={(e) => setFormConfig({
                                ...formConfig, 
                                fields: {...formConfig.fields, date: e.target.value}
                              })}
                              className="text-xs h-8"
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label className="text-xs">Client Field ID</Label>
                            <Input
                              placeholder="entry.1065046570"
                              value={formConfig.fields.client}
                              onChange={(e) => setFormConfig({
                                ...formConfig, 
                                fields: {...formConfig.fields, client: e.target.value}
                              })}
                              className="text-xs h-8"
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label className="text-xs">Time Field ID</Label>
                            <Input
                              placeholder="entry.1166974658"
                              value={formConfig.fields.time}
                              onChange={(e) => setFormConfig({
                                ...formConfig, 
                                fields: {...formConfig.fields, time: e.target.value}
                              })}
                              className="text-xs h-8"
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label className="text-xs">Description Field ID</Label>
                            <Input
                              placeholder="entry.839337160"
                              value={formConfig.fields.description}
                              onChange={(e) => setFormConfig({
                                ...formConfig, 
                                fields: {...formConfig.fields, description: e.target.value}
                              })}
                              className="text-xs h-8"
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label className="text-xs">GitHub Issue Field ID</Label>
                            <Input
                              placeholder="entry.1042224615"
                              value={formConfig.fields.githubIssue}
                              onChange={(e) => setFormConfig({
                                ...formConfig, 
                                fields: {...formConfig.fields, githubIssue: e.target.value}
                              })}
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button 
                onClick={nextStep} 
                className="flex-1 flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Field Automation */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                Last step! Configure which form fields should use fixed values to save time.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <p className="text-sm">
                For each field, you can choose to automatically fill it with a static value or enter it each time.
              </p>

              {/* Name Field */}
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Name Field</h3>
                    <p className="text-xs text-muted-foreground">Always use your name</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={16} className="text-green-500 mr-2" />
                    <span className="text-sm">Always use: {userName}</span>
                  </div>
                </div>
              </Card>

              {/* Client Field */}
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Client/Project</h3>
                    <p className="text-xs text-muted-foreground">Set a default or choose each time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={staticValues.client?.isStatic ? "static" : "manual"}
                      onValueChange={(value) => {
                        handleStaticValueChange('client', value === 'static', defaultClient);
                      }}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Always use default</SelectItem>
                        <SelectItem value="manual">Enter each time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Date Field */}
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Date</h3>
                    <p className="text-xs text-muted-foreground">Today's date will be used automatically</p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle size={16} className="text-green-500 mr-2" />
                    <span className="text-sm">Always use today's date</span>
                  </div>
                </div>
              </Card>

              {/* Time Field */}
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Time Spent</h3>
                    <p className="text-xs text-muted-foreground">Set a default or choose each time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={staticValues.time?.isStatic ? "static" : "manual"}
                      onValueChange={(value) => {
                        handleStaticValueChange('time', value === 'static', '0.25');
                      }}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Always use 0.25</SelectItem>
                        <SelectItem value="manual">Enter each time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* GitHub Issue Field */}
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">GitHub Issue</h3>
                    <p className="text-xs text-muted-foreground">Set a default or enter each time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={staticValues.githubIssue?.isStatic ? "static" : "manual"}
                      onValueChange={(value) => {
                        handleStaticValueChange('githubIssue', value === 'static');
                      }}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Use static value</SelectItem>
                        <SelectItem value="manual">Enter each time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {staticValues.githubIssue?.isStatic && (
                  <Input
                    className="mt-2 text-xs h-8"
                    placeholder="Default GitHub issue (e.g. #1234)"
                    value={staticValues.githubIssue.value || ''}
                    onChange={(e) => handleStaticValueChange('githubIssue', true, e.target.value)}
                  />
                )}
              </Card>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button 
                onClick={completeSetup} 
                className="flex-1 bg-cheer-green hover:bg-cheer-green/90 flex items-center justify-center gap-2"
              >
                <span>Complete Setup</span>
                <CheckCircle size={16} />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SetupWizard;
