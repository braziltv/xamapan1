import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Tv, ArrowLeft, Clock, Shield, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useBrazilTime, formatBrazilTime } from "@/hooks/useBrazilTime";
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
  const { currentTime } = useBrazilTime();
  const [userIp, setUserIp] = useState<string>("");
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Fetch user IP
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => setUserIp(data.ip))
      .catch(() => setUserIp("Não disponível"));
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
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-2 sm:p-4 overflow-auto">
        <Card className="w-full max-w-[95vw] sm:max-w-md shadow-xl my-auto">
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
                <SelectContent className="bg-background max-w-[90vw]">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="py-2 sm:py-3 text-sm sm:text-base">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={handleBackToLogin}
                className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
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
        <footer className="fixed bottom-2 sm:bottom-6 left-0 right-0 text-center px-2">
          <p className="text-xs sm:text-base font-medium text-foreground/80 bg-background/60 backdrop-blur-sm inline-block px-3 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-sm">
            Solução criada e cedida gratuitamente por Kalebe Gomes.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-2 sm:p-4 overflow-auto relative">
      {/* Theme Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80"
        title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-primary" />
        )}
      </Button>

      <Card className="w-full max-w-[95vw] sm:max-w-md shadow-xl my-auto">
        <CardHeader className="text-center space-y-2 p-4 sm:p-6">
          <div className="mx-auto mb-2 sm:mb-4">
            <img src={xamaPanLogo} alt="Xama Pan Logo" className="w-20 h-20 sm:w-32 sm:h-32 object-contain" />
          </div>
          <CardTitle className="text-lg sm:text-2xl font-bold leading-tight">CHAMADA DE PACIENTES POR VOZ</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="unit" className="text-sm sm:text-base">Unidade de Saúde</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-background max-w-[90vw]">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="text-sm sm:text-base py-2">
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
            <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base">
              Entrar
            </Button>
          </form>

          {/* IP Address and Clock Section */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border space-y-2 sm:space-y-3">
            {/* IP Address */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                <div className="text-xs sm:text-sm">
                  <span className="font-medium text-foreground">IP: </span>
                  <span className="font-mono text-muted-foreground">{userIp || "Carregando..."}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
              Registrado para prevenir acessos indevidos
            </p>
            
            {/* Digital Clock */}
            <div className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <span className="font-mono text-base sm:text-lg font-bold text-foreground">
                {formatBrazilTime(currentTime, "HH:mm:ss")}
              </span>
            </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">
                {formatBrazilTime(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <footer className="fixed bottom-2 sm:bottom-6 left-0 right-0 text-center px-2">
        <p className="text-xs sm:text-base font-medium text-foreground/80 bg-background/60 backdrop-blur-sm inline-block px-3 sm:px-6 py-1.5 sm:py-2 rounded-full shadow-sm">
          Solução criada e cedida gratuitamente por Kalebe Gomes.
        </p>
      </footer>
    </div>
  );
};

export default LoginScreen;
