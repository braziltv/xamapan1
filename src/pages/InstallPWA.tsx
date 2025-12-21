import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Tv, CheckCircle, Smartphone, Monitor, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWA = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop' | 'tv'>('desktop');

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android') && userAgent.includes('tv')) {
      setDeviceType('tv');
    } else if (userAgent.includes('android')) {
      setDeviceType('android');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else {
      setDeviceType('desktop');
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'tv':
        return <Tv className="h-16 w-16 text-primary" />;
      case 'android':
      case 'ios':
        return <Smartphone className="h-16 w-16 text-primary" />;
      default:
        return <Monitor className="h-16 w-16 text-primary" />;
    }
  };

  const getInstallInstructions = () => {
    if (deviceType === 'ios') {
      return (
        <div className="space-y-4 text-left">
          <h3 className="font-semibold text-lg">No iPhone/iPad:</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta)</li>
            <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
            <li>Toque em <strong>"Adicionar"</strong> no canto superior direito</li>
          </ol>
        </div>
      );
    }

    if (deviceType === 'tv') {
      return (
        <div className="space-y-4 text-left">
          <h3 className="font-semibold text-lg">Na Android TV:</h3>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Abra o navegador Chrome na TV</li>
            <li>Acesse esta página</li>
            <li>Pressione o botão de <strong>menu</strong> no controle remoto</li>
            <li>Selecione <strong>"Adicionar à tela inicial"</strong></li>
          </ol>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getDeviceIcon()}
          </div>
          <CardTitle className="text-2xl">Instalar App de Chamada TV</CardTitle>
          <CardDescription>
            Instale o aplicativo para usar no modo TV sem precisar de navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-lg font-medium text-green-600">
                App instalado com sucesso!
              </p>
              <p className="text-muted-foreground">
                O aplicativo já está na sua tela inicial. Você pode fechar esta janela.
              </p>
              <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Sistema
              </Button>
            </div>
          ) : (
            <>
              {/* Features list */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Benefícios do PWA:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Abre em tela cheia sem navegador
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Funciona offline (recursos em cache)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Carrega mais rápido
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Ícone na tela inicial como app nativo
                  </li>
                </ul>
              </div>

              {/* Install button for supported browsers */}
              {deferredPrompt && (
                <Button 
                  onClick={handleInstall} 
                  className="w-full h-14 text-lg"
                  disabled={isInstalling}
                >
                  <Download className="mr-2 h-5 w-5" />
                  {isInstalling ? 'Instalando...' : 'Instalar Aplicativo'}
                </Button>
              )}

              {/* Manual instructions for iOS and TV */}
              {(!deferredPrompt || deviceType === 'ios' || deviceType === 'tv') && (
                <div className="border rounded-lg p-4">
                  {getInstallInstructions()}
                  
                  {!deferredPrompt && deviceType !== 'ios' && deviceType !== 'tv' && (
                    <div className="text-center text-muted-foreground">
                      <p className="mb-2">Para instalar:</p>
                      <p className="text-sm">
                        Clique no ícone de menu do navegador (⋮) e selecione{' '}
                        <strong>"Instalar aplicativo"</strong> ou{' '}
                        <strong>"Adicionar à tela inicial"</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Sistema
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPWA;
