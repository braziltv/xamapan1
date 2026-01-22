import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Volume2, Play, CheckCircle, XCircle, Loader2, Bell, Clock, Megaphone, Sunrise, Mic, Save, RefreshCw, User } from 'lucide-react';
import { toast } from 'sonner';
import { setManualThemeOverride } from './AutoNightMode';
import { supabase } from '@/integrations/supabase/client';

interface SettingsDialogProps {
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface VolumeSettings {
  notification: number;
  tts: number;
  timeNotification: number;
  timeAnnouncement: number;
}

interface PatientVoiceSettings {
  voiceId: string;
  volume: number;
  speed: number;
}

// Todas as vozes Google Cloud TTS disponíveis para pt-BR
const ALL_GOOGLE_VOICES = [
  // Vozes Femininas - Neural2 (Premium)
  { id: 'pt-BR-Neural2-A', name: 'Neural2-A (Feminina)', gender: 'female', quality: 'premium' },
  { id: 'pt-BR-Neural2-C', name: 'Neural2-C (Feminina)', gender: 'female', quality: 'premium' },
  // Vozes Masculinas - Neural2 (Premium)
  { id: 'pt-BR-Neural2-B', name: 'Neural2-B (Masculina)', gender: 'male', quality: 'premium' },
  // Vozes Femininas - Wavenet (Alta Qualidade)
  { id: 'pt-BR-Wavenet-A', name: 'Wavenet-A (Feminina)', gender: 'female', quality: 'high' },
  { id: 'pt-BR-Wavenet-C', name: 'Wavenet-C (Feminina)', gender: 'female', quality: 'high' },
  // Vozes Masculinas - Wavenet (Alta Qualidade)
  { id: 'pt-BR-Wavenet-B', name: 'Wavenet-B (Masculina)', gender: 'male', quality: 'high' },
  // Vozes Femininas - Standard (Econômico)
  { id: 'pt-BR-Standard-A', name: 'Standard-A (Feminina)', gender: 'female', quality: 'standard' },
  { id: 'pt-BR-Standard-C', name: 'Standard-C (Feminina)', gender: 'female', quality: 'standard' },
  // Vozes Masculinas - Standard (Econômico)
  { id: 'pt-BR-Standard-B', name: 'Standard-B (Masculina)', gender: 'male', quality: 'standard' },
];

// Vozes Google Cloud TTS disponíveis para pt-BR (para hora)
const GOOGLE_VOICES = {
  female: [
    { id: 'pt-BR-Neural2-A', name: 'Neural2-A (Recomendada)', quality: 'premium' },
    { id: 'pt-BR-Neural2-C', name: 'Neural2-C', quality: 'premium' },
    { id: 'pt-BR-Wavenet-A', name: 'Wavenet-A', quality: 'high' },
    { id: 'pt-BR-Wavenet-C', name: 'Wavenet-C', quality: 'high' },
    { id: 'pt-BR-Standard-A', name: 'Standard-A', quality: 'standard' },
    { id: 'pt-BR-Standard-C', name: 'Standard-C', quality: 'standard' },
  ],
  male: [
    { id: 'pt-BR-Neural2-B', name: 'Neural2-B (Recomendada)', quality: 'premium' },
    { id: 'pt-BR-Wavenet-B', name: 'Wavenet-B', quality: 'high' },
    { id: 'pt-BR-Standard-B', name: 'Standard-B', quality: 'standard' },
  ]
};

// Frases padrão para pré-cachear
const STANDARD_PHRASES = [
  // Frases de hora
  'Hora certa, são zero horas.',
  'Hora certa, é uma hora.',
  'Hora certa, são duas horas.',
  'Hora certa, são três horas.',
  'Hora certa, são quatro horas.',
  'Hora certa, são cinco horas.',
  'Hora certa, são seis horas.',
  'Hora certa, são sete horas.',
  'Hora certa, são oito horas.',
  'Hora certa, são nove horas.',
  'Hora certa, são dez horas.',
  'Hora certa, são onze horas.',
  'Hora certa, são doze horas.',
  'Hora certa, são treze horas.',
  'Hora certa, são quatorze horas.',
  'Hora certa, são quinze horas.',
  'Hora certa, são dezesseis horas.',
  'Hora certa, são dezessete horas.',
  'Hora certa, são dezoito horas.',
  'Hora certa, são dezenove horas.',
  'Hora certa, são vinte horas.',
  'Hora certa, são vinte e uma horas.',
  'Hora certa, são vinte e duas horas.',
  'Hora certa, são vinte e três horas.',
  // Frases de destino comuns
  'Por favor, dirija-se à Triagem.',
  'Por favor, dirija-se ao Consultório 1.',
  'Por favor, dirija-se ao Consultório 2.',
  'Por favor, dirija-se ao Consultório 3.',
  'Por favor, dirija-se à Sala de Curativos.',
  'Por favor, dirija-se à Sala de Medicação.',
  'Por favor, dirija-se à Enfermaria.',
  'Por favor, dirija-se ao Raio-X.',
  'Por favor, dirija-se ao ECG.',
  'Por favor, dirija-se à Recepção.',
  // Repetição
  'Repita.',
];

const DEFAULT_VOLUMES: VolumeSettings = {
  notification: 1,
  tts: 1,
  timeNotification: 1,
  timeAnnouncement: 1,
};

const DEFAULT_PATIENT_VOICE: PatientVoiceSettings = {
  voiceId: 'pt-BR-Neural2-A',
  volume: 1,
  speed: 1,
};

const AUTO_NIGHT_KEY = 'autoNightModeEnabled';
const GOOGLE_VOICE_FEMALE_KEY = 'googleVoiceFemale';
const GOOGLE_VOICE_MALE_KEY = 'googleVoiceMale';
const PATIENT_VOICE_KEY = 'patientVoiceSettings';

export function SettingsDialog({ trigger, open, onOpenChange }: SettingsDialogProps) {
  const [testName, setTestName] = useState('Maria da Silva');
  const [testDestination, setTestDestination] = useState('Triagem');
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingGoogleTTS, setIsTestingGoogleTTS] = useState(false);
  const [isTestingPatientVoice, setIsTestingPatientVoice] = useState(false);
  const [isCachingPhrases, setIsCachingPhrases] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const [volumes, setVolumes] = useState<VolumeSettings>(DEFAULT_VOLUMES);
  const [autoNightMode, setAutoNightMode] = useState(() => localStorage.getItem(AUTO_NIGHT_KEY) !== 'false');
  
  // Patient voice settings
  const [patientVoice, setPatientVoice] = useState<PatientVoiceSettings>(() => {
    try {
      const saved = localStorage.getItem(PATIENT_VOICE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PATIENT_VOICE;
    } catch {
      return DEFAULT_PATIENT_VOICE;
    }
  });
  const [patientVoiceChanged, setPatientVoiceChanged] = useState(false);
  
  // Google Cloud TTS voice settings (for hour announcements)
  const [googleVoiceFemale, setGoogleVoiceFemale] = useState(() => 
    localStorage.getItem(GOOGLE_VOICE_FEMALE_KEY) || 'pt-BR-Neural2-A'
  );
  const [googleVoiceMale, setGoogleVoiceMale] = useState(() => 
    localStorage.getItem(GOOGLE_VOICE_MALE_KEY) || 'pt-BR-Neural2-B'
  );

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

  const updatePatientVoice = useCallback((key: keyof PatientVoiceSettings, value: string | number) => {
    setPatientVoice(prev => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
    setPatientVoiceChanged(true);
  }, []);

  const savePatientVoice = useCallback(() => {
    localStorage.setItem(PATIENT_VOICE_KEY, JSON.stringify(patientVoice));
    setPatientVoiceChanged(false);
    toast.success('Configurações de voz salvas!');
  }, [patientVoice]);

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

  // Play audio buffer helper
  const playAudioBuffer = useCallback((buffer: ArrayBuffer, volume: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = volume;
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Audio playback failed'));
      };
      audio.play().catch(reject);
    });
  }, []);

  // Test patient voice
  const testPatientVoice = useCallback(async () => {
    setIsTestingPatientVoice(true);
    
    try {
      toast.info('Testando voz de chamada de paciente...');
      
      const testText = `${testName}. Por favor, dirija-se ao ${testDestination}.`;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: testText,
            voiceName: patientVoice.voiceId,
            speakingRate: patientVoice.speed,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao gerar áudio');
      }

      const audioBuffer = await response.arrayBuffer();
      await playAudioBuffer(audioBuffer, patientVoice.volume);

      toast.success('Teste de voz concluído!');
    } catch (error) {
      console.error('Erro ao testar voz de paciente:', error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Falha no teste'}`);
    } finally {
      setIsTestingPatientVoice(false);
    }
  }, [testName, testDestination, patientVoice, playAudioBuffer]);

  // Cache standard phrases
  const cacheStandardPhrases = useCallback(async () => {
    setIsCachingPhrases(true);
    
    try {
      toast.info('Gerando cache de frases padrão... Isso pode demorar alguns minutos.');
      
      let cached = 0;
      let errors = 0;
      
      for (const phrase of STANDARD_PHRASES) {
        try {
          // Generate TTS audio
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ 
                text: phrase,
                voiceName: patientVoice.voiceId,
                speakingRate: patientVoice.speed,
              }),
            }
          );

          if (!response.ok) {
            errors++;
            continue;
          }

          const audioBuffer = await response.arrayBuffer();
          
          // Generate hash for the phrase
          const encoder = new TextEncoder();
          const data = encoder.encode(`${phrase}_${patientVoice.voiceId}_${patientVoice.speed}`);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          // Upload to storage
          const fileName = `${hashHex}.mp3`;
          const { error: uploadError } = await supabase.storage
            .from('tts-cache')
            .upload(fileName, audioBuffer, {
              contentType: 'audio/mpeg',
              upsert: true,
            });
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            errors++;
          } else {
            cached++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (err) {
          console.error('Error caching phrase:', phrase, err);
          errors++;
        }
      }
      
      if (errors > 0) {
        toast.warning(`Cache concluído: ${cached} frases salvas, ${errors} erros`);
      } else {
        toast.success(`Cache concluído: ${cached} frases salvas com sucesso!`);
      }
      
      // Save the voice settings after successful caching
      savePatientVoice();
      
    } catch (error) {
      console.error('Erro ao cachear frases:', error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Falha no cache'}`);
    } finally {
      setIsCachingPhrases(false);
    }
  }, [patientVoice, savePatientVoice]);

  // Função para testar vozes do Google Cloud TTS (hora)
  const testGoogleTTS = useCallback(async () => {
    setIsTestingGoogleTTS(true);
    
    try {
      // Testar voz feminina
      toast.info('Testando voz feminina...');
      const femaleResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: 'Olá, boa tarde. Hora certa, são quinze horas.',
            voiceName: googleVoiceFemale,
          }),
        }
      );

      if (!femaleResponse.ok) {
        const error = await femaleResponse.json();
        throw new Error(error.error || 'Erro na voz feminina');
      }

      const femaleAudio = await femaleResponse.arrayBuffer();
      await playAudioBuffer(femaleAudio, volumes.timeAnnouncement);

      // Pequena pausa
      await new Promise(resolve => setTimeout(resolve, 500));

      // Testar voz masculina
      toast.info('Testando voz masculina...');
      const maleResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: 'Repita.',
            voiceName: googleVoiceMale,
          }),
        }
      );

      if (!maleResponse.ok) {
        const error = await maleResponse.json();
        throw new Error(error.error || 'Erro na voz masculina');
      }

      const maleAudio = await maleResponse.arrayBuffer();
      await playAudioBuffer(maleAudio, volumes.timeAnnouncement);

      toast.success('Teste de vozes Google Cloud concluído!');
    } catch (error) {
      console.error('Erro ao testar Google TTS:', error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Falha no teste'}`);
    } finally {
      setIsTestingGoogleTTS(false);
    }
  }, [googleVoiceFemale, googleVoiceMale, volumes.timeAnnouncement, playAudioBuffer]);

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

  const getQualityBadge = (quality: string) => {
    if (quality === 'premium') {
      return <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Premium</span>;
    }
    if (quality === 'high') {
      return <span className="text-xs bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded">Alta</span>;
    }
    return <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Standard</span>;
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => { 
        if (isOpen) loadVoices(); 
        onOpenChange?.(isOpen);
      }}
    >
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Auto Night Mode Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sunrise className="w-4 h-4 text-orange-500" />
                <div>
                  <Label htmlFor="auto-night-toggle" className="text-sm font-medium">
                    Modo Noturno Automático
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Claro 6:25-18:45, escuro 18:45-6:25
                  </p>
                </div>
              </div>
              <Switch
                id="auto-night-toggle"
                checked={autoNightMode}
                onCheckedChange={(checked) => {
                  setAutoNightMode(checked);
                  localStorage.setItem(AUTO_NIGHT_KEY, String(checked));
                  if (checked) {
                    setManualThemeOverride(false);
                  }
                  toast.success(checked ? 'Modo noturno automático ativado' : 'Modo noturno automático desativado');
                }}
              />
            </div>
          </div>

          {/* ===================== PATIENT CALL VOICE SECTION ===================== */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-sm font-medium pb-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-primary">Voz de Chamada de Pacientes</span>
            </div>

            {/* Voice Selector */}
            <div className="space-y-2">
              <Label className="text-sm">Voz Google Cloud TTS</Label>
              <Select 
                value={patientVoice.voiceId} 
                onValueChange={(value) => updatePatientVoice('voiceId', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_GOOGLE_VOICES.map(voice => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${voice.gender === 'female' ? 'bg-pink-500' : 'bg-blue-500'}`}></span>
                        {voice.name}
                        {getQualityBadge(voice.quality)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-green-500" />
                  <Label className="text-sm">Volume</Label>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(patientVoice.volume * 100)}%</span>
              </div>
              <Slider
                value={[patientVoice.volume]}
                onValueChange={([value]) => updatePatientVoice('volume', value)}
                min={0.1}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm">Velocidade</Label>
                </div>
                <span className="text-xs text-muted-foreground">{patientVoice.speed.toFixed(2)}x</span>
              </div>
              <Slider
                value={[patientVoice.speed]}
                onValueChange={([value]) => updatePatientVoice('speed', value)}
                min={0.5}
                max={1.5}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Test Voice Button */}
            <Button 
              variant="outline"
              onClick={testPatientVoice} 
              disabled={isTestingPatientVoice}
              className="w-full gap-2"
            >
              {isTestingPatientVoice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reproduzindo...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Testar Voz
                </>
              )}
            </Button>

            {/* Save and Cache Button */}
            {patientVoiceChanged && (
              <div className="flex gap-2">
                <Button 
                  variant="default"
                  onClick={savePatientVoice}
                  className="flex-1 gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
                <Button 
                  variant="secondary"
                  onClick={cacheStandardPhrases}
                  disabled={isCachingPhrases}
                  className="flex-1 gap-2"
                >
                  {isCachingPhrases ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cacheando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Salvar + Cache
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              💡 "Salvar + Cache" gera áudio prévio para frases de hora e destinos comuns, economizando API.
            </p>
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

          {/* Google Cloud TTS Voice Settings (Hour Announcements) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium border-b pb-2">
              <Mic className="w-4 h-4" />
              Vozes de Hora (Google Cloud TTS)
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  Voz Feminina (Anúncio de Hora)
                </Label>
                <Select 
                  value={googleVoiceFemale} 
                  onValueChange={(value) => {
                    setGoogleVoiceFemale(value);
                    localStorage.setItem(GOOGLE_VOICE_FEMALE_KEY, value);
                    toast.success('Voz feminina atualizada');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOOGLE_VOICES.female.map(voice => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="flex items-center gap-2">
                          {voice.name}
                          {getQualityBadge(voice.quality)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Voz Masculina ("Repita")
                </Label>
                <Select 
                  value={googleVoiceMale} 
                  onValueChange={(value) => {
                    setGoogleVoiceMale(value);
                    localStorage.setItem(GOOGLE_VOICE_MALE_KEY, value);
                    toast.success('Voz masculina atualizada');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOOGLE_VOICES.male.map(voice => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="flex items-center gap-2">
                          {voice.name}
                          {getQualityBadge(voice.quality)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline"
                onClick={testGoogleTTS} 
                disabled={isTestingGoogleTTS}
                className="w-full gap-2"
              >
                {isTestingGoogleTTS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Testar Vozes de Hora
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Neural2 = melhor qualidade, Wavenet = alta qualidade, Standard = econômico
              </p>
            </div>
          </div>

          {/* TTS Test Section (Browser) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium border-b pb-2">
              <Volume2 className="w-4 h-4" />
              Testar Áudio TTS (Navegador)
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
