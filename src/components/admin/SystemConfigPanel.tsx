import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Layers, MapPin, Users, Volume2, Settings2, BarChart3, FlaskConical, Tv, Send, HardDrive, Megaphone, Mic } from 'lucide-react';
import { UnitsManager } from './UnitsManager';
import { ModulesManager } from './ModulesManager';
import { DestinationsManager } from './DestinationsManager';
import { OperatorsManager } from './OperatorsManager';
import { TTSPhrasesManager } from './TTSPhrasesManager';
import { StatisticsDashboard } from './StatisticsDashboard';
import { SystemTestPanel } from './SystemTestPanel';
import { TelegramManager } from './TelegramManager';
import { DataStoragePanel } from './DataStoragePanel';
import { MarketingPanel } from './MarketingPanel';
import { VoiceConfigPanel } from './VoiceConfigPanel';
import { ActiveUsersPanel } from '../ActiveUsersPanel';
import { useUnits } from '@/hooks/useAdminData';
import { useNavigate } from 'react-router-dom';

export function SystemConfigPanel() {
  const { units, loading } = useUnits();
  const navigate = useNavigate();
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Selecionar a primeira unidade automaticamente
  useEffect(() => {
    if (units.length > 0 && !selectedUnitId) {
      setSelectedUnitId(units[0].id);
    }
  }, [units, selectedUnitId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Configurações do Sistema</h2>
        </div>
        
        {/* Links de instalação PWA */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/tv-setup')}
            className="gap-2"
          >
            <Tv className="w-4 h-4" />
            <span className="hidden sm:inline">Configurar</span> Painel TV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-12 mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Sessões</span>
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            <span className="hidden sm:inline">Dados</span>
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Unidades</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Módulos</span>
          </TabsTrigger>
          <TabsTrigger value="destinations" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Destinos</span>
          </TabsTrigger>
          <TabsTrigger value="operators" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Operadores</span>
          </TabsTrigger>
          <TabsTrigger value="voices" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Vozes</span>
          </TabsTrigger>
          <TabsTrigger value="tts" className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span className="hidden sm:inline">TTS</span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2">
            <Megaphone className="w-4 h-4" />
            <span className="hidden sm:inline">Marketing</span>
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Telegram</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4" />
            <span className="hidden sm:inline">Testes</span>
          </TabsTrigger>
        </TabsList>

        {/* Seletor de unidade (para abas que precisam) */}
        {activeTab !== 'units' && activeTab !== 'dashboard' && activeTab !== 'tests' && activeTab !== 'sessions' && activeTab !== 'storage' && activeTab !== 'voices' && (
          <Card className="mb-4">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Label className="whitespace-nowrap">Unidade:</Label>
                <Select 
                  value={selectedUnitId} 
                  onValueChange={setSelectedUnitId}
                  disabled={loading || units.length === 0}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {units.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground mt-2">
                  Nenhuma unidade cadastrada. Vá para a aba "Unidades" para criar uma.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <TabsContent value="dashboard">
          <StatisticsDashboard />
        </TabsContent>

        <TabsContent value="sessions">
          <ActiveUsersPanel />
        </TabsContent>

        <TabsContent value="storage">
          <DataStoragePanel />
        </TabsContent>

        <TabsContent value="units">
          <UnitsManager />
        </TabsContent>

        <TabsContent value="modules">
          {selectedUnitId ? (
            <ModulesManager unitId={selectedUnitId} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Selecione uma unidade para gerenciar os módulos.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="destinations">
          {selectedUnitId ? (
            <DestinationsManager unitId={selectedUnitId} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Selecione uma unidade para gerenciar os destinos.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="operators">
          {selectedUnitId ? (
            <OperatorsManager unitId={selectedUnitId} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Selecione uma unidade para gerenciar os operadores.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="voices">
          <VoiceConfigPanel unitName={units.find(u => u.id === selectedUnitId)?.name || localStorage.getItem('selectedUnit') || ''} />
        </TabsContent>

        <TabsContent value="tts">
          {selectedUnitId ? (
            <TTSPhrasesManager unitId={selectedUnitId} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Selecione uma unidade para gerenciar as frases TTS.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="marketing">
          {selectedUnitId ? (
            <MarketingPanel unitName={units.find(u => u.id === selectedUnitId)?.name || ''} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Selecione uma unidade para gerenciar o marketing.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="telegram">
          {selectedUnitId ? (
            <TelegramManager unitId={selectedUnitId} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Selecione uma unidade para gerenciar o Telegram.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tests">
          <SystemTestPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
