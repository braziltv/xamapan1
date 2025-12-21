import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AutoNightMode } from "@/components/AutoNightMode";
import { AndroidTVInstallPrompt } from "@/components/AndroidTVInstallPrompt";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import InstallPWA from "./pages/InstallPWA";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="app-theme" attribute="class" forcedTheme={undefined}>
      <AutoNightMode />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AndroidTVInstallPrompt />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/install" element={<InstallPWA />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
