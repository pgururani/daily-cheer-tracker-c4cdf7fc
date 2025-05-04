
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyTasks, Task } from '@/types/task';
import { getTimeBlockLabel } from '@/utils/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckIcon, ExternalLink, ListCheckIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DailySummaryProps {
  dailyHistory: DailyTasks[];
}

const DailySummary: React.FC<DailySummaryProps> = ({ dailyHistory }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [formUrl, setFormUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load saved Google Form URL from localStorage
  useEffect(() => {
    const savedFormUrl = localStorage.getItem('daily-cheer-form-url');
    if (savedFormUrl) {
      setFormUrl(savedFormUrl);
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

  // Extract form ID from Google Form URL
  const extractFormId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      
      // Handle different Google Forms URL formats
      if (url.includes('docs.google.com/forms')) {
        // Format: https://docs.google.com/forms/d/e/{formId}/viewform
        const pathParts = urlObj.pathname.split('/');
        const formIdIndex = pathParts.indexOf('d') + 1;
        if (formIdIndex < pathParts.length) {
          return pathParts[formIdIndex];
        }
      } else if (url.includes('forms.gle')) {
        // Short URL format
        // We might need to follow the URL to get the actual form ID
        // For now, just return the pathname
        return urlObj.pathname.substring(1);
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting form ID:', error);
      return null;
    }
  };

  // Function to create a form prefill URL
  const createPrefillUrl = (formUrl: string, tasksData: string): string | null => {
    try {
      if (!isValidGoogleFormUrl(formUrl)) {
        toast("Invalid Google Form URL", {
          description: "Please enter a valid Google Form URL",
        });
        return null;
      }

      // For demo purposes, we'll use a simple approach to create a prefilled form URL
      // In a real app, you would map specific form fields to corresponding data
      
      const formattedDate = selectedDayTasks 
        ? new Date(selectedDayTasks.date).toLocaleDateString() 
        : '';
        
      // Create a basic URL with form parameters
      // NOTE: In a production app, you would need to know the actual form field IDs
      // This is a simplified approach that assumes the form has entry.12345 format fields
      const baseUrl = formUrl.includes('?') ? `${formUrl}&` : `${formUrl}?`;
      
      // Create URL parameters for common form fields
      // The actual field IDs would need to be replaced with the real ones from the form
      const params = new URLSearchParams({
        'entry.123456789': formattedDate, // Date field (example ID)
        'entry.987654321': tasksData,     // Tasks field (example ID)
        'usp': 'pp_url'                   // Prefill parameter
      });
      
      return `${baseUrl}${params.toString()}`;
    } catch (error) {
      console.error('Error creating prefill URL:', error);
      return null;
    }
  };

  const handleSendToForm = () => {
    if (!formUrl || !selectedDayTasks) {
      toast("Please enter a form URL", {
        description: "You need to provide a Google Form URL to submit data",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Save the form URL for future use
      localStorage.setItem('daily-cheer-form-url', formUrl);
      
      const tasksData = formatTasksAsSummary(selectedDayTasks.tasks);
      const prefillUrl = createPrefillUrl(formUrl, tasksData);
      
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
            
            <p className="text-sm text-muted-foreground">
              Enter the URL of your Google Form. You can find this by opening your form and copying the URL from the browser.
            </p>
            <Input
              placeholder="https://forms.google.com/..."
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              className="mb-2"
            />
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
