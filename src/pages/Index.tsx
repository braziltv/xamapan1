import { useState, useEffect, useRef, useCallback } from 'react';
import { useCallPanel } from '@/hooks/useCallPanel';
import { useTTSPreCache } from '@/hooks/useTTSPreCache';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { PanelHeader } from '@/components/PanelHeader';
import { PatientRegistration } from '@/components/PatientRegistration';
import { TriagePanel } from '@/components/TriagePanel';
import { DoctorPanel } from '@/components/DoctorPanel';
import { ServicePanel } from '@/components/ServicePanel';
import { PublicDisplay } from '@/components/PublicDisplay';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import { InternalChat } from '@/components/InternalChat';
import LoginScreen from '@/components/LoginScreen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, UserPlus, Activity, Stethoscope, BarChart3, LogOut, Heart, Bandage, Scan, BedDouble } from 'lucide-react';
import { CustomAnnouncementButton } from '@/components/CustomAnnouncementButton';

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
    waitingForEcg,
    waitingForCurativos,
    waitingForRaiox,
    waitingForEnfermaria,
    currentTriageCall,
    currentDoctorCall,
    currentEcgCall,
    currentCurativosCall,
    currentRaioxCall,
    currentEnfermariaCall,
    history,
    isAudioEnabled,
    setIsAudioEnabled,
    addPatient,
    removePatient,
    callPatientToTriage,
    callPatientToDoctor,
    callPatientToEcg,
    callPatientToCurativos,
    callPatientToRaiox,
    callPatientToEnfermaria,
    finishTriage,
    finishConsultation,
    finishEcg,
    finishCurativos,
    finishRaiox,
    finishEnfermaria,
    recallTriage,
    recallDoctor,
    recallEcg,
    recallCurativos,
    recallRaiox,
    recallEnfermaria,
    directPatient,
    finishWithoutCall,
    forwardToTriage,
    forwardToDoctor,
    sendToTriageQueue,
    sendToDoctorQueue,
    sendToEcgQueue,
    sendToCurativosQueue,
    sendToRaioxQueue,
    sendToEnfermariaQueue,
    updatePatientPriority,
    updatePatientObservations,
  } = useCallPanel();

  const { preCacheAllDestinationPhrases, preCachePatientName } = useTTSPreCache();

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

  const handleLogout = useCallback(() => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("selectedUnitId");
    localStorage.removeItem("selectedUnitName");
    localStorage.removeItem("isTvMode");
    setIsLoggedIn(false);
    setUnitName("");
    setIsTvMode(false);
  }, []);

  // Auto logout at 07:04 and 19:04 (except TV mode)
  useAutoLogout({ isTvMode, onLogout: handleLogout });

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
              
              {/* Áudio Avulso Button - sempre visível na nav */}
              <div className="flex items-center ml-1 sm:ml-2">
                <CustomAnnouncementButton className="h-8 sm:h-9" />
              </div>
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
