import { useState, useEffect, useRef } from 'react';
import { useCallPanel } from '@/hooks/useCallPanel';
import { useTTSPreCache } from '@/hooks/useTTSPreCache';
import { useHourAudio } from '@/hooks/useHourAudio';
import { PanelHeader } from '@/components/PanelHeader';
import { PatientRegistration } from '@/components/PatientRegistration';
import { TriagePanel } from '@/components/TriagePanel';
import { DoctorPanel } from '@/components/DoctorPanel';
import { PublicDisplay } from '@/components/PublicDisplay';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import { InternalChat } from '@/components/InternalChat';
import LoginScreen from '@/components/LoginScreen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, UserPlus, Activity, Stethoscope, BarChart3, LogOut, Volume2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [activeTab, setActiveTab] = useState("cadastro");
  const [isTvMode, setIsTvMode] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedUnitName = localStorage.getItem("selectedUnitName") || "";
    const tvMode = localStorage.getItem("isTvMode") === "true";
    setIsLoggedIn(loggedIn);
    setUnitName(storedUnitName);
    setIsTvMode(tvMode);
    
    // If TV mode, set display tab
    if (tvMode && loggedIn) {
      setActiveTab("display");
    }
  }, []);

  // Handle tab change and fullscreen for public display
  const handleTabChange = (value: string) => {
    // TV mode can only view display
    if (isTvMode) return;
    
    setActiveTab(value);
    
    if (value === "display") {
      // Enter fullscreen when switching to public display
      mainContainerRef.current?.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      // Exit fullscreen when switching to other tabs
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
    }
  };

  // Listen for fullscreen exit (ESC key) and switch tab (only for non-TV mode)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && activeTab === "display" && !isTvMode) {
        setActiveTab("cadastro");
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [activeTab, isTvMode]);

  // Auto fullscreen for TV mode
  useEffect(() => {
    if (isTvMode && isLoggedIn && mainContainerRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        mainContainerRef.current?.requestFullscreen().catch((err) => {
          console.log('Fullscreen request failed (user interaction may be required):', err);
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isTvMode, isLoggedIn]);

  const {
    patients,
    waitingForTriage,
    waitingForDoctor,
    currentTriageCall,
    currentDoctorCall,
    history,
    isAudioEnabled,
    setIsAudioEnabled,
    addPatient,
    removePatient,
    callPatientToTriage,
    callPatientToDoctor,
    finishTriage,
    finishConsultation,
    recallTriage,
    recallDoctor,
    directPatient,
    finishWithoutCall,
    forwardToTriage,
    forwardToDoctor,
    sendToTriageQueue,
    sendToDoctorQueue,
    updatePatientPriority,
    updatePatientObservations,
  } = useCallPanel();

  const { preCacheAllDestinationPhrases, preCachePatientName } = useTTSPreCache();
  const { playHourAudio, getHourText } = useHourAudio();

  // Função para testar chamada de paciente (temporário)
  const handleTestPatientTTS = async () => {
    const testText = "Maria Silva. Por favor, dirija-se à sala de triagem.";
    toast.info(`Testando voz Victor Power...`);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: testText,
            skipCache: true,
            unitName: 'TestPatientCall'
          }),
        }
      );

      if (!response.ok) {
        toast.error('Erro ao testar chamada');
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      await audio.play();
      toast.success('Chamada reproduzida com sucesso!');
    } catch (error) {
      console.error('Erro ao testar TTS:', error);
      toast.error('Erro ao reproduzir áudio');
    }
  };

  // Função para testar anúncio de hora (temporário)
  const handleTestHourAnnouncement = async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const text = getHourText(hour, minute);
    toast.info(`Testando Matilda: "${text}"`);
    
    const success = await playHourAudio(hour, minute);
    if (success) {
      toast.success('Anúncio de hora reproduzido!');
    } else {
      toast.error('Erro ao reproduzir anúncio de hora');
    }
  };

  // Pré-cachear todas as frases de destino ao fazer login
  useEffect(() => {
    if (isLoggedIn) {
      // Delay para não interferir com o carregamento da página
      const timer = setTimeout(() => {
        preCacheAllDestinationPhrases();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, preCacheAllDestinationPhrases]);

  // Wrapper para addPatient que também pré-cacheia o nome
  const handleAddPatient = async (name: string, priority?: 'normal' | 'priority' | 'emergency') => {
    addPatient(name, priority);
    // Pré-cachear o nome em background (não bloqueia)
    preCachePatientName(name);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("selectedUnitId");
    localStorage.removeItem("selectedUnitName");
    localStorage.removeItem("isTvMode");
    setIsLoggedIn(false);
    setUnitName("");
    setIsTvMode(false);
  };

  const handleLogin = (unitId: string, unitNameParam: string, tvMode?: boolean) => {
    setIsLoggedIn(true);
    setUnitName(unitNameParam);
    setIsTvMode(tvMode || false);
    if (tvMode) {
      setActiveTab("display");
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // TV Mode - show only PublicDisplay without any navigation
  if (isTvMode) {
    return (
      <div ref={mainContainerRef} className="min-h-screen-safe h-screen-safe bg-background relative overflow-hidden">
        <PublicDisplay 
          currentTriageCall={currentTriageCall} 
          currentDoctorCall={currentDoctorCall}
          history={history} 
        />
        {/* Discreet logout button for TV mode */}
        <button
          onClick={handleLogout}
          className="absolute bottom-2 right-2 p-2 rounded-full bg-white/5 hover:bg-white/20 text-white/30 hover:text-white/70 transition-all opacity-30 hover:opacity-100 z-50 touch-target"
          title="Sair do modo TV"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={mainContainerRef} className="min-h-screen-safe bg-background">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-screen-safe flex flex-col">
        <PanelHeader
          isAudioEnabled={isAudioEnabled}
          onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
          onLogout={handleLogout}
          unitName={unitName}
        />

        {/* Tab Navigation - Responsive */}
        <div className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container-responsive">
            <TabsList className="h-auto min-h-12 bg-transparent w-full justify-start gap-1 p-1 flex-wrap">
              <TabsTrigger 
                value="cadastro" 
                className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-primary/10 flex-1 sm:flex-none min-w-0"
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Cadastro</span>
              </TabsTrigger>
              <TabsTrigger 
                value="triagem" 
                className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-primary/10 flex-1 sm:flex-none min-w-0"
              >
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Triagem</span>
              </TabsTrigger>
              <TabsTrigger 
                value="medico" 
                className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-primary/10 flex-1 sm:flex-none min-w-0"
              >
                <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Médico</span>
              </TabsTrigger>
              <TabsTrigger 
                value="administrativo" 
                className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-primary/10 flex-1 sm:flex-none min-w-0"
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate hidden xs:inline">Administrativo</span>
                <span className="truncate xs:hidden">Admin</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Cadastro */}
        <TabsContent value="cadastro" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <PatientRegistration
              patients={patients}
              onAddPatient={handleAddPatient}
              onRemovePatient={removePatient}
              onDirectPatient={directPatient}
              onFinishWithoutCall={finishWithoutCall}
              onForwardToTriage={forwardToTriage}
              onForwardToDoctor={forwardToDoctor}
              onSendToTriageQueue={sendToTriageQueue}
              onUpdatePriority={updatePatientPriority}
              onUpdateObservations={updatePatientObservations}
            />
            
            {/* Botões de teste temporário - REMOVER DEPOIS */}
            <div className="mt-4 p-4 border border-dashed border-blue-500 rounded-lg bg-blue-500/10">
              <p className="text-blue-600 dark:text-blue-400 text-sm mb-3 font-medium">🧪 Testes Temporários de Voz</p>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleTestPatientTTS}
                  variant="outline"
                  className="gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  Chamada (Victor Power)
                </Button>
                <Button 
                  onClick={handleTestHourAnnouncement}
                  variant="outline"
                  className="gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Hora (Matilda)
                </Button>
              </div>
            </div>
          </main>
          <InternalChat station="cadastro" />
        </TabsContent>

        {/* Triagem */}
        <TabsContent value="triagem" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <TriagePanel
              waitingPatients={waitingForTriage}
              currentCall={currentTriageCall}
              onCallPatient={callPatientToTriage}
              onFinishTriage={finishTriage}
              onRecall={recallTriage}
              onDirectPatient={directPatient}
              onFinishWithoutCall={finishWithoutCall}
              onSendToDoctorQueue={sendToDoctorQueue}
              onUpdateObservations={updatePatientObservations}
            />
          </main>
          <InternalChat station="triagem" />
        </TabsContent>

        {/* Médico */}
        <TabsContent value="medico" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <DoctorPanel
              waitingPatients={waitingForDoctor}
              currentCall={currentDoctorCall}
              onCallPatient={callPatientToDoctor}
              onFinishConsultation={finishConsultation}
              onRecall={recallDoctor}
              onFinishWithoutCall={finishWithoutCall}
              onUpdateObservations={updatePatientObservations}
            />
          </main>
          <InternalChat station="medico" />
        </TabsContent>

        {/* Administrativo */}
        <TabsContent value="administrativo" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <StatisticsPanel patients={patients} history={history} />
          </main>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
