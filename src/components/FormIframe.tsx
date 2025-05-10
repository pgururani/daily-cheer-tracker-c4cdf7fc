
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Copy, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { isValidGoogleFormUrl } from "@/utils/formUtils";

interface FormIframeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formUrl: string;
  title?: string;
}

const FormIframe: React.FC<FormIframeProps> = ({ open, onOpenChange, formUrl, title = "Google Form" }) => {
  const [copied, setCopied] = useState(false);
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isUrlTested, setIsUrlTested] = useState(false);
  
  // Validate the form URL when it changes
  useEffect(() => {
    if (formUrl) {
      setIsValidUrl(isValidGoogleFormUrl(formUrl));
      setIsUrlTested(true);
    } else {
      setIsValidUrl(false);
      setIsUrlTested(false);
    }
  }, [formUrl]);
  
  // Handle opening the form in a new tab
  const handleOpenExternal = () => {
    if (!formUrl) {
      toast.error("No form URL available");
      return;
    }
    
    try {
      // Ensure URL is properly encoded
      const encodedUrl = encodeURI(decodeURI(formUrl));
      window.open(encodedUrl, '_blank', 'noopener,noreferrer');
      
      toast("Form opened externally", {
        description: "The Google Form has been opened in a new tab with your data pre-filled."
      });
    } catch (error) {
      console.error("Error opening form:", error);
      toast.error("Failed to open form", {
        description: "There was a problem opening the form. Please try copying the link instead."
      });
    }
  };
  
  // Copy link to clipboard with improved error handling
  const copyLinkToClipboard = () => {
    if (!formUrl) {
      toast.error("No form URL available");
      return;
    }
    
    try {
      // Ensure URL is properly encoded
      const encodedUrl = encodeURI(decodeURI(formUrl));
      navigator.clipboard.writeText(encodedUrl);
      setCopied(true);
      
      toast("Link copied", {
        description: "The form URL has been copied to your clipboard."
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast.error("Failed to copy link", {
        description: "There was a problem copying the link. Please try again."
      });
    }
  };
  
  // Force test the URL by attempting to open it in a hidden iframe
  const testFormUrl = () => {
    if (!formUrl) {
      toast.error("No form URL available");
      return;
    }
    
    setIsUrlTested(false);
    
    try {
      // Create a temporary hidden iframe to test the URL
      const testFrame = document.createElement('iframe');
      testFrame.style.display = 'none';
      testFrame.src = formUrl;
      
      // Listen for load events
      testFrame.onload = () => {
        setIsValidUrl(true);
        setIsUrlTested(true);
        document.body.removeChild(testFrame);
        toast.success("Form URL verified");
      };
      
      // Listen for error events
      testFrame.onerror = () => {
        setIsValidUrl(false);
        setIsUrlTested(true);
        document.body.removeChild(testFrame);
        toast.error("Invalid form URL");
      };
      
      // Add the iframe to the document and remove after 3 seconds (timeout)
      document.body.appendChild(testFrame);
      setTimeout(() => {
        if (document.body.contains(testFrame)) {
          document.body.removeChild(testFrame);
          setIsValidUrl(true); // Assume valid if no error within timeout
          setIsUrlTested(true);
        }
      }, 3000);
    } catch (error) {
      console.error("Error testing URL:", error);
      setIsValidUrl(false);
      setIsUrlTested(true);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Your form is ready with your data pre-filled. Choose how you'd like to continue.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-800 flex items-start gap-2">
              <AlertCircle size={18} className="text-blue-800 shrink-0 mt-0.5" />
              <span>
                Due to Google Forms security restrictions, direct submission isn't possible. 
                Your form data has been prepared and can be submitted using one of these options.
              </span>
            </AlertDescription>
          </Alert>
          
          {!isValidUrl && isUrlTested && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-sm text-yellow-800 flex items-start gap-2">
                <AlertCircle size={18} className="text-yellow-800 shrink-0 mt-0.5" />
                <span>
                  The form URL may be invalid or contain encoding issues. 
                  Try using the "Open in new tab" option which handles URL encoding.
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-4">
            <Button 
              onClick={handleOpenExternal} 
              className="w-full flex items-center justify-center gap-2 bg-cheer-blue hover:bg-cheer-blue/90"
            >
              <ExternalLink size={16} />
              <span>Open pre-filled form in new tab</span>
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
            
            {!isValidUrl && (
              <Button
                onClick={testFormUrl}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                <span>Test form URL</span>
              </Button>
            )}
            
            <div className="text-sm text-gray-600 text-center mt-4 space-y-2">
              <p>Google Forms requires manual form submission due to security restrictions.</p>
              <p className="font-medium">Opening the form will preserve all your pre-filled data.</p>
              {formUrl && (
                <p className="text-xs break-all mt-2 text-gray-400">
                  URL: {formUrl.length > 50 ? `${formUrl.substring(0, 50)}...` : formUrl}
                </p>
              )}
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
