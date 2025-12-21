import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tv, Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const AndroidTVInstallPrompt = () => {
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isAndroidTV, setIsAndroidTV] = useState(false);

  useEffect(() => {
    // Detect Android TV
    const userAgent = navigator.userAgent.toLowerCase();
    const isTV = 
      userAgent.includes('android') && 
      (userAgent.includes('tv') || 
       userAgent.includes('large screen') ||
       userAgent.includes('googletv') ||
       userAgent.includes('aftb') || // Amazon Fire TV
       userAgent.includes('aftt') ||
       userAgent.includes('aftm') ||
       userAgent.includes('bravia') || // Sony Bravia
       userAgent.includes('philipstv') ||
       userAgent.includes('samsungtv') ||
       userAgent.includes('webos') || // LG WebOS
       userAgent.includes('tizen')); // Samsung Tizen

    setIsAndroidTV(isTV);

    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    const wasDismissedRecently = dismissedAt && 
      (Date.now() - parseInt(dismissedAt)) < DISMISS_DURATION;

    // Check if already in TV mode via URL params
    const urlParams = new URLSearchParams(window.location.search);
    const isPWAMode = urlParams.get('pwa') === 'true';

    // Show prompt only if: is TV, not installed, not dismissed recently, not in PWA mode
    if (isTV && !isStandalone && !wasDismissedRecently && !isPWAMode) {
      // Delay showing the prompt for better UX
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowPrompt(false);
  };

  const handleInstall = () => {
    navigate('/install?mode=tv');
  };

  if (!showPrompt || !isAndroidTV) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-primary/95 backdrop-blur-sm border-primary-foreground/20 shadow-2xl max-w-2xl mx-auto">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-primary-foreground/20 p-3 rounded-full">
              <Tv className="h-8 w-8 text-primary-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-primary-foreground">
                Instalar App na TV
              </h3>
              <p className="text-sm text-primary-foreground/80 truncate">
                Adicione o app à tela inicial para acesso rápido sem navegador
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleInstall}
                className="gap-2"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline">Instalar</span>
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AndroidTVInstallPrompt;
