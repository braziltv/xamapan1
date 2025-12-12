import { Volume2, VolumeX, Activity, LogOut, Clock } from 'lucide-react';
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
    <header className="bg-card/95 backdrop-blur-xl shadow-soft border-b border-border/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="icon-container-primary w-12 h-12">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                Software de Chamada
              </h1>
              <p className="text-sm text-primary font-medium">
                {unitName}
              </p>
            </div>
          </div>

          {/* Time and Controls */}
          <div className="flex items-center gap-3">
            {/* Current Date/Time */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-xl border border-border/50">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="text-right">
                <p className="text-lg font-bold font-mono text-foreground tabular-nums">
                  {format(currentTime, 'HH:mm:ss', { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>

            {/* Audio Toggle */}
            <Button
              variant={isAudioEnabled ? "default" : "outline"}
              size="sm"
              onClick={onToggleAudio}
              className={`gap-2 h-10 px-4 transition-all ${
                isAudioEnabled 
                  ? 'gradient-primary shadow-glow hover:opacity-90' 
                  : 'hover:bg-muted'
              }`}
            >
              {isAudioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Áudio</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Mudo</span>
                </>
              )}
            </Button>

            {/* Status indicator */}
            <div className="flex items-center gap-2 px-4 py-2 bg-health-green-light rounded-xl border border-health-green/20">
              <span className="status-dot-active" />
              <span className="text-sm font-semibold text-health-green">Online</span>
            </div>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="gap-2 h-10 px-4 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}