import { useState } from "react";
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
  const { toast } = useToast();

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
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto mb-4 flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
              <Tv className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Modo TV</CardTitle>
            <p className="text-muted-foreground">
              Selecione a unidade de saúde que será exibida na TV
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tv-unit">Qual unidade exibir na TV?</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="py-3">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleBackToLogin}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleTvUnitConfirm}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </CardContent>
        </Card>
        <footer className="fixed bottom-6 left-0 right-0 text-center">
          <p className="text-base font-medium text-foreground/80 bg-background/60 backdrop-blur-sm inline-block px-6 py-2 rounded-full shadow-sm">
            Solução criada e cedida gratuitamente por Kalebe Gomes.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <img src={xamaPanLogo} alt="Xama Pan Logo" className="w-32 h-32 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">CHAMADA DE PACIENTES POR VOZ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unidade de Saúde</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="pr-10"
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
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
      <footer className="fixed bottom-6 left-0 right-0 text-center">
        <p className="text-base font-medium text-foreground/80 bg-background/60 backdrop-blur-sm inline-block px-6 py-2 rounded-full shadow-sm">
          Solução criada e cedida gratuitamente por Kalebe Gomes.
        </p>
      </footer>
    </div>
  );
};

export default LoginScreen;
