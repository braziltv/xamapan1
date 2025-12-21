import { useState, useEffect, useRef, useCallback } from 'react';
import { useCallPanel } from '@/hooks/useCallPanel';
import { useTTSPreCache } from '@/hooks/useTTSPreCache';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { useUserSession } from '@/hooks/useUserSession';
import { useAutoHideCursor } from '@/hooks/useAutoHideCursor';
import { useAutoFullscreen } from '@/hooks/useAutoFullscreen';
import { PanelHeader } from '@/components/PanelHeader';
import { PatientRegistration } from '@/components/PatientRegistration';
import { TriagePanel } from '@/components/TriagePanel';
import { DoctorPanel } from '@/components/DoctorPanel';
import { ServicePanel } from '@/components/ServicePanel';
import { PublicDisplay } from '@/components/PublicDisplay';
import { InternalChat } from '@/components/InternalChat';
import LoginScreen from '@/components/LoginScreen';
import { AdminPasswordDialog, useAdminAuth } from '@/components/AdminPasswordDialog';
import { AndroidTVInstallPrompt } from '@/components/AndroidTVInstallPrompt';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, UserPlus, Activity, Stethoscope, BarChart3, LogOut, Heart, Bandage, Scan, BedDouble, Settings2 } from 'lucide-react';
import { CustomAnnouncementButton } from '@/components/CustomAnnouncementButton';
import { SystemConfigPanel } from '@/components/admin/SystemConfigPanel';

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [activeTab, setActiveTab] = useState("cadastro");
  const [isTvMode, setIsTvMode] = useState(false);
  const [pendingAdminTab, setPendingAdminTab] = useState<string | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  
  // Admin authentication
  const { isAdminAuthenticated, showPasswordDialog, setShowPasswordDialog, handleAuthSuccess, resetAuth } = useAdminAuth();
  
  // User session tracking
  const { createSession, updateActivity, incrementCounter, endSession } = useUserSession();
  
  // Auto-hide cursor in TV mode (after 3 seconds of inactivity)
  const { isCursorHidden } = useAutoHideCursor({ 
    timeout: 3000, 
    enabled: isTvMode && isLoggedIn 
  });
  
  // Auto-fullscreen for PWA in TV mode
  useAutoFullscreen({ 
    enabled: isTvMode && isLoggedIn, 
    targetRef: mainContainerRef 
  });

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
    
    // Check if trying to access admin tab without authentication
    if (value === "administrativo" && !isAdminAuthenticated) {
      setPendingAdminTab(value);
      setShowPasswordDialog(true);
      return;
    }
    
    setActiveTab(value);
    
    // Update session activity with current station
    updateActivity(value);
    
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
  
  // Handle admin auth success
  const onAdminAuthSuccess = () => {
    handleAuthSuccess(() => {
      if (pendingAdminTab) {
        setActiveTab(pendingAdminTab);
        setPendingAdminTab(null);
      }
    });
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
    forwardToEcg,
    forwardToCurativos,
    forwardToRaiox,
    forwardToEnfermaria,
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
  const handleAddPatient = async (name: string, priority?: 'normal' | 'priority' | 'emergency'): Promise<{ isDuplicate: boolean }> => {
    const result = await addPatient(name, priority);
    // Pré-cachear o nome em background (não bloqueia)
    if (!result.isDuplicate) {
      preCachePatientName(name);
      // Track registration in session
      incrementCounter('registrations_count');
    }
    return { isDuplicate: result.isDuplicate };
  };

  const handleLogout = useCallback(async () => {
    // End user session
    await endSession();
    
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("selectedUnitId");
    localStorage.removeItem("selectedUnitName");
    localStorage.removeItem("isTvMode");
    setIsLoggedIn(false);
    setUnitName("");
    setIsTvMode(false);
    resetAuth(); // Reset admin authentication on logout
  }, [resetAuth, endSession]);

  // Auto logout at 07:04 and 19:04 (except TV mode)
  useAutoLogout({ isTvMode, onLogout: handleLogout });

  const handleLogin = async (unitId: string, unitNameParam: string, tvMode?: boolean) => {
    setIsLoggedIn(true);
    setUnitName(unitNameParam);
    setIsTvMode(tvMode || false);
    
    // Create user session
    await createSession(unitNameParam, tvMode ? 'display' : 'cadastro', tvMode || false);
    
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
      <div 
        ref={mainContainerRef} 
        className={`min-h-screen-safe h-screen-safe bg-background relative overflow-hidden ${isCursorHidden ? 'cursor-none' : ''}`}
        style={isCursorHidden ? { cursor: 'none' } : undefined}
      >
        <PublicDisplay 
          currentTriageCall={currentTriageCall} 
          currentDoctorCall={currentDoctorCall}
          history={history} 
        />
        {/* Discreet logout button for TV mode - only visible when cursor is active */}
        <button
          onClick={handleLogout}
          className={`absolute bottom-2 right-2 p-2 rounded-full bg-white/5 hover:bg-white/20 text-white/30 hover:text-white/70 transition-all z-50 touch-target ${isCursorHidden ? 'opacity-0 pointer-events-none' : 'opacity-30 hover:opacity-100'}`}
          title="Sair do modo TV"
        >
          <LogOut className="w-4 h-4" />
        </button>
        {/* Android TV PWA install prompt */}
        <AndroidTVInstallPrompt />
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
                value="ecg" 
                className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-blue-500/20 flex-1 sm:flex-none min-w-0"
              >
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">ECG</span>
              </TabsTrigger>
              <TabsTrigger 
                value="curativos" 
                className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-amber-500/20 flex-1 sm:flex-none min-w-0"
              >
                <Bandage className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Curativos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="raiox" 
                className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-purple-500/20 flex-1 sm:flex-none min-w-0"
              >
                <Scan className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Raio X</span>
              </TabsTrigger>
              <TabsTrigger 
                value="enfermaria" 
                className="gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm data-[state=active]:bg-rose-500/20 flex-1 sm:flex-none min-w-0"
              >
                <BedDouble className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Enfermaria</span>
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
              onForwardToEcg={forwardToEcg}
              onForwardToCurativos={forwardToCurativos}
              onForwardToRaiox={forwardToRaiox}
              onForwardToEnfermaria={forwardToEnfermaria}
              onSendToTriageQueue={sendToTriageQueue}
              onSendToDoctorQueue={sendToDoctorQueue}
              onSendToEcgQueue={sendToEcgQueue}
              onSendToCurativosQueue={sendToCurativosQueue}
              onSendToRaioxQueue={sendToRaioxQueue}
              onSendToEnfermariaQueue={sendToEnfermariaQueue}
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
              onForwardToEcg={forwardToEcg}
              onForwardToCurativos={forwardToCurativos}
              onForwardToRaiox={forwardToRaiox}
              onForwardToEnfermaria={forwardToEnfermaria}
              onSendToEcgQueue={sendToEcgQueue}
              onSendToCurativosQueue={sendToCurativosQueue}
              onSendToRaioxQueue={sendToRaioxQueue}
              onSendToEnfermariaQueue={sendToEnfermariaQueue}
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
              onForwardToTriage={forwardToTriage}
              onSendToTriageQueue={sendToTriageQueue}
              onForwardToEcg={forwardToEcg}
              onForwardToCurativos={forwardToCurativos}
              onForwardToRaiox={forwardToRaiox}
              onForwardToEnfermaria={forwardToEnfermaria}
              onSendToEcgQueue={sendToEcgQueue}
              onSendToCurativosQueue={sendToCurativosQueue}
              onSendToRaioxQueue={sendToRaioxQueue}
              onSendToEnfermariaQueue={sendToEnfermariaQueue}
              onUpdateObservations={updatePatientObservations}
            />
          </main>
          <InternalChat station="medico" />
        </TabsContent>

        {/* ECG */}
        <TabsContent value="ecg" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <ServicePanel
              serviceName="Sala de Eletrocardiograma"
              serviceIcon="💓"
              serviceColor="blue"
              serviceKey="ecg"
              waitingPatients={waitingForEcg}
              currentCall={currentEcgCall}
              onCallPatient={callPatientToEcg}
              onFinishService={finishEcg}
              onRecall={recallEcg}
              onFinishWithoutCall={finishWithoutCall}
              onUpdateObservations={updatePatientObservations}
              onForwardToTriage={forwardToTriage}
              onSendToTriageQueue={sendToTriageQueue}
              onForwardToDoctor={forwardToDoctor}
              onSendToDoctorQueue={sendToDoctorQueue}
              onForwardToEcg={forwardToEcg}
              onForwardToCurativos={forwardToCurativos}
              onForwardToRaiox={forwardToRaiox}
              onForwardToEnfermaria={forwardToEnfermaria}
              onSendToEcgQueue={sendToEcgQueue}
              onSendToCurativosQueue={sendToCurativosQueue}
              onSendToRaioxQueue={sendToRaioxQueue}
              onSendToEnfermariaQueue={sendToEnfermariaQueue}
              soundKey="ecg"
            />
          </main>
          <InternalChat station="cadastro" />
        </TabsContent>

        {/* Curativos */}
        <TabsContent value="curativos" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <ServicePanel
              serviceName="Sala de Curativos"
              serviceIcon="🩹"
              serviceColor="amber"
              serviceKey="curativos"
              waitingPatients={waitingForCurativos}
              currentCall={currentCurativosCall}
              onCallPatient={callPatientToCurativos}
              onFinishService={finishCurativos}
              onRecall={recallCurativos}
              onFinishWithoutCall={finishWithoutCall}
              onUpdateObservations={updatePatientObservations}
              onForwardToTriage={forwardToTriage}
              onSendToTriageQueue={sendToTriageQueue}
              onForwardToDoctor={forwardToDoctor}
              onSendToDoctorQueue={sendToDoctorQueue}
              onForwardToEcg={forwardToEcg}
              onForwardToCurativos={forwardToCurativos}
              onForwardToRaiox={forwardToRaiox}
              onForwardToEnfermaria={forwardToEnfermaria}
              onSendToEcgQueue={sendToEcgQueue}
              onSendToCurativosQueue={sendToCurativosQueue}
              onSendToRaioxQueue={sendToRaioxQueue}
              onSendToEnfermariaQueue={sendToEnfermariaQueue}
              soundKey="curativos"
            />
          </main>
          <InternalChat station="cadastro" />
        </TabsContent>

        {/* Raio X */}
        <TabsContent value="raiox" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <ServicePanel
              serviceName="Sala de Raio X"
              serviceIcon="📡"
              serviceColor="purple"
              serviceKey="raiox"
              waitingPatients={waitingForRaiox}
              currentCall={currentRaioxCall}
              onCallPatient={callPatientToRaiox}
              onFinishService={finishRaiox}
              onRecall={recallRaiox}
              onFinishWithoutCall={finishWithoutCall}
              onUpdateObservations={updatePatientObservations}
              onForwardToTriage={forwardToTriage}
              onSendToTriageQueue={sendToTriageQueue}
              onForwardToDoctor={forwardToDoctor}
              onSendToDoctorQueue={sendToDoctorQueue}
              onForwardToEcg={forwardToEcg}
              onForwardToCurativos={forwardToCurativos}
              onForwardToRaiox={forwardToRaiox}
              onForwardToEnfermaria={forwardToEnfermaria}
              onSendToEcgQueue={sendToEcgQueue}
              onSendToCurativosQueue={sendToCurativosQueue}
              onSendToRaioxQueue={sendToRaioxQueue}
              onSendToEnfermariaQueue={sendToEnfermariaQueue}
              soundKey="raiox"
            />
          </main>
          <InternalChat station="cadastro" />
        </TabsContent>

        {/* Enfermaria */}
        <TabsContent value="enfermaria" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <ServicePanel
              serviceName="Enfermaria"
              serviceIcon="🛏️"
              serviceColor="rose"
              serviceKey="enfermaria"
              waitingPatients={waitingForEnfermaria}
              currentCall={currentEnfermariaCall}
              onCallPatient={callPatientToEnfermaria}
              onFinishService={finishEnfermaria}
              onRecall={recallEnfermaria}
              onFinishWithoutCall={finishWithoutCall}
              onUpdateObservations={updatePatientObservations}
              onForwardToTriage={forwardToTriage}
              onSendToTriageQueue={sendToTriageQueue}
              onForwardToDoctor={forwardToDoctor}
              onSendToDoctorQueue={sendToDoctorQueue}
              onForwardToEcg={forwardToEcg}
              onForwardToCurativos={forwardToCurativos}
              onForwardToRaiox={forwardToRaiox}
              onForwardToEnfermaria={forwardToEnfermaria}
              onSendToEcgQueue={sendToEcgQueue}
              onSendToCurativosQueue={sendToCurativosQueue}
              onSendToRaioxQueue={sendToRaioxQueue}
              onSendToEnfermariaQueue={sendToEnfermariaQueue}
              soundKey="enfermaria"
            />
          </main>
          <InternalChat station="cadastro" />
        </TabsContent>

        {/* Administrativo */}
        <TabsContent value="administrativo" className="mt-0 flex-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <main className="container-responsive py-4 sm:py-6 lg:py-8">
            <SystemConfigPanel />
          </main>
        </TabsContent>
      </Tabs>
      
      {/* Admin Password Dialog */}
      <AdminPasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false);
          setPendingAdminTab(null);
        }}
        onSuccess={onAdminAuthSuccess}
        title="Acesso ao Painel Administrativo"
        description="O painel administrativo contém configurações e estatísticas sensíveis. Digite a senha para continuar."
      />
    </div>
  );
};

export default Index;
