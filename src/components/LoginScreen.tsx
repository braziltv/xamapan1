import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Tv, ArrowLeft, Building2, User, Lock, Globe, Wifi } from "lucide-react";
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
  const [userIp, setUserIp] = useState<string | null>(null);
  const [loadingIp, setLoadingIp] = useState(true);
  const { toast } = useToast();

  // Fetch user IP address
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIp(data.ip);
      } catch (error) {
        console.error('Erro ao obter IP:', error);
        setUserIp('Não disponível');
      } finally {
        setLoadingIp(false);
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

  // IP Address Component
  const IpAddressDisplay = () => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2 border border-border/50">
        <div className="flex items-center gap-1.5">
          {loadingIp ? (
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <Globe className="w-4 h-4 text-primary" />
          )}
          <span className="font-medium">IP:</span>
        </div>
        <span className="font-mono text-foreground">
          {loadingIp ? 'Obtendo...' : userIp}
        </span>
        <Wifi className="w-3 h-3 text-green-500 ml-1" />
      </div>
      <p className="text-xs text-muted-foreground/70 text-center">
        Registrado para prevenir acessos indevidos
      </p>
    </div>
  );

  // TV Unit Selection Screen
  if (showTvUnitSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/10 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations with animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-[pulse_5s_ease-in-out_infinite_0.5s]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite_1s]" />
        </div>

        <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/95 backdrop-blur-xl relative z-10 animate-[fadeInUp_0.6s_ease-out]">
          <CardHeader className="text-center space-y-4 pb-2">
            <div 
              className="mx-auto flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-xl shadow-primary/30 animate-[scaleIn_0.5s_ease-out_0.2s_both]"
            >
              <Tv className="w-12 h-12 text-primary-foreground" />
            </div>
            <div className="animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Modo TV
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Selecione a unidade de saúde que será exibida na TV
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-3 animate-[fadeInUp_0.5s_ease-out_0.4s_both]">
              <Label htmlFor="tv-unit" className="text-base font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Qual unidade exibir na TV?
              </Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-14 text-base border-2 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-card border-2">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="py-4 text-base cursor-pointer">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-3 pt-2 animate-[fadeInUp_0.5s_ease-out_0.5s_both]">
              <Button 
                variant="outline" 
                onClick={handleBackToLogin}
                className="flex-1 h-12 text-base border-2 hover:bg-muted transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleTvUnitConfirm}
                className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Confirmar
              </Button>
            </div>

            {/* IP Address */}
            <div className="pt-2 animate-[fadeInUp_0.5s_ease-out_0.6s_both]">
              <IpAddressDisplay />
            </div>
          </CardContent>
        </Card>

        <footer className="fixed bottom-6 left-0 right-0 text-center z-10 animate-[fadeInUp_0.6s_ease-out_0.7s_both]">
          <p className="text-xl font-semibold text-foreground/90 bg-card/80 backdrop-blur-md inline-block px-8 py-3 rounded-full shadow-lg border border-border/50">
            Solução criada e cedida gratuitamente por Kalebe Gomes.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/10 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations with animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-[pulse_5s_ease-in-out_infinite_0.5s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite_1s]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/95 backdrop-blur-xl relative z-10 animate-[fadeInUp_0.6s_ease-out]">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Logo with glow effect and animation */}
          <div className="mx-auto relative animate-[scaleIn_0.5s_ease-out_0.2s_both]">
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl scale-110 animate-[pulse_3s_ease-in-out_infinite]" />
            <img 
              src={xamaPanLogo} 
              alt="Xama Pan Logo" 
              className="w-36 h-36 object-contain relative z-10 rounded-2xl shadow-xl" 
            />
          </div>
          <div className="animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent leading-tight">
              CHAMADA DE PACIENTES POR VOZ
            </CardTitle>
            <p className="text-muted-foreground mt-2 text-sm">
              Sistema de gerenciamento de atendimento
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Unit Selection */}
            <div className="space-y-2 animate-[fadeInUp_0.4s_ease-out_0.35s_both]">
              <Label htmlFor="unit" className="text-base font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Unidade de Saúde
              </Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-12 text-base border-2 hover:border-primary/50 transition-all hover:shadow-md">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-card border-2">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="py-3 cursor-pointer">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Username */}
            <div className="space-y-2 animate-[fadeInUp_0.4s_ease-out_0.45s_both]">
              <Label htmlFor="username" className="text-base font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                className="h-12 text-base border-2 hover:border-primary/50 focus:border-primary transition-all hover:shadow-md"
              />
            </div>

            {/* Password */}
            <div className="space-y-2 animate-[fadeInUp_0.4s_ease-out_0.55s_both]">
              <Label htmlFor="password" className="text-base font-medium flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="h-12 text-base pr-12 border-2 hover:border-primary/50 focus:border-primary transition-all hover:shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="animate-[fadeInUp_0.4s_ease-out_0.65s_both]">
              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                Entrar
              </Button>
            </div>
          </form>

          {/* IP Address Display */}
          <div className="mt-6 animate-[fadeInUp_0.4s_ease-out_0.75s_both]">
            <IpAddressDisplay />
          </div>
        </CardContent>
      </Card>

      {/* Footer with increased size (25%) and animation */}
      <footer className="fixed bottom-6 left-0 right-0 text-center z-10 animate-[fadeInUp_0.6s_ease-out_0.85s_both]">
        <p className="text-xl font-semibold text-foreground/90 bg-card/80 backdrop-blur-md inline-block px-8 py-3 rounded-full shadow-lg border border-border/50">
          Solução criada e cedida gratuitamente por Kalebe Gomes.
        </p>
      </footer>
    </div>
  );
};

export default LoginScreen;
