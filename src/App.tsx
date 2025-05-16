
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, HashRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { useEffect, useState } from "react";

// Create the query client outside of the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [isExtension, setIsExtension] = useState(false);

  useEffect(() => {
    // Check if running as extension
    const extensionCheck = !!chrome?.runtime?.id;
    console.log("App running as extension:", extensionCheck);
    setIsExtension(extensionCheck);
    
    // Log routing information for debugging
    console.log("Current path:", window.location.pathname);
    console.log("Current href:", window.location.href);
  }, []);

  // Use HashRouter for extension context to avoid navigation issues
  const Router = isExtension ? HashRouter : BrowserRouter;
  
  return (
    // Wrap everything in the QueryClientProvider
    <QueryClientProvider client={queryClient}>
      {/* Use the appropriate router based on context */}
      <Router>
        <TooltipProvider delayDuration={300}>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
        
        {/* Toaster components placed at the end to avoid nesting issues */}
        <Toaster />
        <Sonner />
      </Router>
    </QueryClientProvider>
  );
};

export default App;
