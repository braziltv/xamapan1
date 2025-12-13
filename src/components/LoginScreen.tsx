import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Tv, ArrowLeft } from "lucide-react";
import xamaPanLogo from "@/assets/xama-pan-logo.jpg";

const HEALTH_UNITS = [
  { id: "pa-pedro-jose", name: "Pronto Atendimento Pedro José de Menezes" },
  { id: "psf-aguinalda", name: "PSF Aguinalda Angélica" },
  { id: "ubs-maria-alves", name: "UBS Maria Alves de Mendonça" },
];

interface LoginScreenProps {
  onLogin: (unitId: string, unitName: string, isTvMode?: boolean) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [showTvUnitSelection, setShowTvUnitSelection] = useState(false);
  const [userIp, setUserIp] = useState<string>("Carregando...");
  const { toast } = useToast();

  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIp(data.ip);
      } catch (error) {
        setUserIp("Não disponível");
      }
    };
    fetchIp();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // TV user - show unit selection screen
    if (username === "tv" && password === "tv") {
      setShowTvUnitSelection(true);
      return;
    }
    
    if (!selectedUnit) {
      toast({
        title: "Selecione uma unidade",
        description: "Por favor, selecione a unidade de saúde.",
        variant: "destructive",
      });
      return;
    }
    
    // Regular user
    if (username === "saude" && password === "saude@1") {
      const unit = HEALTH_UNITS.find(u => u.id === selectedUnit);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("selectedUnitId", selectedUnit);
      localStorage.setItem("selectedUnitName", unit?.name || "");
      localStorage.setItem("isTvMode", "false");
      onLogin(selectedUnit, unit?.name || "", false);
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo ao sistema - ${unit?.name}`,
      });
    } else {
      toast({
        title: "Credenciais inválidas",
        description: "Usuário ou senha incorretos.",
        variant: "destructive",
      });
    }
  };

  const handleTvUnitConfirm = () => {
    if (!selectedUnit) {
      toast({
        title: "Selecione uma unidade",
        description: "Por favor, selecione a unidade de saúde para exibir na TV.",
        variant: "destructive",
      });
      return;
    }

    const unit = HEALTH_UNITS.find(u => u.id === selectedUnit);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("selectedUnitId", selectedUnit);
    localStorage.setItem("selectedUnitName", unit?.name || "");
    localStorage.setItem("isTvMode", "true");
    onLogin(selectedUnit, unit?.name || "", true);
    toast({
      title: "Modo TV ativado!",
      description: `Conectado - ${unit?.name}`,
    });
  };

  const handleBackToLogin = () => {
    setShowTvUnitSelection(false);
    setUsername("");
    setPassword("");
    setSelectedUnit("");
  };

  // TV Unit Selection Screen
  if (showTvUnitSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-2 sm:p-4 md:p-6">
        <Card className="w-full max-w-[95%] sm:max-w-md shadow-xl mx-auto">
          <CardHeader className="text-center space-y-2 p-4 sm:p-6">
            <div className="mx-auto mb-2 sm:mb-4 flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-primary/10">
              <Tv className="w-7 h-7 sm:w-10 sm:h-10 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Modo TV</CardTitle>
            <p className="text-sm sm:text-base text-muted-foreground">
              Selecione a unidade de saúde que será exibida na TV
            </p>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2">
              <Label htmlFor="tv-unit" className="text-sm sm:text-base">Qual unidade exibir na TV?</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="py-2 sm:py-3 text-sm sm:text-base">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={handleBackToLogin}
                className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleTvUnitConfirm}
                className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
              >
                Confirmar
              </Button>
            </div>
          </CardContent>
        </Card>
        <footer className="fixed bottom-2 sm:bottom-4 md:bottom-6 left-0 right-0 text-center px-2">
          <p className="text-xs sm:text-sm md:text-base font-medium text-foreground/80 bg-background/60 backdrop-blur-sm inline-block px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full shadow-sm">
            Solução criada e cedida gratuitamente por Kalebe Gomes.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-2 sm:p-4 md:p-6">
      <Card className="w-full max-w-[95%] sm:max-w-md shadow-xl mx-auto">
        <CardHeader className="text-center space-y-2 p-4 sm:p-6">
          <div className="mx-auto mb-2 sm:mb-4">
            <img src={xamaPanLogo} alt="Xama Pan Logo" className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain" />
          </div>
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold leading-tight">CHAMADA DE PACIENTES POR VOZ</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="unit" className="text-sm sm:text-base">Unidade de Saúde</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="text-sm sm:text-base py-2 sm:py-2.5">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="username" className="text-sm sm:text-base">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                className="h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="pr-10 h-10 sm:h-11 text-sm sm:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2">
              Entrar
            </Button>
            
            <div className="mt-4 pt-4 border-t border-border/50 text-center space-y-1">
              <p className="text-xs sm:text-sm font-mono text-muted-foreground">
                IP: <span className="text-foreground font-semibold">{userIp}</span>
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground/70">
                Registrado para prevenir acessos indevidos
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
      <footer className="fixed bottom-2 sm:bottom-4 md:bottom-6 left-0 right-0 text-center px-2">
        <p className="text-xs sm:text-sm md:text-base font-medium text-foreground/80 bg-background/60 backdrop-blur-sm inline-block px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-full shadow-sm">
          Solução criada e cedida gratuitamente por Kalebe Gomes.
        </p>
      </footer>
    </div>
  );
};

export default LoginScreen;
