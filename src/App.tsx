import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AutoNightMode } from "@/components/AutoNightMode";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TVSetup from "./pages/TVSetup";

const queryClient = new QueryClient();

// Migração automática: Chirp3-HD → Neural2 (roda em todos os clientes ao iniciar)
const VOICE_MIGRATION: Record<string, string> = {
  'pt-BR-Chirp3-HD-Aoede': 'pt-BR-Neural2-A',
  'pt-BR-Chirp3-HD-Erinome': 'pt-BR-Neural2-A',
  'pt-BR-Chirp3-HD-Kore': 'pt-BR-Neural2-C',
  'pt-BR-Chirp3-HD-Charon': 'pt-BR-Neural2-B',
  'Aoede': 'pt-BR-Neural2-A',
  'Kore': 'pt-BR-Neural2-C',
  'Charon': 'pt-BR-Neural2-B',
};
['googleVoiceFemale', 'googleVoiceMale'].forEach(key => {
  const current = localStorage.getItem(key);
  if (current && VOICE_MIGRATION[current]) {
    localStorage.setItem(key, VOICE_MIGRATION[current]);
    console.log(`[Voice Migration] ${key}: ${current} → ${VOICE_MIGRATION[current]}`);
  }
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="app-theme" attribute="class" forcedTheme={undefined}>
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
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
