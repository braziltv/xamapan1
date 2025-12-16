import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Settings, Volume2, Play, CheckCircle, XCircle, Loader2, Sun, Moon, Bell, Clock, Megaphone, Sunrise } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

interface VolumeSettings {
  notification: number;
  tts: number;
  timeNotification: number;
  timeAnnouncement: number;
}

const DEFAULT_VOLUMES: VolumeSettings = {
  notification: 1,
  tts: 1,
  timeNotification: 1,
  timeAnnouncement: 1,
};

const AUTO_NIGHT_KEY = 'autoNightModeEnabled';

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const [testName, setTestName] = useState('Maria da Silva');
  const [testDestination, setTestDestination] = useState('Triagem');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { theme, setTheme } = useTheme();
  
  const [volumes, setVolumes] = useState<VolumeSettings>(DEFAULT_VOLUMES);
  const [autoNightMode, setAutoNightMode] = useState(() => localStorage.getItem(AUTO_NIGHT_KEY) !== 'false');

  // Load volumes from localStorage on mount
  useEffect(() => {
    const loadedVolumes: VolumeSettings = {
      notification: parseFloat(localStorage.getItem('volume-notification') || '1'),
      tts: parseFloat(localStorage.getItem('volume-tts') || '1'),
      timeNotification: parseFloat(localStorage.getItem('volume-time-notification') || '1'),
      timeAnnouncement: parseFloat(localStorage.getItem('volume-time-announcement') || '1'),
    };
    setVolumes(loadedVolumes);
  }, []);

  const updateVolume = useCallback((key: keyof VolumeSettings, value: number) => {
    setVolumes(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(`volume-${key === 'timeNotification' ? 'time-notification' : key === 'timeAnnouncement' ? 'time-announcement' : key}`, value.toString());
  }, []);

  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setAvailableVoices(voices);
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        setAvailableVoices(window.speechSynthesis.getVoices());
      }, { once: true });
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      const maxGain = 0.4 * volumes.notification;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(maxGain, audioContext.currentTime + startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };
    
    playTone(523.25, 0, 0.3);      // C5
    playTone(659.25, 0.15, 0.3);   // E5
    playTone(783.99, 0.3, 0.4);    // G5
    
    return new Promise<void>(resolve => setTimeout(resolve, 800));
  }, [volumes.notification]);

  const playTimeNotificationSound = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      const maxGain = 0.3 * volumes.timeNotification;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(maxGain, audioContext.currentTime + startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };
    
    // G5 (783.99 Hz) → C6 (1046.50 Hz) - soft ascending tones
    playTone(783.99, 0, 0.25);
    playTone(1046.50, 0.15, 0.35);
    
    return new Promise<void>(resolve => setTimeout(resolve, 600));
  }, [volumes.timeNotification]);

  const testTTS = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Play notification sound first
      await playNotificationSound();

      const text = `${testName}. Por favor, dirija-se ao ${testDestination}.`;

      // Get voices
      const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
        return new Promise((resolve) => {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            resolve(voices);
            return;
          }
          
          const handleVoicesChanged = () => {
            const loadedVoices = window.speechSynthesis.getVoices();
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
            resolve(loadedVoices);
          };
          
          window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
          
          setTimeout(() => {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
            resolve(window.speechSynthesis.getVoices());
          }, 1000);
        });
      };

      const voices = await getVoices();
      setAvailableVoices(voices);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.85;
      utterance.pitch = 1.2;
      utterance.volume = volumes.tts;

      // Try to select the best Portuguese voice
      const ptVoices = voices.filter(v => v.lang.includes('pt'));
      const preferredVoice = ptVoices.find(v => 
        v.name.includes('Google') || 
        v.name.includes('Microsoft') ||
        v.name.includes('Luciana') || 
        v.name.includes('Vitória') || 
        v.name.includes('Maria') ||
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('feminino')
      ) || ptVoices[0] || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.cancel();

      utterance.onend = () => {
        setIsTesting(false);
        setTestResult('success');
        toast.success('Teste de áudio concluído com sucesso!');
      };

      utterance.onerror = (e) => {
        console.error('TTS error:', e);
        setIsTesting(false);
        setTestResult('error');
        toast.error('Erro no teste de áudio. Verifique as configurações do navegador.');
      };

      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('Test TTS error:', error);
      setIsTesting(false);
      setTestResult('error');
      toast.error('Erro ao testar áudio TTS');
    }
  }, [testName, testDestination, playNotificationSound, volumes.tts]);

  const ptVoices = availableVoices.filter(v => v.lang.includes('pt'));

  return (
    <Dialog onOpenChange={(open) => { if (open) loadVoices(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Toggle Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                )}
                <Label htmlFor="theme-toggle" className="text-sm font-medium">
                  Tema Escuro
                </Label>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                disabled={autoNightMode}
              />
            </div>

            {/* Auto Night Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sunrise className="w-4 h-4 text-orange-500" />
                <div>
                  <Label htmlFor="auto-night-toggle" className="text-sm font-medium">
                    Modo Noturno Automático
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Escuro 19h-6h, claro 6h-19h
                  </p>
                </div>
              </div>
              <Switch
                id="auto-night-toggle"
                checked={autoNightMode}
                onCheckedChange={(checked) => {
                  setAutoNightMode(checked);
                  localStorage.setItem(AUTO_NIGHT_KEY, String(checked));
                  toast.success(checked ? 'Modo noturno automático ativado' : 'Modo noturno automático desativado');
                }}
              />
            </div>
          </div>

          {/* Volume Controls Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium border-b pb-2">
              <Volume2 className="w-4 h-4" />
              Controles de Volume
            </div>

            {/* Patient Call Notification Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" />
                  <Label className="text-sm">Notificação de Chamada</Label>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(volumes.notification * 100)}%</span>
              </div>
              <Slider
                value={[volumes.notification]}
                onValueChange={([value]) => updateVolume('notification', value)}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* TTS Voice Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-green-500" />
                  <Label className="text-sm">Voz TTS (Chamada)</Label>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(volumes.tts * 100)}%</span>
              </div>
              <Slider
                value={[volumes.tts]}
                onValueChange={([value]) => updateVolume('tts', value)}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Time Notification Sound Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <Label className="text-sm">Notificação de Hora</Label>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(volumes.timeNotification * 100)}%</span>
              </div>
              <Slider
                value={[volumes.timeNotification]}
                onValueChange={([value]) => updateVolume('timeNotification', value)}
                max={1}
                step={0.05}
                className="w-full"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={playTimeNotificationSound}
                className="w-full mt-1 text-xs"
              >
                <Play className="w-3 h-3 mr-1" />
                Testar Som
              </Button>
            </div>

            {/* Time Announcement Voice Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm">Voz de Hora</Label>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(volumes.timeAnnouncement * 100)}%</span>
              </div>
              <Slider
                value={[volumes.timeAnnouncement]}
                onValueChange={([value]) => updateVolume('timeAnnouncement', value)}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>
          </div>

          {/* TTS Test Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium border-b pb-2">
              <Volume2 className="w-4 h-4" />
              Testar Áudio TTS
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="testName">Nome para teste</Label>
                <Input
                  id="testName"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Digite um nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testDestination">Destino para teste</Label>
                <Input
                  id="testDestination"
                  value={testDestination}
                  onChange={(e) => setTestDestination(e.target.value)}
                  placeholder="Digite o destino"
                />
              </div>

              <Button 
                onClick={testTTS} 
                disabled={isTesting || !testName.trim()}
                className="w-full gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reproduzindo...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Testar Áudio
                  </>
                )}
              </Button>

              {testResult === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  Áudio funcionando corretamente!
                </div>
              )}

              {testResult === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                  <XCircle className="w-4 h-4" />
                  Erro no áudio. Verifique se o navegador permite TTS.
                </div>
              )}
            </div>
          </div>

          {/* Available Voices Info */}
          {availableVoices.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Vozes disponíveis em Português: {ptVoices.length}
              </div>
              {ptVoices.length > 0 ? (
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  {ptVoices.map((voice, idx) => (
                    <div key={idx} className="truncate">
                      {voice.name} ({voice.lang})
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded-lg">
                  Nenhuma voz em português encontrada. O navegador usará uma voz padrão.
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
