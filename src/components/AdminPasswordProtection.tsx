import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminPasswordProtectionProps {
  children: React.ReactNode;
  title?: string;
}

// Default admin password - can be changed in localStorage
const DEFAULT_ADMIN_PASSWORD = '1234';
const PASSWORD_STORAGE_KEY = 'adminPassword';
const AUTH_SESSION_KEY = 'adminAuthenticated';
const AUTH_EXPIRY_KEY = 'adminAuthExpiry';

// Session duration in milliseconds (30 minutes)
const SESSION_DURATION = 30 * 60 * 1000;

export function AdminPasswordProtection({ children, title = 'Área Administrativa' }: AdminPasswordProtectionProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check for existing valid session
  useEffect(() => {
    const checkSession = () => {
      const authenticated = localStorage.getItem(AUTH_SESSION_KEY) === 'true';
      const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
      
      if (authenticated && expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          setIsAuthenticated(true);
        } else {
          // Session expired
          localStorage.removeItem(AUTH_SESSION_KEY);
          localStorage.removeItem(AUTH_EXPIRY_KEY);
        }
      }
      setIsLoading(false);
    };
    
    checkSession();
  }, []);

  const getStoredPassword = (): string => {
    return localStorage.getItem(PASSWORD_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const storedPassword = getStoredPassword();
    
    if (password === storedPassword) {
      // Create session
      const expiry = Date.now() + SESSION_DURATION;
      localStorage.setItem(AUTH_SESSION_KEY, 'true');
      localStorage.setItem(AUTH_EXPIRY_KEY, String(expiry));
      setIsAuthenticated(true);
      setPassword('');
      toast({
        title: 'Acesso liberado',
        description: 'Você tem acesso por 30 minutos.',
      });
    } else {
      toast({
        title: 'Senha incorreta',
        description: 'A senha informada está incorreta.',
        variant: 'destructive',
      });
      setPassword('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    setIsAuthenticated(false);
    toast({
      title: 'Sessão encerrada',
      description: 'Você foi desconectado da área administrativa.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Card className="w-full max-w-md border-primary/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Digite a senha para acessar esta área protegida
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha"
                    className="pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full gap-2">
                <ShieldCheck className="w-4 h-4" />
                Acessar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Logout button */}
      <div className="absolute top-0 right-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground gap-1"
        >
          <Lock className="w-3 h-3" />
          Bloquear
        </Button>
      </div>
      {children}
    </div>
  );
}

// Component to change admin password
export function ChangeAdminPassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    const storedPassword = localStorage.getItem(PASSWORD_STORAGE_KEY) || DEFAULT_ADMIN_PASSWORD;
    
    if (currentPassword !== storedPassword) {
      toast({
        title: 'Senha atual incorreta',
        description: 'A senha atual informada está incorreta.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword.length < 4) {
      toast({
        title: 'Senha muito curta',
        description: 'A nova senha deve ter pelo menos 4 caracteres.',
        variant: 'destructive',
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
        variant: 'destructive',
      });
      return;
    }
    
    localStorage.setItem(PASSWORD_STORAGE_KEY, newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    
    toast({
      title: 'Senha alterada',
      description: 'A senha administrativa foi alterada com sucesso.',
    });
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Lock className="w-5 h-5" />
          Alterar Senha Administrativa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Senha atual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button type="submit" className="gap-2 bg-amber-600 hover:bg-amber-700">
              <Lock className="w-4 h-4" />
              Alterar Senha
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded"
              />
              Mostrar senhas
            </label>
          </div>
        </form>
        <p className="text-xs text-muted-foreground mt-4">
          Senha padrão: <code className="bg-muted px-1 rounded">1234</code>. 
          Altere para uma senha segura.
        </p>
      </CardContent>
    </Card>
  );
}
