
import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
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
  
  // Reset loading state when form URL changes
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
    }
  }, [formUrl, open]);
  
  const handleIframeLoad = () => {
    setLoading(false);
  };
  
  const handleIframeError = () => {
    setLoading(false);
    setError("There was a problem loading the form. It might be restricted from being displayed in iframes.");
  };
  
  const handleOpenExternal = () => {
    window.open(formUrl, '_blank');
    toast("Form opened externally", {
      description: "The Google Form has been opened in a new tab."
    });
  };
  
  const reloadIframe = () => {
    setLoading(true);
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.src = formUrl;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenExternal}
              className="flex items-center gap-1"
            >
              <ExternalLink size={14} />
              <span>Open in new tab</span>
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
            <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
              <Alert className="bg-red-50 border-red-200 w-full">
                <AlertDescription className="text-sm text-red-800">
                  {error}
                  <div className="mt-2">
                    <Button onClick={handleOpenExternal} className="w-full flex items-center justify-center gap-2">
                      <ExternalLink size={16} />
                      <span>Open in new tab instead</span>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          <iframe 
            ref={iframeRef}
            src={formUrl} 
            title="Google Form"
            className="w-full h-full"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormIframe;
