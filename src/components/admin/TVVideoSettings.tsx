import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tv, Save, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TVVideoSettingsProps {
  unitName: string;
}

interface VideoSettings {
  url: string;
  enabled: boolean;
  volume: number;
}

const isValidUrl = (u: string) => {
  if (!u) return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const detectKind = (u: string): 'YouTube' | 'MP4 / Vídeo direto' | 'Desconhecido' => {
  const s = u.toLowerCase();
  if (s.includes('youtube.com/') || s.includes('youtu.be/')) return 'YouTube';
  if (s.match(/\.(mp4|webm|ogv|mov|m4v)(\?|$)/)) return 'MP4 / Vídeo direto';
  if (s.startsWith('http')) return 'MP4 / Vídeo direto';
  return 'Desconhecido';
};

export function TVVideoSettings({ unitName }: TVVideoSettingsProps) {
  const [settings, setSettings] = useState<VideoSettings>({ url: '', enabled: false, volume: 50 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('unit_settings')
        .select('tv_video_url, tv_video_enabled, tv_video_volume')
        .eq('unit_name', unitName)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações de vídeo');
      } else if (data) {
        setSettings({
          url: (data.tv_video_url as string | null) || '',
          enabled: !!data.tv_video_enabled,
          volume: typeof data.tv_video_volume === 'number' ? data.tv_video_volume : 50,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [unitName]);

  const save = async (override?: Partial<VideoSettings>) => {
    const next = { ...settings, ...override };
    setSaving(true);
    const { error } = await supabase
      .from('unit_settings')
      .upsert(
        {
          unit_name: unitName,
          tv_video_url: next.url || null,
          tv_video_enabled: next.enabled,
          tv_video_volume: next.volume,
        },
        { onConflict: 'unit_name' }
      );
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      setSettings(next);
      toast.success('Configurações de vídeo salvas — TV atualizada em tempo real');
    }
  };

  const handleClear = () => save({ url: '', enabled: false });

  const valid = settings.url === '' || isValidUrl(settings.url);
  const kind = settings.url ? detectKind(settings.url) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Vídeo em tela cheia na TV</CardTitle>
            <CardDescription>
              Reproduz um vídeo (YouTube ou link MP4) ocupando toda a TV. O vídeo desaparece automaticamente durante chamadas de pacientes e volta logo após.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="video-url">URL do vídeo</Label>
              <Input
                id="video-url"
                placeholder="https://www.youtube.com/watch?v=... ou https://servidor.com/video.mp4"
                value={settings.url}
                onChange={(e) => setSettings({ ...settings, url: e.target.value })}
              />
              <div className="flex items-center justify-between text-xs">
                <span className={valid ? 'text-muted-foreground' : 'text-destructive'}>
                  {settings.url
                    ? valid
                      ? `Tipo detectado: ${kind}`
                      : 'URL inválida'
                    : 'Cole uma URL do YouTube ou link direto de vídeo (.mp4)'}
                </span>
                {settings.url && valid && (
                  <a
                    href={settings.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Abrir
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="video-enabled" className="text-base">Exibir vídeo na TV</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Liga/desliga em todas as TVs desta unidade instantaneamente.
                </p>
              </div>
              <Switch
                id="video-enabled"
                checked={settings.enabled}
                onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
                disabled={!valid || !settings.url}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Volume do vídeo</Label>
                <span className="text-sm text-muted-foreground">{settings.volume}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[settings.volume]}
                onValueChange={([v]) => setSettings({ ...settings, volume: v })}
              />
              <p className="text-xs text-muted-foreground">
                O volume é zerado automaticamente durante chamadas de pacientes.
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Como funciona:</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Quando ativado, o vídeo cobre toda a TV em loop contínuo.</li>
                <li>Ao chamar um paciente, o vídeo é pausado e o painel padrão reaparece.</li>
                <li>Após terminar a chamada, o vídeo volta a tocar do ponto onde parou.</li>
                <li>Para áudio funcionar, a TV precisa ter o som desbloqueado (clique em "Ativar áudio" na TV).</li>
              </ul>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={saving || (!settings.url && !settings.enabled)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Limpar
              </Button>
              <Button onClick={() => save()} disabled={saving || !valid}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Salvar</>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
