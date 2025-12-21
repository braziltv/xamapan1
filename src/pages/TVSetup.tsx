import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tv, Check, Loader2, Settings, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HealthUnit {
  id: string;
  name: string;
  display_name: string;
}

const TVSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [units, setUnits] = useState<HealthUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [savedUnitName, setSavedUnitName] = useState("");

  // Check if TV is already configured
  useEffect(() => {
    const tvUnitId = localStorage.getItem("tv_permanent_unit_id");
    const tvUnitName = localStorage.getItem("tv_permanent_unit_name");
    
    if (tvUnitId && tvUnitName) {
      setIsConfigured(true);
      setSelectedUnit(tvUnitId);
      setSavedUnitName(tvUnitName);
    }
  }, []);

  // Fetch units from database
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const { data, error } = await supabase
          .from('units')
          .select('id, name, display_name')
          .eq('is_active', true)
          .order('display_name');
        
        if (error) throw error;
        setUnits(data || []);
      } catch (error) {
        console.error('Error fetching units:', error);
        toast({
          title: "Erro ao carregar unidades",
          description: "Não foi possível carregar a lista de unidades.",
          variant: "destructive",
        });
      } finally {
        setLoadingUnits(false);
      }
    };
    
    fetchUnits();
  }, [toast]);

  const handleSaveConfiguration = () => {
    if (!selectedUnit) {
      toast({
        title: "Selecione uma unidade",
        description: "Por favor, selecione a unidade de saúde para esta TV.",
        variant: "destructive",
      });
      return;
    }

    const unit = units.find(u => u.id === selectedUnit);
    const unitName = unit?.display_name || unit?.name || "";

    // Save permanently
    localStorage.setItem("tv_permanent_unit_id", selectedUnit);
    localStorage.setItem("tv_permanent_unit_name", unitName);
    
    // Also set current session
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("selectedUnitId", selectedUnit);
    localStorage.setItem("selectedUnitName", unitName);
    localStorage.setItem("isTvMode", "true");

    setIsConfigured(true);
    setSavedUnitName(unitName);

    toast({
      title: "Configuração salva!",
      description: `Esta TV exibirá: ${unitName}`,
    });
  };

  const handleStartTV = () => {
    const unitId = localStorage.getItem("tv_permanent_unit_id");
    const unitName = localStorage.getItem("tv_permanent_unit_name");

    if (unitId && unitName) {
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("selectedUnitId", unitId);
      localStorage.setItem("selectedUnitName", unitName);
      localStorage.setItem("isTvMode", "true");
      navigate("/");
    }
  };

  const handleReconfigure = () => {
    setIsConfigured(false);
    setSavedUnitName("");
  };

  const handleClearConfiguration = () => {
    localStorage.removeItem("tv_permanent_unit_id");
    localStorage.removeItem("tv_permanent_unit_name");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("selectedUnitId");
    localStorage.removeItem("selectedUnitName");
    localStorage.removeItem("isTvMode");
    
    setIsConfigured(false);
    setSelectedUnit("");
    setSavedUnitName("");

    toast({
      title: "Configuração removida",
      description: "A configuração desta TV foi limpa.",
    });
  };

  // Already configured - show status and start button
  if (isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900/30 via-background to-primary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-cyan-500/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40">
              <Check className="w-10 h-10 text-cyan-400" />
            </div>
            <CardTitle className="text-2xl font-bold">TV Configurada</CardTitle>
            <CardDescription className="text-base">
              Esta TV está configurada para exibir:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-foreground">
                {savedUnitName}
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleStartTV}
                className="w-full h-14 text-lg gap-3 bg-cyan-600 hover:bg-cyan-700"
              >
                <Tv className="w-6 h-6" />
                Iniciar Painel TV
              </Button>

              <Button 
                variant="outline"
                onClick={handleReconfigure}
                className="w-full h-12 gap-2"
              >
                <Settings className="w-5 h-5" />
                Alterar Unidade
              </Button>

              <Button 
                variant="ghost"
                onClick={handleClearConfiguration}
                className="w-full h-10 text-muted-foreground hover:text-destructive"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Configuration screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-900/30 via-background to-primary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-cyan-500/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-500/40">
            <Tv className="w-10 h-10 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Configuração da TV</CardTitle>
          <CardDescription className="text-base">
            Configure esta TV para exibir automaticamente o painel de chamadas da unidade selecionada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">Selecione a Unidade de Saúde</Label>
            {loadingUnits ? (
              <div className="flex items-center justify-center h-14 bg-muted/50 rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Carregando unidades...</span>
              </div>
            ) : (
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-14 text-base">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="py-3 text-base">
                      {unit.display_name || unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">O que acontece ao salvar?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• A unidade será salva permanentemente neste dispositivo</li>
              <li>• Ao abrir o app, a TV iniciará automaticamente</li>
              <li>• Não será necessário selecionar a unidade novamente</li>
            </ul>
          </div>

          <Button 
            onClick={handleSaveConfiguration}
            disabled={!selectedUnit || loadingUnits}
            className="w-full h-14 text-lg gap-3 bg-cyan-600 hover:bg-cyan-700"
          >
            <Check className="w-6 h-6" />
            Salvar e Iniciar
          </Button>

          <Button 
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full text-muted-foreground"
          >
            Voltar para o Login
          </Button>
        </CardContent>
      </Card>

      <footer className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-sm text-muted-foreground bg-background/60 backdrop-blur-sm inline-block px-4 py-2 rounded-full">
          Acesse esta página em: <span className="font-mono font-medium">/tv-setup</span>
        </p>
      </footer>
    </div>
  );
};

export default TVSetup;
