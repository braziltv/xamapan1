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
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-auto min-h-[56px] py-2 gap-2">
          {/* Logo and Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl gradient-health flex items-center justify-center shadow-glow flex-shrink-0">
              <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-bold text-foreground truncate">
                Software de Chamada De Pacientes
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {unitName}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground/70 hidden sm:block">
                Solução criada por Kalebe Gomes
              </p>
            </div>
          </div>

          {/* Time and Controls */}
          <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0">
            {/* Current Date/Time */}
            <div className="text-right hidden md:block">
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
              className="gap-1 sm:gap-2 px-2 sm:px-3"
            >
              {isAudioEnabled ? (
                <>
                  <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden lg:inline">Áudio Ativo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden lg:inline">Áudio Mudo</span>
                </>
              )}
            </Button>

            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-accent/10 rounded-full">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium text-accent">Online</span>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="gap-1 sm:gap-2 text-destructive hover:text-destructive px-2 sm:px-3"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
