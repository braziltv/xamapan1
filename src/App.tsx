import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AutoNightMode } from "@/components/AutoNightMode";
import { toast } from "sonner";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TVSetup from "./pages/TVSetup";

const queryClient = new QueryClient();

// Global error handler wrapper to prevent white screens
function GlobalErrorHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      toast.error("Ocorreu um erro. Recarregando...");
      event.preventDefault();
      
      // Auto reload after 3 seconds on TV pages
      if (window.location.pathname.includes('tv') || window.location.search.includes('tv_mode')) {
        setTimeout(() => window.location.reload(), 3000);
      }
    };

    // Handle global errors
    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="app-theme" attribute="class" forcedTheme={undefined}>
      <GlobalErrorHandler>
        <AutoNightMode />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tv-setup" element={<TVSetup />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </GlobalErrorHandler>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
