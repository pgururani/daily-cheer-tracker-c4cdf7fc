
// This component is now a simplified version since we're not using Google Forms anymore
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { isValidGoogleFormUrl } from "@/utils/formUtils";

interface FormIframeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formUrl: string;
  title?: string;
}

// This component is kept as a skeleton to prevent breaking dependencies
// but its functionality is minimal since Google Forms are no longer used
const FormIframe: React.FC<FormIframeProps> = ({ open, onOpenChange, title = "Form" }) => {
  const handleAction = () => {
    toast.info("Form integration has been replaced with direct autofill functionality");
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle size={18} />
            <span className="text-sm">
              This feature has been replaced with direct form field autofill.
            </span>
          </div>
          
          <Button onClick={handleAction} className="w-full">
            Close and use autofill instead
          </Button>
          
          <DialogClose asChild>
            <Button variant="ghost" className="w-full">Cancel</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FormIframe;
