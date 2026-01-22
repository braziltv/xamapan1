import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Play, Loader2, Check, Megaphone, Clock, Volume2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface VoicePitchSettingsProps {
  unitName: string;
}

// Storage keys
const PATIENT_CALL_PITCH_KEY = 'patientCallPitch';
const HOUR_ANNOUNCEMENT_PITCH_KEY = 'hourAnnouncementPitch';
const MARKETING_ANNOUNCEMENT_PITCH_KEY = 'marketingAnnouncementPitch';

// Default values
const DEFAULT_PATIENT_PITCH = -0.8;
const DEFAULT_HOUR_PITCH = 0; // Chirp3-HD doesn't support pitch, but we'll track it
const DEFAULT_MARKETING_PITCH = 0; // Chirp3-HD doesn't support pitch

interface PitchConfig {
  label: string;
  storageKey: string;
  defaultValue: number;
  icon: React.ReactNode;
  description: string;
  testText: string;
  edgeFunction: string;
  voiceName?: string;
  supportsPitch: boolean;
}

const PITCH_CONFIGS: PitchConfig[] = [
  {
    label: 'Chamada de Paciente',
    storageKey: PATIENT_CALL_PITCH_KEY,
    defaultValue: DEFAULT_PATIENT_PITCH,
    icon: <Megaphone className="w-4 h-4 text-primary" />,
    description: 'Voz Neural2-C para chamadas de pacientes. Pitch suportado.',
    testText: 'Paciente Maria da Silva, por favor dirija-se à Triagem.',
    edgeFunction: 'google-cloud-tts',
    voiceName: 'pt-BR-Neural2-C',
    supportsPitch: true,
  },
  {
    label: 'Anúncio de Hora',
    storageKey: HOUR_ANNOUNCEMENT_PITCH_KEY,
    defaultValue: DEFAULT_HOUR_PITCH,
    icon: <Clock className="w-4 h-4 text-muted-foreground" />,
    description: 'Voz Chirp3-HD Erinome. Pitch não suportado por esta voz.',
    testText: 'São quinze horas e trinta minutos.',
    edgeFunction: 'google-cloud-tts',
    voiceName: 'pt-BR-Chirp3-HD-Erinome',
    supportsPitch: false,
  },
  {
    label: 'Anúncio de Marketing',
    storageKey: MARKETING_ANNOUNCEMENT_PITCH_KEY,
    defaultValue: DEFAULT_MARKETING_PITCH,
    icon: <Volume2 className="w-4 h-4 text-accent-foreground" />,
    description: 'Voz Chirp3-HD Kore. Pitch não suportado por esta voz.',
    testText: 'Cuide da sua saúde! Vacine-se e mantenha os exames em dia.',
    edgeFunction: 'generate-marketing-audio',
    supportsPitch: false,
  },
];

export function VoicePitchSettings({ unitName }: VoicePitchSettingsProps) {
  // State for each pitch setting - preview value (before applying)
  const [previewPitches, setPreviewPitches] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    PITCH_CONFIGS.forEach(config => {
      initial[config.storageKey] = parseFloat(
        localStorage.getItem(config.storageKey) || String(config.defaultValue)
      );
    });
    return initial;
  });

  // State for saved/applied values
  const [appliedPitches, setAppliedPitches] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    PITCH_CONFIGS.forEach(config => {
      initial[config.storageKey] = parseFloat(
        localStorage.getItem(config.storageKey) || String(config.defaultValue)
      );
    });
    return initial;
  });

  // Loading states
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback((key: string) => {
    return previewPitches[key] !== appliedPitches[key];
  }, [previewPitches, appliedPitches]);

  // Play preview audio
  const playPreview = useCallback(async (config: PitchConfig) => {
    const key = config.storageKey;
    setIsPlaying(prev => ({ ...prev, [key]: true }));

    try {
      let response: Response;

      if (config.edgeFunction === 'generate-marketing-audio') {
        // Marketing uses its own edge function
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-audio`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              text: config.testText,
              // Note: Chirp3-HD doesn't support pitch, so we don't send it
            }),
          }
        );
      } else {
        // Use google-cloud-tts for patient calls and hour
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              text: config.testText,
              voiceName: config.voiceName,
              pitch: config.supportsPitch ? previewPitches[key] : undefined,
            }),
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(prev => ({ ...prev, [key]: false }));
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(prev => ({ ...prev, [key]: false }));
        toast.error('Erro ao reproduzir áudio');
      };
      
      await audio.play();
      
      if (config.supportsPitch) {
        toast.info(`Preview: Pitch ${previewPitches[key].toFixed(1)}`);
      } else {
        toast.info(`Preview: ${config.label}`);
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(`Erro: ${error instanceof Error ? error.message : 'Falha no preview'}`);
      setIsPlaying(prev => ({ ...prev, [key]: false }));
    }
  }, [previewPitches]);

  // Apply/save pitch setting
  const applyPitch = useCallback((config: PitchConfig) => {
    const key = config.storageKey;
    const value = previewPitches[key];
    
    localStorage.setItem(key, value.toString());
    setAppliedPitches(prev => ({ ...prev, [key]: value }));
    
    toast.success(`${config.label}: Pitch ${value.toFixed(1)} aplicado!`);
  }, [previewPitches]);

  // Reset to default
  const resetToDefault = useCallback((config: PitchConfig) => {
    const key = config.storageKey;
    setPreviewPitches(prev => ({ ...prev, [key]: config.defaultValue }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Volume2 className="w-5 h-5" />
          Configurações de Pitch (Tom de Voz)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {PITCH_CONFIGS.map(config => {
          const key = config.storageKey;
          const currentValue = previewPitches[key];
          const hasChanges = hasUnsavedChanges(key);

          return (
            <div key={key} className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {config.icon}
                  <div>
                    <Label className="text-sm font-medium">{config.label}</Label>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <span className="text-sm font-mono bg-background px-2 py-1 rounded">
                  {currentValue.toFixed(1)}
                </span>
              </div>

              {config.supportsPitch ? (
                <>
                  <Slider
                    value={[currentValue]}
                    onValueChange={([value]) => {
                      setPreviewPitches(prev => ({ ...prev, [key]: value }));
                    }}
                    min={-2}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Grave (-2.0)</span>
                    <span>Normal (0)</span>
                    <span>Agudo (+2.0)</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded border">
                  ⚠️ Esta voz (Chirp3-HD) não suporta ajuste de pitch. A configuração é apenas informativa.
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playPreview(config)}
                  disabled={isPlaying[key]}
                  className="flex-1 min-w-[120px]"
                >
                  {isPlaying[key] ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Tocando...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 mr-2" />
                      Preview
                    </>
                  )}
                </Button>

                {config.supportsPitch && (
                  <>
                    <Button
                      variant={hasChanges ? "default" : "secondary"}
                      size="sm"
                      onClick={() => applyPitch(config)}
                      disabled={!hasChanges}
                      className="flex-1 min-w-[120px]"
                    >
                      <Check className="w-3 h-3 mr-2" />
                      {hasChanges ? 'Aplicar' : 'Aplicado'}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetToDefault(config)}
                      title={`Restaurar para ${config.defaultValue}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>

              {hasChanges && config.supportsPitch && (
                <p className="text-xs text-destructive">
                  ⚠️ Alteração não salva. Clique em "Aplicar" para salvar.
                </p>
              )}
            </div>
          );
        })}

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Dicas:</strong>
          <ul className="list-disc ml-4 mt-1 space-y-1">
            <li>Valores negativos produzem voz mais grave e quente</li>
            <li>Valores positivos produzem voz mais aguda</li>
            <li>Use "Preview" para ouvir antes de aplicar</li>
            <li>O padrão recomendado para chamadas é <strong>-0.8</strong></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
