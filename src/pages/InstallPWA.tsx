import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Tv, CheckCircle, Smartphone, Monitor, ArrowLeft, User, FileDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallMode = 'select' | 'tv' | 'normal';

const InstallPWA = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop' | 'tv'>('desktop');
  const [installMode, setInstallMode] = useState<InstallMode>('select');

  useEffect(() => {
    // Check if mode is specified in URL
    const modeParam = searchParams.get('mode');
    if (modeParam === 'tv' || modeParam === 'normal') {
      setInstallMode(modeParam);
    }

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
  }, [searchParams]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        // Save the install mode for auto-launch
        if (installMode === 'tv') {
          localStorage.setItem('pwaInstallMode', 'tv');
        } else if (installMode === 'normal') {
          localStorage.setItem('pwaInstallMode', 'normal');
        }
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

  const getModeInfo = () => {
    if (installMode === 'tv') {
      return {
        icon: <img src="/pwa-tv-512x512.png" alt="Xama-Pan TV" className="h-20 w-20 rounded-xl shadow-lg" />,
        title: 'Xama-Pan TV',
        description: 'Exibição em tela cheia para TVs - apenas seleciona a unidade, sem login',
        features: [
          'Tela cheia automática',
          'Mouse oculta após inatividade',
          'Só pede a unidade (sem senha)',
          'Ideal para TVs de espera'
        ]
      };
    }
    
    if (installMode === 'normal') {
      return {
        icon: <img src="/pwa-full-512x512.png" alt="Xama-Pan Full" className="h-20 w-20 rounded-xl shadow-lg" />,
        title: 'Xama-Pan Full',
        description: 'Acesso completo ao sistema com todas as funcionalidades',
        features: [
          'Login com usuário e senha',
          'Acesso a todas as abas',
          'Cadastro, triagem, médico, etc.',
          'Chat interno e configurações'
        ]
      };
    }

    return null;
  };

  // Mode Selection Screen
  if (installMode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Download className="h-16 w-16 text-primary" />
            </div>
            <CardTitle className="text-2xl">Instalar Aplicativo</CardTitle>
            <CardDescription>
              Escolha o modo de instalação do aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Xama-Pan TV Option */}
            <button
              onClick={() => setInstallMode('tv')}
              className="w-full p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <img 
                  src="/pwa-tv-192x192.png" 
                  alt="Xama-Pan TV" 
                  className="h-14 w-14 rounded-xl shadow-md group-hover:scale-105 transition-transform"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Xama-Pan TV</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Para TVs de sala de espera
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Só pede a unidade (sem senha)
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Tela cheia automática
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Mouse oculta após inatividade
                    </li>
                  </ul>
                </div>
              </div>
            </button>

            {/* Xama-Pan Full Option */}
            <button
              onClick={() => setInstallMode('normal')}
              className="w-full p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <img 
                  src="/pwa-full-192x192.png" 
                  alt="Xama-Pan Full" 
                  className="h-14 w-14 rounded-xl shadow-md group-hover:scale-105 transition-transform"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Xama-Pan Full</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Para operação do sistema
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Login com usuário e senha
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Acesso completo ao sistema
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Todas as funcionalidades
                    </li>
                  </ul>
                </div>
              </div>
            </button>

            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Sistema
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const modeInfo = getModeInfo();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {modeInfo?.icon || getDeviceIcon()}
          </div>
          <CardTitle className="text-2xl">Instalar {modeInfo?.title}</CardTitle>
          <CardDescription>
            {modeInfo?.description}
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
                <h3 className="font-semibold">Recursos do {modeInfo?.title}:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {modeInfo?.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
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
                  {isInstalling ? 'Instalando...' : `Instalar ${modeInfo?.title}`}
                </Button>
              )}

              {/* Direct download shortcut */}
              <a 
                href={installMode === 'tv' ? '/install-tv.html' : '/install-full.html'}
                download={installMode === 'tv' ? 'Xama-Pan-TV.html' : 'Xama-Pan-Full.html'}
                className="w-full"
              >
                <Button 
                  variant="outline"
                  className="w-full h-12 gap-2"
                >
                  <FileDown className="h-5 w-5" />
                  Baixar Atalho para Desktop
                </Button>
              </a>

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

              <div className="flex gap-2">
                <Button 
                  onClick={() => setInstallMode('select')} 
                  variant="outline" 
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Trocar Modo
                </Button>
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline" 
                  className="flex-1"
                >
                  Voltar ao Sistema
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPWA;