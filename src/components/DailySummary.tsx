import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyTasks, Task, GoogleFormConfig } from '@/types/task';
import { getTimeBlockLabel } from '@/utils/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckIcon, ExternalLink, ListCheckIcon, Settings } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface DailySummaryProps {
  dailyHistory: DailyTasks[];
}

// Default field IDs for Google Forms (based on common patterns)
const DEFAULT_FORM_FIELDS = {
  name: "entry.2005620554",       // Name field
  date: "entry.1310344807",       // Date field
  client: "entry.1065046570",     // Client field
  time: "entry.1166974658",       // Time/duration field
  description: "entry.839337160", // Description field
  githubIssue: "entry.1042224615" // GitHub issue field
};

const DailySummary: React.FC<DailySummaryProps> = ({ dailyHistory }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showFieldsConfig, setShowFieldsConfig] = useState(false);
  const [formConfig, setFormConfig] = useState<GoogleFormConfig>({
    url: '',
    fields: DEFAULT_FORM_FIELDS
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userName, setUserName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [timeSpent, setTimeSpent] = useState('0.25');
  const [githubIssue, setGithubIssue] = useState('');
  
  const form = useForm({
    defaultValues: {
      name: '',
      client: '',
      timeSpent: '0.25',
      githubIssue: ''
    }
  });
  
  // Load saved Google Form URL and field configs from localStorage
  useEffect(() => {
    const savedFormConfig = localStorage.getItem('daily-cheer-form-config');
    if (savedFormConfig) {
      try {
        const parsedConfig = JSON.parse(savedFormConfig);
        setFormConfig(parsedConfig);
      } catch (e) {
        console.error('Error parsing saved form config:', e);
      }
    }
    
    const savedUserName = localStorage.getItem('daily-cheer-user-name');
    if (savedUserName) {
      setUserName(savedUserName);
    }
  }, []);

  const sortedHistory = [...dailyHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const selectedDayTasks = dailyHistory.find(day => day.date === selectedDate);

  // Format tasks as a summary
  const formatTasksAsSummary = (tasks: Task[]): string => {
    // Group tasks by time block
    const groupedTasks: Record<number, Task[]> = {};
    
    tasks.forEach(task => {
      if (!groupedTasks[task.timeBlock]) {
        groupedTasks[task.timeBlock] = [];
      }
      groupedTasks[task.timeBlock].push(task);
    });
    
    // Build summary text
    let summary = '';
    
    Object.keys(groupedTasks).map(Number).sort().forEach(timeBlock => {
      summary += `${getTimeBlockLabel(timeBlock)}:\n`;
      groupedTasks[timeBlock].forEach(task => {
        summary += `- ${task.text}\n`;
      });
      summary += '\n';
    });
    
    return summary;
  };

  // Helper function to check if URL is a valid Google Form URL
  const isValidGoogleFormUrl = (url: string): boolean => {
    // Basic check for Google Forms URL pattern
    return url.includes('docs.google.com/forms') || 
           url.includes('forms.gle') || 
           url.includes('forms.google.com');
  };

  // Function to save form configuration
  const saveFormConfig = () => {
    localStorage.setItem('daily-cheer-form-config', JSON.stringify(formConfig));
    localStorage.setItem('daily-cheer-user-name', userName);
    toast("Settings saved", {
      description: "Your form configuration has been saved",
    });
    setShowFieldsConfig(false);
  };

  // Function to create a form prefill URL with the correct field mappings
  const createPrefillUrl = (tasks: Task[]): string | null => {
    try {
      if (!isValidGoogleFormUrl(formConfig.url)) {
        toast("Invalid Google Form URL", {
          description: "Please enter a valid Google Form URL",
        });
        return null;
      }

      const tasksDescription = formatTasksAsSummary(tasks);
      const formattedDate = selectedDayTasks 
        ? new Date(selectedDayTasks.date).toLocaleDateString('en-GB') // DD/MM/YYYY format
        : '';
      
      // Create a basic URL with form parameters based on the form configuration
      const baseUrl = formConfig.url.includes('?') ? `${formConfig.url}&` : `${formConfig.url}?`;
      
      const params = new URLSearchParams({
        [formConfig.fields.name]: userName,
        [formConfig.fields.date]: formattedDate,
        [formConfig.fields.client]: selectedClient,
        [formConfig.fields.time]: timeSpent,
        [formConfig.fields.description]: tasksDescription,
        [formConfig.fields.githubIssue]: githubIssue,
        'usp': 'pp_url' // Standard parameter for prefilling Google Forms
      });
      
      return `${baseUrl}${params.toString()}`;
    } catch (error) {
      console.error('Error creating prefill URL:', error);
      return null;
    }
  };

  const handleSendToForm = () => {
    if (!formConfig.url || !selectedDayTasks) {
      toast("Missing information", {
        description: "Please ensure you have selected a day and entered a form URL",
      });
      return;
    }

    if (!userName) {
      toast("Missing name", {
        description: "Please enter your name in the form settings",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const prefillUrl = createPrefillUrl(selectedDayTasks.tasks);
      
      if (prefillUrl) {
        // Show success message
        toast("Ready to submit", {
          description: "You will be redirected to the Google Form to complete submission",
        });
        
        // Open the prefilled form in a new tab
        setTimeout(() => {
          window.open(prefillUrl, '_blank');
          setShowExportDialog(false);
          setIsSubmitting(false);
        }, 1000);
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
    
    const summary = formatTasksAsSummary(selectedDayTasks.tasks);
    navigator.clipboard.writeText(summary);
    
    toast("Copied!", {
      description: "Summary copied to clipboard",
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ListCheckIcon size={20} />
            <span>Daily Summaries</span>
          </h2>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
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
                  {formatTasksAsSummary(selectedDayTasks.tasks)}
                </div>
                
                {/* Additional form fields */}
                <div className="space-y-3 border-t pt-3">
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client/Project</Label>
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
                  
                  <div className="grid gap-2">
                    <Label htmlFor="github-issue">GitHub Issue # (optional)</Label>
                    <Input 
                      id="github-issue"
                      placeholder="e.g. #1234" 
                      value={githubIssue}
                      onChange={(e) => setGithubIssue(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleCopyToClipboard}
                  >
                    Copy to clipboard
                  </Button>
                  <Button 
                    className="flex-1 bg-cheer-blue hover:bg-cheer-blue/90"
                    onClick={() => setShowExportDialog(true)}
                  >
                    Export to Google Form
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export to Google Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                Enter your Google Form URL below. The app will open the form in a new tab with your tasks pre-filled.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Google Form URL</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowFieldsConfig(prev => !prev)}
                    className="text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Configure Fields
                  </Button>
                </div>
                <Input
                  placeholder="https://forms.google.com/..."
                  value={formConfig.url}
                  onChange={(e) => setFormConfig({...formConfig, url: e.target.value})}
                />
              </div>
              
              {/* Form fields configuration section */}
              {showFieldsConfig && (
                <div className="space-y-3 border p-3 rounded-md bg-slate-50">
                  <h4 className="font-medium text-sm">Form Field IDs</h4>
                  <p className="text-xs text-muted-foreground">
                    These field IDs must match your Google Form. Inspect the form source to find them.
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
                      size="sm"
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
                      size="sm"
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
                      size="sm"
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
                      size="sm"
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
                      size="sm"
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
                      size="sm"
                      className="text-xs h-8"
                    />
                  </div>
                  
                  <Button 
                    onClick={saveFormConfig}
                    size="sm"
                    className="w-full mt-2"
                  >
                    Save Field Configuration
                  </Button>
                </div>
              )}
            </div>
            
            <Button
              onClick={handleSendToForm}
              className="w-full bg-cheer-blue hover:bg-cheer-blue/90 flex gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Preparing..." : "Open Form with Data"}
              <ExternalLink size={16} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DailySummary;
