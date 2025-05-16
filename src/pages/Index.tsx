
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

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
            toast({
              title: "Extension initialized",
              description: "Setup complete. Ready to use.",
            });
          });
        }
      });
    }
  }, []);

  const handleTestClick = () => {
    console.log("Test button clicked");
    toast({
      title: "Test successful",
      description: `Running as extension: ${isExtension}, Storage access: ${storageAccess}`,
    });
    
    // Try to send a message to the background script
    if (isExtension) {
      chrome.runtime.sendMessage({ action: "test" }, (response) => {
        console.log("Background script response:", response);
        if (response?.success) {
          toast({
            title: "Background communication works!",
            description: response.message || "Message received by background script",
          });
        }
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Daily Cheer Tracker</CardTitle>
          <CardDescription>
            Extension status check
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Running as extension:</span>
              <span className={isExtension ? "text-green-600" : "text-amber-600"}>
                {isExtension ? "Yes ✓" : "No ✗"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Storage access:</span>
              <span className={storageAccess ? "text-green-600" : "text-amber-600"}>
                {storageAccess ? "Available ✓" : "Unavailable ✗"}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleTestClick} className="w-full">
            Test Extension
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Index;
