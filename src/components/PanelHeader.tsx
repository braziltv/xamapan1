import { Volume2, VolumeX, Activity, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';

interface PanelHeaderProps {
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onLogout: () => void;
  unitName: string;
}

export function PanelHeader({ isAudioEnabled, onToggleAudio, onLogout, unitName }: PanelHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-card shadow-health border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-health flex items-center justify-center shadow-glow">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Software de Chamada De Pacientes
              </h1>
              <p className="text-xs text-muted-foreground">
                {unitName}
              </p>
              <p className="text-xs text-muted-foreground/70">
                Solução criada por Kalebe Gomes
              </p>
            </div>
          </div>

          {/* Time and Controls */}
          <div className="flex items-center gap-4">
            {/* Current Date/Time */}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">
                {format(currentTime, 'HH:mm:ss', { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>

            {/* Audio Toggle */}
            <Button
              variant={isAudioEnabled ? "default" : "outline"}
              size="sm"
              onClick={onToggleAudio}
              className="gap-2"
            >
              {isAudioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Áudio Ativo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden sm:inline">Áudio Mudo</span>
                </>
              )}
            </Button>

            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-full">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium text-accent">Online</span>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
