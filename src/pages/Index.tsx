import { useCallPanel } from '@/hooks/useCallPanel';
import { PanelHeader } from '@/components/PanelHeader';
import { CurrentCallDisplay } from '@/components/CurrentCallDisplay';
import { PatientQueue } from '@/components/PatientQueue';
import { CallHistory } from '@/components/CallHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PublicDisplay } from '@/components/PublicDisplay';
import { Monitor, Settings } from 'lucide-react';

const Index = () => {
  const {
    waitingPatients,
    currentCall,
    history,
    isAudioEnabled,
    setIsAudioEnabled,
    callPatient,
    recallPatient,
    markAsAttended,
    markAsMissed,
  } = useCallPanel();

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="control" className="min-h-screen">
        <PanelHeader
          isAudioEnabled={isAudioEnabled}
          onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
        />

        {/* Tab Navigation */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <TabsList className="h-12 bg-transparent">
              <TabsTrigger value="control" className="gap-2 data-[state=active]:bg-primary/10">
                <Settings className="w-4 h-4" />
                Painel de Controle
              </TabsTrigger>
              <TabsTrigger value="display" className="gap-2 data-[state=active]:bg-primary/10">
                <Monitor className="w-4 h-4" />
                Tela Pública
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Control Panel View */}
        <TabsContent value="control" className="mt-0">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Column - Current Call & Queue */}
              <div className="lg:col-span-2 space-y-8">
                <CurrentCallDisplay
                  currentCall={currentCall}
                  onRecall={recallPatient}
                  onMarkAttended={markAsAttended}
                  onMarkMissed={markAsMissed}
                />
                <PatientQueue
                  patients={waitingPatients}
                  onCallPatient={callPatient}
                />
              </div>

              {/* Sidebar - History */}
              <div className="space-y-6">
                <CallHistory history={history} />

                {/* Quick Stats */}
                <div className="bg-card rounded-xl p-6 shadow-health border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Estatísticas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-primary">
                        {waitingPatients.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Na fila</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-accent">
                        {history.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Chamados</p>
                    </div>
                  </div>
                </div>

                {/* eSUS Integration Notice */}
                <div className="bg-health-amber-light border border-health-amber/30 rounded-xl p-4">
                  <h4 className="font-semibold text-health-amber mb-2">
                    Integração eSUS
                  </h4>
                  <p className="text-sm text-foreground/80">
                    Para conectar ao eSUS e sincronizar pacientes em tempo real,
                    é necessário configurar a integração com o banco de dados.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </TabsContent>

        {/* Public Display View */}
        <TabsContent value="display" className="mt-0">
          <PublicDisplay currentCall={currentCall} history={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
