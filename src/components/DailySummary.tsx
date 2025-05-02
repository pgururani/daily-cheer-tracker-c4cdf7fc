
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyTasks, Task } from '@/types/task';
import { getTimeBlockLabel } from '@/utils/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckIcon, ListCheckIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface DailySummaryProps {
  dailyHistory: DailyTasks[];
}

const DailySummary: React.FC<DailySummaryProps> = ({ dailyHistory }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [formUrl, setFormUrl] = useState('');

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

  const handleSendToForm = () => {
    if (!formUrl || !selectedDayTasks) {
      toast("Please enter a form URL", {
        description: "You need to provide a Google Form URL to submit data",
      });
      return;
    }

    toast("Ready to submit", {
      description: "Data formatted for Google Form submission. You'll be redirected to complete the process.",
    });

    // In a real app, this would send data to Google Form or prepare it for submission
    // For now, we'll just show a success message
    setTimeout(() => {
      setShowExportDialog(false);
      setSelectedDate(null);
    }, 1500);
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
            <p className="text-sm text-muted-foreground">
              Enter your Google Form URL to export the daily summary.
            </p>
            <Input
              placeholder="https://forms.google.com/..."
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              className="mb-2"
            />
            <Button
              onClick={handleSendToForm}
              className="w-full bg-cheer-blue hover:bg-cheer-blue/90"
            >
              Submit to Google Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DailySummary;
