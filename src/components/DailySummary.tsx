import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyTasks, Task } from '@/types/task';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CheckIcon, 
  ExternalLink, 
  ListCheckIcon, 
  Settings, 
  Loader2,
  Search,
  FileText,
  Link
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTasks } from '@/hooks/useTasks';
import { useForm } from "react-hook-form";
import FormIframe from './FormIframe';
import { 
  createFormPrefillUrl,
  isValidGoogleFormUrl
} from '@/utils/formUtils';

interface DailySummaryProps {
  dailyHistory: DailyTasks[];
}

const DailySummary: React.FC<DailySummaryProps> = ({ dailyHistory }) => {
  const { 
    userName, 
    userSettings, 
    saveSettings,
    openSetupWizard,
    getTasksSummary
  } = useTasks();
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [timeSpent, setTimeSpent] = useState('0.25');
  const [githubIssue, setGithubIssue] = useState('');
  const [showFormIframe, setShowFormIframe] = useState(false);
  const [formPrefillUrl, setFormPrefillUrl] = useState('');
  
  const selectedDayTasks = dailyHistory.find(day => day.date === selectedDate);
  
  // Load saved values from userSettings when dialog opens
  useEffect(() => {
    if (showExportDialog && userSettings) {
      // Set default client if available
      if (userSettings.defaultClient) {
        setSelectedClient(userSettings.defaultClient);
      }
      
      // Set default time spent if available
      if (userSettings.defaultTimeSpent) {
        setTimeSpent(userSettings.defaultTimeSpent);
      }
      
      // Apply static values from settings if available
      if (userSettings.staticValues) {
        const staticValues = userSettings.staticValues;
        
        // Apply client static value if configured
        if (staticValues.client?.isStatic) {
          setSelectedClient(staticValues.client.value || userSettings.defaultClient || '');
        }
        
        // Apply time static value if configured
        if (staticValues.time?.isStatic) {
          setTimeSpent(staticValues.time.value || userSettings.defaultTimeSpent || '0.25');
        }
        
        // Apply GitHub issue static value if configured
        if (staticValues.githubIssue?.isStatic) {
          setGithubIssue(staticValues.githubIssue.value || '');
        }
      }
    }
  }, [showExportDialog, userSettings]);

  const sortedHistory = [...dailyHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleSendToForm = () => {
    if (!userSettings?.formConfig?.url || !selectedDayTasks) {
      toast("Missing form configuration", {
        description: "Please set up your Google Form first.",
      });
      openSetupWizard();
      return;
    }

    if (!userName) {
      toast("Missing name", {
        description: "Please enter your name in the settings.",
      });
      openSetupWizard();
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get summary text
      const tasksDescription = getTasksSummary(selectedDayTasks.tasks);
      
      // Create prefill URL
      const prefillUrl = createFormPrefillUrl(
        userSettings.formConfig,
        tasksDescription,
        userName,
        selectedClient,
        timeSpent,
        githubIssue
      );
      
      if (prefillUrl) {
        setFormPrefillUrl(prefillUrl);
        
        // Show success message
        toast("Form ready", {
          description: "Your form has been prepared with your task data.",
        });
        
        // Open the form dialog with options
        setShowFormIframe(true);
        setShowExportDialog(false);
        setIsSubmitting(false);
      } else {
        // Show error message
        toast("Error creating form link", {
          description: "Could not create a link to your Google Form. Please check the URL.",
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      toast("Error", {
        description: "Failed to prepare the form submission. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!selectedDayTasks) return;
    
    const summary = getTasksSummary(selectedDayTasks.tasks);
    navigator.clipboard.writeText(summary);
    
    toast("Copied!", {
      description: "Summary copied to clipboard",
    });
  };

  // Handle form iframe close
  const handleFormIframeClose = () => {
    setShowFormIframe(false);
    setFormPrefillUrl('');
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ListCheckIcon size={20} />
            <span>Daily Summaries</span>
          </h2>
          
          {userSettings?.setupComplete === false && (
            <Button 
              onClick={openSetupWizard} 
              variant="outline" 
              size="sm" 
              className="text-xs"
            >
              <Settings size={14} className="mr-1" />
              Setup Form
            </Button>
          )}
        </div>
        
        {sortedHistory.length > 0 ? (
          <div className="space-y-3">
            {sortedHistory.map((day) => (
              <Card key={day.date} className="overflow-hidden">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{new Date(day.date).toLocaleDateString(undefined, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                    <span className="text-muted-foreground">
                      {day.tasks.length} {day.tasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardFooter className="p-3">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setSelectedDate(day.date)}
                  >
                    View summary
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No daily summaries yet.</p>
            <p>Complete your day to see summaries.</p>
          </div>
        )}
      </div>

      {/* Daily Summary Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDayTasks && new Date(selectedDayTasks.date).toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDayTasks && (
            <>
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {getTasksSummary(selectedDayTasks.tasks)}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 flex items-center gap-2"
                    onClick={handleCopyToClipboard}
                  >
                    <FileText size={16} />
                    <span>Copy to clipboard</span>
                  </Button>
                  <Button 
                    className="flex-1 bg-cheer-blue hover:bg-cheer-blue/90 flex items-center gap-2"
                    onClick={() => setShowExportDialog(true)}
                  >
                    <Link size={16} />
                    <span>Export to Google Form</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export to Google Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                Prepare to submit your tasks to Google Form with today's date.
              </AlertDescription>
            </Alert>
            
            {/* Form Configuration Status */}
            {!userSettings?.formConfig?.url ? (
              <div className="space-y-2">
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-sm text-yellow-800">
                    You need to set up your Google Form first.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={openSetupWizard} 
                  className="w-full"
                >
                  <Settings size={16} className="mr-2" />
                  Setup Google Form
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Client selection */}
                <div className="space-y-2">
                  <Label>Client/Project</Label>
                  <Select 
                    value={selectedClient} 
                    onValueChange={setSelectedClient}
                  >
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Project A">Project A</SelectItem>
                      <SelectItem value="Project B">Project B</SelectItem>
                      <SelectItem value="Project C">Project C</SelectItem>
                      <SelectItem value="Internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Time spent selection */}
                <div className="space-y-2">
                  <Label>Time Spent (in quarters)</Label>
                  <RadioGroup 
                    defaultValue="0.25" 
                    value={timeSpent}
                    onValueChange={setTimeSpent}
                    className="flex justify-between"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Label>0.25</Label>
                      <RadioGroupItem value="0.25" id="r1" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Label>0.5</Label>
                      <RadioGroupItem value="0.5" id="r2" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Label>0.75</Label>
                      <RadioGroupItem value="0.75" id="r3" />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Label>1</Label>
                      <RadioGroupItem value="1" id="r4" />
                    </div>
                  </RadioGroup>
                </div>
                
                {/* GitHub issue (optional) */}
                <div className="space-y-2">
                  <Label>GitHub Issue # (optional)</Label>
                  <Input 
                    placeholder="e.g. #1234" 
                    value={githubIssue}
                    onChange={(e) => setGithubIssue(e.target.value)}
                  />
                </div>
                
                {/* Submit button */}
                <Button
                  onClick={handleSendToForm}
                  className="w-full bg-cheer-blue hover:bg-cheer-blue/90 flex gap-2 items-center justify-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <>
                      <ExternalLink size={16} className="mr-2" />
                      <span>Fill Google Form</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Form Options Dialog */}
      <FormIframe 
        open={showFormIframe}
        onOpenChange={handleFormIframeClose}
        formUrl={formPrefillUrl}
        title="Submit Daily Tasks"
      />
    </>
  );
};

export default DailySummary;
