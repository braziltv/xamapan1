import { Volume2, VolumeX, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from './SettingsDialog';
import { useBrazilTime, formatBrazilTime } from '@/hooks/useBrazilTime';
import { HealthCrossIcon } from './HealthCrossIcon';
import { useTheme } from 'next-themes';
import { setManualThemeOverride } from './AutoNightMode';
import { ConnectionIndicator } from './ConnectionIndicator';
interface PanelHeaderProps {
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onLogout: () => void;
  unitName: string;
}

export function PanelHeader({ isAudioEnabled, onToggleAudio, onLogout, unitName }: PanelHeaderProps) {
  const { currentTime } = useBrazilTime();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setManualThemeOverride(true);
  };
  return (
    <header className="bg-card shadow-health border-b border-border">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Mobile Layout - Two Rows */}
        <div className="flex flex-col sm:hidden py-2 gap-2">
          {/* First Row - Logo, Title, Logout */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-lg bg-white/90 dark:bg-white/10 border border-red-500/30 flex items-center justify-center shadow-lg flex-shrink-0">
                <HealthCrossIcon size={40} />
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
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8"
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>

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
                unitName={unitName}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="w-4 h-4" />
                  </Button>
                }
              />

              {/* Status indicator */}
              <ConnectionIndicator />
            </div>
          </div>
        </div>

        {/* Desktop Layout - Single Row */}
        <div className="hidden sm:flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white/90 dark:bg-white/10 border border-red-500/30 flex items-center justify-center shadow-lg">
              <HealthCrossIcon size={48} />
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-foreground">
                Chamada de Pacientes
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

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-2"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4" />
                  <span className="hidden lg:inline">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  <span className="hidden lg:inline">Escuro</span>
                </>
              )}
            </Button>

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
              unitName={unitName}
              trigger={
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden lg:inline">Config</span>
                </Button>
              }
            />

            {/* Status indicator */}
            <ConnectionIndicator />

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
