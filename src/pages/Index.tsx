
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FormFieldDetector from "@/components/FormFieldDetector";
import { ThumbsUp, Settings } from "lucide-react";

const Index = () => {
  const [isExtension, setIsExtension] = useState(false);
  const [storageAccess, setStorageAccess] = useState(false);
  
  useEffect(() => {
    // Check if running as extension
    const extensionCheck = !!chrome?.runtime?.id;
    console.log("Running as Chrome extension:", extensionCheck);
    setIsExtension(extensionCheck);
    
    // Check storage access
    if (extensionCheck && chrome.storage) {
      chrome.storage.local.get(["initialized"], (result) => {
        console.log("Storage access successful, initialized:", result.initialized);
        setStorageAccess(true);
        
        // Initialize if needed
        if (!result.initialized) {
          chrome.storage.local.set({ initialized: true, installDate: new Date().toISOString() }, () => {
            console.log("Extension initialized for first use");
            toast("Extension initialized", {
              description: "Setup complete. Ready to use.",
            });
          });
        }
      });
    }
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ThumbsUp className="text-blue-500" />
          <span>Form Field Autofill</span>
        </h1>
      </div>
      
      {/* Main Content */}
      <div className="space-y-4">
        <FormFieldDetector />
      </div>
      
      {/* Extension Status */}
      <div className="mt-8 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Extension mode:</span>
          <span className={isExtension ? "text-green-600" : "text-amber-600"}>
            {isExtension ? "Active ✓" : "Development ⚠️"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Storage:</span>
          <span className={storageAccess ? "text-green-600" : "text-amber-600"}>
            {storageAccess ? "Available ✓" : "Unavailable ⚠️"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Index;
