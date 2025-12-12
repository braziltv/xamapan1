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
  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";
    const storedUnitName = localStorage.getItem("selectedUnitName") || "";
    setIsLoggedIn(loggedIn);
    setUnitName(storedUnitName);
  }, []);

  // Handle tab change and fullscreen for public display
  const handleTabChange = (value: string) => {
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

  // Listen for fullscreen exit (ESC key) and switch tab
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && activeTab === "display") {
        setActiveTab("cadastro");
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [activeTab]);

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
    setIsLoggedIn(false);
    setUnitName("");
  };

  const handleLogin = (unitId: string, unitNameParam: string) => {
    setIsLoggedIn(true);
    setUnitName(unitNameParam);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // If in display mode, show only the PublicDisplay in fullscreen
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
    <div ref={mainContainerRef} className="min-h-screen bg-background gradient-mesh">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="min-h-screen flex flex-col">
        <PanelHeader
          isAudioEnabled={isAudioEnabled}
          onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
          onLogout={handleLogout}
          unitName={unitName}
        />

        {/* Tab Navigation */}
        <div className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-[72px] z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TabsList className="h-14 bg-transparent gap-1 flex-wrap">
              <TabsTrigger 
                value="cadastro" 
                className="gap-2 px-4 h-10 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all hover:bg-muted"
              >
                <UserPlus className="w-4 h-4" />
                <span className="font-semibold">Cadastro</span>
              </TabsTrigger>
              <TabsTrigger 
                value="display" 
                className="gap-2 px-4 h-10 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all hover:bg-muted"
              >
                <Monitor className="w-4 h-4" />
                <span className="font-semibold">Atendimento ao Público</span>
              </TabsTrigger>
              <TabsTrigger 
                value="triagem" 
                className="gap-2 px-4 h-10 rounded-xl data-[state=active]:bg-health-blue data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:bg-muted"
              >
                <Activity className="w-4 h-4" />
                <span className="font-semibold">Triagem</span>
              </TabsTrigger>
              <TabsTrigger 
                value="medico" 
                className="gap-2 px-4 h-10 rounded-xl data-[state=active]:bg-health-purple data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:bg-muted"
              >
                <Stethoscope className="w-4 h-4" />
                <span className="font-semibold">Médico</span>
              </TabsTrigger>
              <TabsTrigger 
                value="estatisticas" 
                className="gap-2 px-4 h-10 rounded-xl data-[state=active]:bg-health-teal data-[state=active]:text-white data-[state=active]:shadow-lg transition-all hover:bg-muted"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="font-semibold">Estatísticas</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Cadastro */}
        <TabsContent value="cadastro" className="mt-0 flex-1">
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
        <TabsContent value="triagem" className="mt-0 flex-1">
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
        <TabsContent value="medico" className="mt-0 flex-1">
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
        <TabsContent value="estatisticas" className="mt-0 flex-1">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <StatisticsPanel patients={patients} history={history} />
          </main>
        </TabsContent>

        {/* Footer */}
        <footer className="bg-card/80 backdrop-blur-xl border-t border-border/50 py-4 text-center mt-auto">
          <p className="text-sm text-muted-foreground">
            Solução criada por <span className="font-semibold text-primary">Kalebe Gomes</span>
          </p>
        </footer>
      </Tabs>
    </div>
  );
};

export default Index;