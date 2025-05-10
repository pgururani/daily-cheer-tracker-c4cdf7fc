
import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ExternalLink, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

interface FormIframeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formUrl: string;
  title?: string;
}

const FormIframe: React.FC<FormIframeProps> = ({ open, onOpenChange, formUrl, title = "Google Form" }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Reset loading state when form URL changes or when modal opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      
      // Check if it's a Google Form and show direct warning for better UX
      if (formUrl && (formUrl.includes('docs.google.com') || formUrl.includes('forms.gle'))) {
        // Set a short timer before showing the warning - most Google Forms will fail
        const timer = setTimeout(() => {
          setError("Google Forms typically restrict embedding. We recommend using the 'Open in new tab' option.");
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [formUrl, open]);
  
  const handleIframeLoad = () => {
    setLoading(false);
    
    // Check if the iframe content loaded successfully
    try {
      // This will throw an error if cross-origin restrictions apply
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const contentUrl = iframeRef.current.contentWindow.location.href;
        
        // If we got redirected to an access/login page
        if (contentUrl.includes('accounts.google.com') || 
            contentUrl.includes('signin') || 
            contentUrl.includes('access')) {
          setError("This form requires you to sign in. Please use the 'Open in new tab' option.");
        }
      }
    } catch (e) {
      // Cross-origin error - expected with Google Forms
      console.log("Cross-origin iframe access restricted");
    }
  };
  
  const handleIframeError = () => {
    setLoading(false);
    setError("There was a problem loading the form. It might be restricted from being displayed in iframes.");
  };
  
  const handleOpenExternal = (e: React.MouseEvent) => {
    // Prevent any default form submission
    e.preventDefault();
    
    // Open in new tab, but don't reload current page
    window.open(formUrl, '_blank');
    
    toast("Form opened externally", {
      description: "The Google Form has been opened in a new tab."
    });
  };
  
  const reloadIframe = (e: React.MouseEvent) => {
    // Prevent any default form submission
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.src = formUrl;
    }
  };
  
  const copyLinkToClipboard = () => {
    if (formUrl) {
      navigator.clipboard.writeText(formUrl);
      toast("Link copied", {
        description: "The form URL has been copied to your clipboard."
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Google Forms typically don't allow embedding due to security restrictions. We recommend using one of the alternatives below.
          </DialogDescription>
          <div className="flex flex-wrap gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleOpenExternal}
              className="flex items-center gap-1"
            >
              <ExternalLink size={14} />
              <span>Open in new tab</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyLinkToClipboard}
              className="flex items-center gap-1"
            >
              <span>Copy link</span>
            </Button>
            {error && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={reloadIframe}
                className="flex items-center gap-1"
              >
                <RefreshCcw size={14} />
                <span>Retry</span>
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="relative w-full h-[70vh] overflow-hidden rounded border">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Loading form...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 overflow-auto">
              <Alert className="bg-red-50 border-red-200 w-full">
                <AlertDescription className="text-sm text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
              
              <div className="mt-6 w-full max-w-md space-y-4">
                <div className="text-center">
                  <h3 className="font-medium">Alternative options:</h3>
                </div>
                
                <Button 
                  onClick={handleOpenExternal} 
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  <span>Open in new tab</span>
                </Button>
                
                <Button 
                  onClick={copyLinkToClipboard} 
                  variant="outline"
                  className="w-full"
                >
                  Copy link to clipboard
                </Button>
                
                <div className="text-sm text-gray-600 text-center mt-2">
                  <p>Google Forms typically require authentication and don't allow embedding due to security restrictions.</p>
                </div>
              </div>
            </div>
          )}
          
          <iframe 
            ref={iframeRef}
            src={formUrl} 
            title="Google Form"
            className="w-full h-full"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormIframe;
