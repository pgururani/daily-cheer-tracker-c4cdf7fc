
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, X } from "lucide-react";
import { UserSettings } from '@/types/task';
import { DEFAULT_FORM_FIELDS, isValidGoogleFormUrl, detectFormFields } from '@/utils/formUtils';
import { toast } from "sonner";

interface SetupWizardProps {
  open: boolean;
  onComplete: (settings: UserSettings) => void;
  initialSettings?: UserSettings | null;
  onClose?: () => void;
}

// This is a simplified version of the setup wizard
// since we're focusing only on form field autofill functionality
const SetupWizard: React.FC<SetupWizardProps> = ({ open, onComplete, initialSettings, onClose }) => {
  // Form state
  const [userName, setUserName] = useState(initialSettings?.userName || '');
  const [defaultClient, setDefaultClient] = useState(initialSettings?.defaultClient || '');
  
  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Complete setup with simplified settings
  const completeSetup = () => {
    if (!userName.trim()) {
      toast("Please enter your name", { description: "Your name is required to continue." });
      return;
    }
    
    const settings: UserSettings = {
      userName: userName,
      formConfig: { url: '', fields: DEFAULT_FORM_FIELDS },
      defaultClient: defaultClient,
      staticValues: {},
      setupComplete: true
    };
    
    onComplete(settings);
    toast.success("Setup complete!", { 
      description: "You can now use form field autofill."
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Form Field Autofill Setup
          </DialogTitle>
          <DialogDescription>
            Configure your app for form field detection and autofill.
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

        <div className="space-y-4">
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
                This will be used when autofilling forms.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="default-client">Default Client/Project</Label>
              <Input
                id="default-client"
                placeholder="Enter default client or project name"
                value={defaultClient}
                onChange={(e) => setDefaultClient(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Optional: Set a default client or project name for autofill.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={completeSetup} 
            className="w-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <span>Complete Setup</span>
            <CheckCircle size={16} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SetupWizard;
