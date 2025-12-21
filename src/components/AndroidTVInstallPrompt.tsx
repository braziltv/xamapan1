import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tv, Download, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const HEALTH_UNITS = [
  { id: "pa-pedro-jose", name: "PA Pedro José de Menezes" },
  { id: "psf-aguinalda", name: "PSF Aguinalda Angélica" },
  { id: "ubs-maria-alves", name: "UBS Maria Alves de Mendonça" },
];

export const AndroidTVInstallPrompt = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSmartTV, setIsSmartTV] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [showUnitSelector, setShowUnitSelector] = useState(false);

  useEffect(() => {
    // Detect Smart TVs - expanded detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isTV = 
      // Android TV
      (userAgent.includes('android') && userAgent.includes('tv')) ||
      userAgent.includes('android tv') ||
      userAgent.includes('googletv') ||
      userAgent.includes('large screen') ||
      // Amazon Fire TV
      userAgent.includes('aftb') ||
      userAgent.includes('aftt') ||
      userAgent.includes('aftm') ||
      userAgent.includes('afts') ||
      userAgent.includes('aftss') ||
      // Sony Bravia
      userAgent.includes('bravia') ||
      userAgent.includes('sony') && userAgent.includes('tv') ||
      // LG WebOS
      userAgent.includes('webos') ||
      userAgent.includes('web0s') ||
      userAgent.includes('netcast') ||
      userAgent.includes('lgtv') ||
      userAgent.includes('lg browser') ||
      // Samsung Tizen
      userAgent.includes('tizen') ||
      userAgent.includes('samsung') && userAgent.includes('tv') ||
      userAgent.includes('samsungtv') ||
      userAgent.includes('smart-tv') ||
      userAgent.includes('smarttv') ||
      // Philips
      userAgent.includes('philipstv') ||
      userAgent.includes('philips') && userAgent.includes('tv') ||
      userAgent.includes('nettv') ||
      // Panasonic Viera
      userAgent.includes('viera') ||
      userAgent.includes('panasonic') && userAgent.includes('tv') ||
      // Hisense VIDAA
      userAgent.includes('vidaa') ||
      userAgent.includes('hisense') ||
      // TCL / Roku TV
      userAgent.includes('roku') ||
      userAgent.includes('tcl') && userAgent.includes('tv') ||
      // Xbox / PlayStation (can be used as TV)
      userAgent.includes('xbox') ||
      userAgent.includes('playstation') ||
      // Generic TV detection
      userAgent.includes('tv browser') ||
      userAgent.includes('hbbtv') ||
      userAgent.includes('ce-html') ||
      // Screen size detection for TV-like devices
      (window.screen.width >= 1920 && userAgent.includes('android') && !userAgent.includes('mobile'));

    setIsSmartTV(isTV);

    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    const wasDismissedRecently = dismissedAt && 
      (Date.now() - parseInt(dismissedAt)) < DISMISS_DURATION;

    // Check if already in TV mode via URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const isPWAMode = urlParams.get('pwa') === 'true';
    const isTvMode = localStorage.getItem('isTvMode') === 'true';

    // Show prompt only if: is TV, not installed, not dismissed recently, not in PWA mode, not already in TV mode
    if (isTV && !isStandalone && !wasDismissedRecently && !isPWAMode && !isTvMode) {
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

  const handleShowUnitSelector = () => {
    setShowUnitSelector(true);
  };

  const handleConfirmUnit = () => {
    if (!selectedUnit) {
      toast({
        title: "Selecione uma unidade",
        description: "Por favor, selecione a unidade de saúde para exibir na TV.",
        variant: "destructive",
      });
      return;
    }

    const unit = HEALTH_UNITS.find(u => u.id === selectedUnit);
    
    // Set up TV mode without requiring login
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("selectedUnitId", selectedUnit);
    localStorage.setItem("selectedUnitName", unit?.name || "");
    localStorage.setItem("isTvMode", "true");
    
    toast({
      title: "Modo TV ativado!",
      description: `Painel configurado para ${unit?.name}`,
    });

    // Navigate to install page with TV mode
    navigate('/install?mode=tv');
  };

  if (!showPrompt || !isSmartTV) return null;

  // Unit selector view
  if (showUnitSelector) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
        <Card className="bg-primary/95 backdrop-blur-sm border-primary-foreground/20 shadow-2xl max-w-2xl mx-auto">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary-foreground/20 p-3 rounded-full">
                  <Tv className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-primary-foreground">
                    Configurar Painel TV
                  </h3>
                  <p className="text-xs sm:text-sm text-primary-foreground/80">
                    Selecione a unidade de saúde
                  </p>
                </div>
              </div>

              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-12 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="py-3">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowUnitSelector(false)}
                  className="flex-1 text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Voltar
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleConfirmUnit}
                  className="flex-1 gap-2"
                >
                  <Check className="h-4 w-4" />
                  Confirmar e Instalar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial prompt view
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
                Instalar Painel TV
              </h3>
              <p className="text-sm text-primary-foreground/80 truncate">
                Adicione o painel à tela inicial para acesso rápido
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleShowUnitSelector}
                className="gap-2"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline">Configurar</span>
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
