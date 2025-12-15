import { Volume2, VolumeX, Activity, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from './SettingsDialog';
import { useBrazilTime, formatBrazilTime } from '@/hooks/useBrazilTime';
interface PanelHeaderProps {
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onLogout: () => void;
  unitName: string;
}

export function PanelHeader({ isAudioEnabled, onToggleAudio, onLogout, unitName }: PanelHeaderProps) {
  const { currentTime } = useBrazilTime();

  return (
    <header className="bg-card shadow-health border-b border-border">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Mobile Layout - Two Rows */}
        <div className="flex flex-col sm:hidden py-2 gap-2">
          {/* First Row - Logo, Title, Logout */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-health flex items-center justify-center shadow-glow flex-shrink-0">
                <Activity className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-foreground truncate">
                  Chamada de Pacientes
                </h1>
                <p className="text-[10px] text-muted-foreground truncate">
                  {unitName}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="text-destructive hover:text-destructive h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Second Row - Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Time */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-mono font-medium text-foreground">
                {formatBrazilTime(currentTime, 'HH:mm')}
              </span>
              <span className="text-muted-foreground hidden xs:inline">
                {formatBrazilTime(currentTime, "dd/MM")}
              </span>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-1.5">
              {/* Audio Toggle */}
              <Button
                variant={isAudioEnabled ? "default" : "outline"}
                size="icon"
                onClick={onToggleAudio}
                className="h-8 w-8"
              >
                {isAudioEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>

              {/* Settings */}
              <SettingsDialog 
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="w-4 h-4" />
                  </Button>
                }
              />

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-medium text-accent">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Single Row */}
        <div className="hidden sm:flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-health flex items-center justify-center shadow-glow">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-foreground">
                Software de Chamada De Pacientes
              </h1>
              <p className="text-xs text-muted-foreground truncate max-w-[200px] lg:max-w-none">
                {unitName}
              </p>
              <p className="text-xs text-muted-foreground/70 hidden lg:block">
                Solução criada por Kalebe Gomes
              </p>
            </div>
          </div>

          {/* Time and Controls */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Current Date/Time */}
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground">
                {formatBrazilTime(currentTime, 'HH:mm:ss')}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBrazilTime(currentTime, "EEEE, dd 'de' MMMM")}
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
                  <span className="hidden lg:inline">Áudio Ativo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden lg:inline">Áudio Mudo</span>
                </>
              )}
            </Button>

            {/* Settings */}
            <SettingsDialog 
              trigger={
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden lg:inline">Config</span>
                </Button>
              }
            />

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
              <span className="hidden lg:inline">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
