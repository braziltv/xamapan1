import { useCallPanel } from '@/hooks/useCallPanel';
import { PanelHeader } from '@/components/PanelHeader';
import { PatientRegistration } from '@/components/PatientRegistration';
import { TriagePanel } from '@/components/TriagePanel';
import { DoctorPanel } from '@/components/DoctorPanel';
import { PublicDisplay } from '@/components/PublicDisplay';
import { StatisticsPanel } from '@/components/StatisticsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, UserPlus, Activity, Stethoscope, BarChart3 } from 'lucide-react';

const Index = () => {
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
  } = useCallPanel();

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="cadastro" className="min-h-screen">
        <PanelHeader
          isAudioEnabled={isAudioEnabled}
          onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
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
            />
          </main>
        </TabsContent>

        {/* Public Display */}
        <TabsContent value="display" className="mt-0">
          <PublicDisplay 
            currentTriageCall={currentTriageCall} 
            currentDoctorCall={currentDoctorCall}
            history={history} 
          />
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
          Solução criada e cedida gratuitamente por Kalebe Gomes.
        </p>
      </footer>
    </div>
  );
};

export default Index;
