import { useState } from 'react';
import { Volume2, VolumeX, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsDialog } from './SettingsDialog';
import { AdminPasswordDialog } from './AdminPasswordDialog';
import { useBrazilTime, formatBrazilTime } from '@/hooks/useBrazilTime';
import { HealthCrossIcon } from './HealthCrossIcon';
import { useTheme } from 'next-themes';
import { setManualThemeOverride } from './AutoNightMode';
import { ConnectionIndicator } from './ConnectionIndicator';
import { HeaderStatsWidget } from './HeaderStatsWidget';
interface PanelHeaderProps {
  isAudioEnabled: boolean;
  onToggleAudio: () => void;
  onLogout: () => void;
  unitName: string;
}

export function PanelHeader({ isAudioEnabled, onToggleAudio, onLogout, unitName }: PanelHeaderProps) {
  const { currentTime } = useBrazilTime();
  
  // Abbreviate "Pronto Atendimento" to "P.A" for display
  const displayUnitName = unitName.replace(/Pronto Atendimento/gi, 'P.A');
  const { theme, setTheme } = useTheme();
  const [showSettingsPasswordDialog, setShowSettingsPasswordDialog] = useState(false);
  const [isSettingsAuthenticated, setIsSettingsAuthenticated] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setManualThemeOverride(true);
  };

  const handleSettingsClick = () => {
    if (isSettingsAuthenticated) {
      setOpenSettings(true);
    } else {
      setShowSettingsPasswordDialog(true);
    }
  };

  const handleSettingsAuthSuccess = () => {
    setIsSettingsAuthenticated(true);
    setShowSettingsPasswordDialog(false);
    setOpenSettings(true);
  };

  return (
    <>
    <header className="bg-card shadow-health border-b border-border">
      <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Mobile Layout - Stacked Rows (< 640px) */}
        <div className="flex flex-col sm:hidden py-1.5 xs:py-2 gap-1.5 xs:gap-2">
          {/* First Row - Logo, Title, Logout */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 flex-1">
              <div className="w-9 h-9 xs:w-10 xs:h-10 rounded-lg bg-white/90 dark:bg-white/10 border border-red-500/30 flex items-center justify-center shadow-lg flex-shrink-0">
                <HealthCrossIcon size={28} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xs xs:text-sm font-bold text-foreground truncate">
                  Chamada de Pacientes
                </h1>
                <p className="text-[9px] xs:text-[10px] text-muted-foreground truncate max-w-[120px] xs:max-w-[160px]">
                  {displayUnitName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <ConnectionIndicator />
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="text-destructive hover:text-destructive h-7 w-7 xs:h-8 xs:w-8"
              >
                <LogOut className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              </Button>
            </div>
          </div>
          
          {/* Second Row - Stats + Time + Controls */}
          <div className="flex items-center justify-between gap-1.5 xs:gap-2">
            {/* Stats Widget - scrollable on very small screens */}
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <HeaderStatsWidget unitName={unitName} />
            </div>
            
            {/* Time + Controls - fixed on right */}
            <div className="flex items-center gap-1 xs:gap-1.5 flex-shrink-0">
              {/* Time - compact */}
              <span className="font-mono text-[10px] xs:text-xs font-medium text-foreground whitespace-nowrap">
                {formatBrazilTime(currentTime, 'HH:mm')}
              </span>
              
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-7 w-7 xs:h-8 xs:w-8"
                title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                ) : (
                  <Moon className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                )}
              </Button>

              {/* Audio Toggle */}
              <Button
                variant={isAudioEnabled ? "default" : "outline"}
                size="icon"
                onClick={onToggleAudio}
                className="h-7 w-7 xs:h-8 xs:w-8"
              >
                {isAudioEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                )}
              </Button>

              {/* Settings */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 xs:h-8 xs:w-8"
                onClick={handleSettingsClick}
              >
                <Settings className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tablet Layout (640px - 1024px) */}
        <div className="hidden sm:flex lg:hidden items-center justify-between h-12 md:h-14 gap-2">
          {/* Logo and Title - Compact */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-white/90 dark:bg-white/10 border border-red-500/30 flex items-center justify-center shadow-lg flex-shrink-0">
              <HealthCrossIcon size={32} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-base font-bold text-foreground truncate">
                Chamada de Pacientes
              </h1>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate max-w-[100px] md:max-w-[140px]">
                {displayUnitName}
              </p>
            </div>
          </div>

          {/* Stats Widget - Center */}
          <div className="flex-1 flex justify-center min-w-0 mx-2">
            <HeaderStatsWidget unitName={unitName} />
          </div>

          {/* Controls - Right */}
          <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
            {/* Time - Compact */}
            <div className="text-right hidden md:block mr-1">
              <p className="text-xs font-medium text-foreground font-mono">
                {formatBrazilTime(currentTime, 'HH:mm')}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button
              variant={isAudioEnabled ? "default" : "outline"}
              size="icon"
              onClick={onToggleAudio}
              className="h-8 w-8"
            >
              {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleSettingsClick}
            >
              <Settings className="w-4 h-4" />
            </Button>

            <ConnectionIndicator />

            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="text-destructive hover:text-destructive h-8 w-8"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Desktop Layout (>= 1024px) */}
        <div className="hidden lg:flex items-center justify-between h-14 xl:h-16 gap-3 xl:gap-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-2 xl:gap-3 flex-shrink-0">
            <div className="w-11 h-11 xl:w-14 xl:h-14 rounded-xl bg-white/90 dark:bg-white/10 border border-red-500/30 flex items-center justify-center shadow-lg">
              <HealthCrossIcon size={36} />
            </div>
            <div>
              <h1 className="text-base xl:text-lg 2xl:text-xl font-bold text-foreground whitespace-nowrap">
                Chamada de Pacientes
              </h1>
              <p className="text-[10px] xl:text-xs text-muted-foreground truncate max-w-[140px] xl:max-w-[180px] 2xl:max-w-none">
                {displayUnitName}
              </p>
              <p className="text-[9px] xl:text-[10px] text-muted-foreground/70 hidden xl:block">
                Solução criada por Kalebe Gomes
              </p>
            </div>
          </div>

          {/* Stats Widget - Center with flex grow */}
          <div className="flex-1 flex justify-center mx-2 xl:mx-4">
            <HeaderStatsWidget unitName={unitName} />
          </div>

          {/* Time and Controls */}
          <div className="flex items-center gap-1.5 xl:gap-2 2xl:gap-3 flex-shrink-0">
            {/* Current Date/Time */}
            <div className="text-right mr-1 xl:mr-2">
              <p className="text-xs xl:text-sm font-medium text-foreground font-mono">
                {formatBrazilTime(currentTime, 'HH:mm:ss')}
              </p>
              <p className="text-[9px] xl:text-[10px] 2xl:text-xs text-muted-foreground hidden xl:block">
                {formatBrazilTime(currentTime, "EEEE, dd 'de' MMMM")}
              </p>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-1.5 h-8 px-2 xl:px-3"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4" />
                  <span className="hidden xl:inline text-xs">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  <span className="hidden xl:inline text-xs">Escuro</span>
                </>
              )}
            </Button>

            {/* Audio Toggle */}
            <Button
              variant={isAudioEnabled ? "default" : "outline"}
              size="sm"
              onClick={onToggleAudio}
              className="gap-1.5 h-8 px-2 xl:px-3"
            >
              {isAudioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden xl:inline text-xs">Ativo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden xl:inline text-xs">Mudo</span>
                </>
              )}
            </Button>

            {/* Settings */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1.5 h-8 px-2 xl:px-3"
              onClick={handleSettingsClick}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden 2xl:inline text-xs">Config</span>
            </Button>

            <ConnectionIndicator />

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="gap-1.5 text-destructive hover:text-destructive h-8 px-2 xl:px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xl:inline text-xs">Sair</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
    
    {/* Settings Dialog */}
    <SettingsDialog 
      trigger={null}
      open={openSettings}
      onOpenChange={setOpenSettings}
    />
    
    {/* Settings Password Dialog */}
    <AdminPasswordDialog
      isOpen={showSettingsPasswordDialog}
      onClose={() => setShowSettingsPasswordDialog(false)}
      onSuccess={handleSettingsAuthSuccess}
      title="Acesso às Configurações"
      description="As configurações do sistema requerem autenticação administrativa."
    />
    </>
  );
}
