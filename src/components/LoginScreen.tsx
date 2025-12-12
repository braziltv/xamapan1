import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Eye, EyeOff, Heart, Shield } from "lucide-react";

const HEALTH_UNITS = [
  { id: "pa-pedro-jose", name: "Pronto Atendimento Pedro José de Menezes" },
  { id: "psf-aguinalda", name: "PSF Aguinalda Angélica" },
  { id: "ubs-maria-alves", name: "UBS Maria Alves de Mendonça" },
];

interface LoginScreenProps {
  onLogin: (unitId: string, unitName: string) => void;
}

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUnit) {
      toast({
        title: "Selecione uma unidade",
        description: "Por favor, selecione a unidade de saúde.",
        variant: "destructive",
      });
      return;
    }
    
    if (username === "saude" && password === "saude@1") {
      const unit = HEALTH_UNITS.find(u => u.id === selectedUnit);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("selectedUnitId", selectedUnit);
      localStorage.setItem("selectedUnitName", unit?.name || "");
      onLogin(selectedUnit, unit?.name || "");
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

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-health-purple/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-health-teal/5 rounded-full blur-3xl" />
      
      <Card className="w-full max-w-md shadow-float border-0 bg-card/95 backdrop-blur-xl animate-scale-in relative z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Logo */}
          <div className="mx-auto relative">
            <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-bounce-in">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-health-green rounded-lg flex items-center justify-center shadow-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <div className="space-y-1">
            <CardTitle className="text-2xl font-extrabold text-gradient">
              Software de Chamada
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Sistema de Gestão de Pacientes
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-sm font-semibold">
                Unidade de Saúde
              </Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-12 bg-muted/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border shadow-xl">
                  {HEALTH_UNITS.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="cursor-pointer">
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold">
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                className="h-12 bg-muted/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
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
                  className="h-12 pr-12 bg-muted/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Entrar no Sistema
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <footer className="fixed bottom-6 text-center w-full">
        <p className="text-sm text-muted-foreground/80 font-medium">
          Solução criada e cedida gratuitamente por <span className="text-primary font-semibold">Kalebe Gomes</span>
        </p>
      </footer>
    </div>
  );
};

export default LoginScreen;