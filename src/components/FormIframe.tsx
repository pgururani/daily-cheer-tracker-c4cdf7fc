
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Copy, Share, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface FormIframeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formUrl: string;
  title?: string;
}

const FormIframe: React.FC<FormIframeProps> = ({ open, onOpenChange, formUrl, title = "Google Form" }) => {
  const [copied, setCopied] = useState(false);
  
  // Handle opening the form in a new tab
  const handleOpenExternal = () => {
    window.open(formUrl, '_blank');
    
    toast("Form opened externally", {
      description: "The Google Form has been opened in a new tab."
    });
  };
  
  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl);
      setCopied(true);
      
      toast("Link copied", {
        description: "The form URL has been copied to your clipboard."
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Google Forms work best when opened directly. Please choose an option below to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-800">
              Your form data has been prepared and is ready to be submitted using one of these methods.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <Button 
              onClick={handleOpenExternal} 
              className="w-full flex items-center justify-center gap-2 bg-cheer-blue hover:bg-cheer-blue/90"
            >
              <ExternalLink size={16} />
              <span>Open form in new tab</span>
            </Button>
            
            <Button 
              onClick={copyLinkToClipboard} 
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle size={16} className="text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy form link to clipboard</span>
                </>
              )}
            </Button>
            
            <div className="text-sm text-gray-600 text-center mt-4 space-y-2">
              <p>Due to security restrictions, Google Forms cannot be directly embedded.</p>
              <p className="font-medium">Both options above will preserve your pre-filled data.</p>
            </div>
            
            <DialogClose asChild>
              <Button variant="ghost" className="w-full">Cancel</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormIframe;
