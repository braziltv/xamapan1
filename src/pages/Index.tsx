import { useState, useEffect, useRef } from 'react';
import { useCallPanel } from '@/hooks/useCallPanel';
import { PanelHeader } from '@/components/PanelHeader';
import { PatientRegistration } from '@/components/PatientRegistration';
import { TriagePanel } from '@/components/TriagePanel';
import { DoctorPanel } from '@/components/DoctorPanel';
import { PublicDisplay } from '@/components/PublicDisplay';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import LoginScreen from '@/components/LoginScreen';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, UserPlus, Activity, Stethoscope, BarChart3 } from 'lucide-react';

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
  } = useCallPanel();

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
      <div ref={mainContainerRef} className="min-h-screen bg-background">
        <PublicDisplay 
          currentTriageCall={currentTriageCall} 
          currentDoctorCall={currentDoctorCall}
          history={history} 
        />
      </div>
    );
  }

  // If in display mode (non-TV), show only the PublicDisplay in fullscreen
  if (activeTab === "display") {
    return (
      <div ref={mainContainerRef} className="min-h-screen bg-background">
        <PublicDisplay 
          currentTriageCall={currentTriageCall} 
          currentDoctorCall={currentDoctorCall}
          history={history} 
        />
      </div>
    );
  }

  return (
    <div ref={mainContainerRef} className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-screen">
        <PanelHeader
          isAudioEnabled={isAudioEnabled}
          onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
          onLogout={handleLogout}
          unitName={unitName}
        />

        {/* Tab Navigation */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TabsList className="h-12 bg-transparent flex-wrap">
              <TabsTrigger value="cadastro" className="gap-2 data-[state=active]:bg-primary/10">
                <UserPlus className="w-4 h-4" />
                Cadastro
              </TabsTrigger>
              <TabsTrigger value="display" className="gap-2 data-[state=active]:bg-primary/10">
                <Monitor className="w-4 h-4" />
                Atendimento ao Público
              </TabsTrigger>
              <TabsTrigger value="triagem" className="gap-2 data-[state=active]:bg-primary/10">
                <Activity className="w-4 h-4" />
                Triagem
              </TabsTrigger>
              <TabsTrigger value="medico" className="gap-2 data-[state=active]:bg-primary/10">
                <Stethoscope className="w-4 h-4" />
                Médico
              </TabsTrigger>
              <TabsTrigger value="estatisticas" className="gap-2 data-[state=active]:bg-primary/10">
                <BarChart3 className="w-4 h-4" />
                Estatísticas
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Cadastro */}
        <TabsContent value="cadastro" className="mt-0">
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <PatientRegistration
              patients={patients}
              onAddPatient={addPatient}
              onRemovePatient={removePatient}
              onDirectPatient={directPatient}
              onFinishWithoutCall={finishWithoutCall}
              onForwardToTriage={forwardToTriage}
              onForwardToDoctor={forwardToDoctor}
            />
          </main>
        </TabsContent>

        {/* Triagem */}
        <TabsContent value="triagem" className="mt-0">
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <TriagePanel
              waitingPatients={waitingForTriage}
              currentCall={currentTriageCall}
              onCallPatient={callPatientToTriage}
              onFinishTriage={finishTriage}
              onRecall={recallTriage}
              onDirectPatient={directPatient}
              onFinishWithoutCall={finishWithoutCall}
              onForwardToDoctor={forwardToDoctor}
            />
          </main>
        </TabsContent>

        {/* Médico */}
        <TabsContent value="medico" className="mt-0">
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DoctorPanel
              waitingPatients={waitingForDoctor}
              currentCall={currentDoctorCall}
              onCallPatient={callPatientToDoctor}
              onFinishConsultation={finishConsultation}
              onRecall={recallDoctor}
              onFinishWithoutCall={finishWithoutCall}
            />
          </main>
        </TabsContent>

        {/* Estatísticas */}
        <TabsContent value="estatisticas" className="mt-0">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <StatisticsPanel patients={patients} history={history} />
          </main>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center">
        <p className="text-sm text-muted-foreground">
          Solução criada por Kalebe Gomes
        </p>
      </footer>
    </div>
  );
};

export default Index;
