
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Create the query client outside of the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  // Wrap everything in the QueryClientProvider
  <QueryClientProvider client={queryClient}>
    {/* TooltipProvider needs to be inside BrowserRouter to avoid React context issues */}
    <BrowserRouter>
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
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
