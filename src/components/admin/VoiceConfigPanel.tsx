import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Volume2, Play, Loader2, RefreshCw, Save, Mic, User, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceConfigPanelProps {
  unitName: string;
}

interface PatientVoiceSettings {
  voiceId: string;
  volume: number;
  speed: number;
}

// Todas as vozes Google Cloud TTS disponíveis para pt-BR
const ALL_GOOGLE_VOICES = [
  // Vozes Femininas - Neural2 (Premium)
  { id: 'pt-BR-Neural2-A', name: 'Neural2-A (Feminina Premium)', gender: 'female', quality: 'premium' },
  { id: 'pt-BR-Neural2-C', name: 'Neural2-C (Feminina Premium)', gender: 'female', quality: 'premium' },
  // Vozes Masculinas - Neural2 (Premium)
  { id: 'pt-BR-Neural2-B', name: 'Neural2-B (Masculina Premium)', gender: 'male', quality: 'premium' },
  // Vozes Femininas - Wavenet (Alta Qualidade)
  { id: 'pt-BR-Wavenet-A', name: 'Wavenet-A (Feminina Alta)', gender: 'female', quality: 'high' },
  { id: 'pt-BR-Wavenet-C', name: 'Wavenet-C (Feminina Alta)', gender: 'female', quality: 'high' },
  // Vozes Masculinas - Wavenet (Alta Qualidade)
  { id: 'pt-BR-Wavenet-B', name: 'Wavenet-B (Masculina Alta)', gender: 'male', quality: 'high' },
  // Vozes Femininas - Standard (Econômico)
  { id: 'pt-BR-Standard-A', name: 'Standard-A (Feminina Econômica)', gender: 'female', quality: 'standard' },
  { id: 'pt-BR-Standard-C', name: 'Standard-C (Feminina Econômica)', gender: 'female', quality: 'standard' },
  // Vozes Masculinas - Standard (Econômico)
  { id: 'pt-BR-Standard-B', name: 'Standard-B (Masculina Econômica)', gender: 'male', quality: 'standard' },
];

// Frases padrão para pré-cachear (hora e repetição)
const STANDARD_HOUR_PHRASES = [
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
  'Repita.',
];

// Função para gerar frase de destino com artigo correto
const generateDestinationPhrase = (displayName: string): string => {
  const name = displayName.trim();
  const lowerName = name.toLowerCase();
  
  // Palavras femininas comuns
  const feminineKeywords = ['sala', 'recepção', 'triagem', 'enfermaria', 'farmácia', 'secretaria', 'clínica'];
  const isFeminine = feminineKeywords.some(kw => lowerName.includes(kw));
  
  // Determinar artigo
  const article = isFeminine ? 'à' : 'ao';
  
  return `Por favor, dirija-se ${article} ${name}.`;
};

const DEFAULT_PATIENT_VOICE: PatientVoiceSettings = {
  voiceId: 'pt-BR-Neural2-A',
  volume: 1,
  speed: 1,
};

const PATIENT_VOICE_KEY = 'patientVoiceSettings';

export function VoiceConfigPanel({ unitName }: VoiceConfigPanelProps) {
  const [testName, setTestName] = useState('Maria da Silva');
  const [testDestination, setTestDestination] = useState('Triagem');
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isCachingPhrases, setIsCachingPhrases] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  
  // Patient voice settings
  const [patientVoice, setPatientVoice] = useState<PatientVoiceSettings>(() => {
    try {
      const saved = localStorage.getItem(PATIENT_VOICE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PATIENT_VOICE;
    } catch {
      return DEFAULT_PATIENT_VOICE;
    }
  });
  const [hasChanges, setHasChanges] = useState(false);

  const updatePatientVoice = useCallback((key: keyof PatientVoiceSettings, value: string | number) => {
    setPatientVoice(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const saveSettings = useCallback(() => {
    localStorage.setItem(PATIENT_VOICE_KEY, JSON.stringify(patientVoice));
    setHasChanges(false);
    toast.success('Configurações de voz salvas!');
  }, [patientVoice]);

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

  // Test voice
  const testVoice = useCallback(async () => {
    setIsTestingVoice(true);
    
    try {
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
      console.error('Erro ao testar voz:', error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Falha no teste'}`);
    } finally {
      setIsTestingVoice(false);
    }
  }, [testName, testDestination, patientVoice, playAudioBuffer]);

  // Cache standard phrases and unit destinations
  const cacheStandardPhrases = useCallback(async () => {
    setIsCachingPhrases(true);
    setCacheProgress(0);
    
    try {
      // First save the current settings
      localStorage.setItem(PATIENT_VOICE_KEY, JSON.stringify(patientVoice));
      setHasChanges(false);
      
      // Fetch destinations for the current unit
      let destinationPhrases: string[] = [];
      
      if (unitName) {
        // First get unit ID
        const { data: unitData } = await supabase
          .from('units')
          .select('id')
          .eq('name', unitName)
          .single();
        
        if (unitData?.id) {
          // Fetch destinations for this unit
          const { data: destinations } = await supabase
            .from('destinations')
            .select('display_name')
            .eq('unit_id', unitData.id)
            .eq('is_active', true);
          
          if (destinations && destinations.length > 0) {
            destinationPhrases = destinations.map(d => generateDestinationPhrase(d.display_name));
            console.log(`[Cache] Found ${destinations.length} destinations for unit ${unitName}`);
          }
        }
      }
      
      // Combine standard phrases with dynamic destination phrases
      const allPhrases = [...STANDARD_HOUR_PHRASES, ...destinationPhrases];
      
      toast.info(`Gerando cache de ${allPhrases.length} frases... Isso pode demorar alguns minutos.`);
      
      let cached = 0;
      let errors = 0;
      
      for (let i = 0; i < allPhrases.length; i++) {
        const phrase = allPhrases[i];
        setCacheProgress(Math.round(((i + 1) / allPhrases.length) * 100));
        
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
      
      const destCount = destinationPhrases.length;
      const hourCount = STANDARD_HOUR_PHRASES.length;
      
      if (errors > 0) {
        toast.warning(`Cache concluído: ${cached} frases salvas (${hourCount} hora + ${destCount} destinos), ${errors} erros`);
      } else {
        toast.success(`Cache concluído: ${cached} frases salvas (${hourCount} hora + ${destCount} destinos)!`);
      }
      
    } catch (error) {
      console.error('Erro ao cachear frases:', error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Falha no cache'}`);
    } finally {
      setIsCachingPhrases(false);
      setCacheProgress(0);
    }
  }, [patientVoice, unitName]);

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
    <div className="space-y-6">
      {/* Voice Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Configuração de Voz para Chamada de Pacientes
          </CardTitle>
          <CardDescription>
            Selecione a voz Google Cloud TTS que será usada em todas as chamadas de pacientes. 
            Configure volume e velocidade, depois teste e gere o cache para economizar API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Modelo de Voz</Label>
            <Select 
              value={patientVoice.voiceId} 
              onValueChange={(value) => updatePatientVoice('voiceId', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma voz" />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2 text-xs text-muted-foreground border-b mb-1">Vozes Femininas</div>
                {ALL_GOOGLE_VOICES.filter(v => v.gender === 'female').map(voice => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                      {voice.name}
                      {getQualityBadge(voice.quality)}
                    </span>
                  </SelectItem>
                ))}
                <div className="p-2 text-xs text-muted-foreground border-b border-t mt-1 mb-1">Vozes Masculinas</div>
                {ALL_GOOGLE_VOICES.filter(v => v.gender === 'male').map(voice => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {voice.name}
                      {getQualityBadge(voice.quality)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              💡 Vozes Premium (Neural2) têm qualidade superior. Vozes Standard são mais econômicas.
            </p>
          </div>

          {/* Volume and Speed Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Volume Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-green-500" />
                  Volume
                </Label>
                <span className="text-sm font-mono text-muted-foreground">{Math.round(patientVoice.volume * 100)}%</span>
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-500" />
                  Velocidade
                </Label>
                <span className="text-sm font-mono text-muted-foreground">{patientVoice.speed.toFixed(2)}x</span>
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
          </div>
        </CardContent>
      </Card>

      {/* Test Section Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-500" />
            Testar Voz
          </CardTitle>
          <CardDescription>
            Configure um nome e destino de exemplo para testar como a chamada irá soar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Nome de Teste</Label>
              <Input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Nome do paciente"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Destino de Teste</Label>
              <Input
                value={testDestination}
                onChange={(e) => setTestDestination(e.target.value)}
                placeholder="Ex: Consultório 1"
              />
            </div>
          </div>

          <Button 
            onClick={testVoice} 
            disabled={isTestingVoice}
            className="w-full gap-2"
            size="lg"
          >
            {isTestingVoice ? (
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

          <p className="text-xs text-muted-foreground text-center">
            A chamada será: "{testName}. Por favor, dirija-se ao {testDestination}."
          </p>
        </CardContent>
      </Card>

      {/* Save and Cache Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Salvar e Gerar Cache
          </CardTitle>
          <CardDescription>
            Após confirmar que a voz está correta, salve as configurações e gere o cache automático. 
            O cache pré-gera áudio para frases de hora e todos os destinos da unidade, economizando chamadas à API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCachingPhrases && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Gerando cache...</span>
                <span className="font-mono">{cacheProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${cacheProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={saveSettings}
              disabled={!hasChanges || isCachingPhrases}
              className="flex-1 gap-2"
            >
              <Save className="w-4 h-4" />
              Apenas Salvar
            </Button>
            
            <Button 
              onClick={cacheStandardPhrases}
              disabled={isCachingPhrases}
              className="flex-1 gap-2"
            >
              {isCachingPhrases ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando Cache...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar + Gerar Cache
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>📌 <strong>Frases cacheadas:</strong> 25 anúncios de hora + todos os destinos ativos da unidade</p>
            <p>💾 <strong>Economia:</strong> O cache evita chamadas repetidas à API do Google Cloud TTS</p>
            <p>⚠️ <strong>Importante:</strong> Gere novo cache se alterar voz, velocidade ou adicionar destinos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
