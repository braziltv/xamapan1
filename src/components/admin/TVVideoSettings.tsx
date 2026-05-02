import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Tv, Save, Loader2, Trash2, ExternalLink, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TVVideoSettingsProps {
  unitName: string;
}

interface VideoSettings {
  urls: string[];
  enabled: boolean;
  volume: number;
  resumeDelaySec: number;
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
  const [settings, setSettings] = useState<VideoSettings>({
    urls: [],
    enabled: false,
    volume: 50,
    resumeDelaySec: 20,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('unit_settings')
        .select('tv_video_url, tv_video_urls, tv_video_enabled, tv_video_volume, tv_video_resume_delay_seconds')
        .eq('unit_name', unitName)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações de vídeo');
      } else if (data) {
        const raw = (data as any).tv_video_urls;
        let urls: string[] = [];
        if (Array.isArray(raw)) {
          urls = raw.filter((u: any) => typeof u === 'string' && u.trim().length > 0);
        }
        if (urls.length === 0 && (data as any).tv_video_url) {
          urls = [String((data as any).tv_video_url)];
        }
        setSettings({
          urls,
          enabled: !!data.tv_video_enabled,
          volume: typeof data.tv_video_volume === 'number' ? data.tv_video_volume : 50,
          resumeDelaySec:
            typeof (data as any).tv_video_resume_delay_seconds === 'number'
              ? (data as any).tv_video_resume_delay_seconds
              : 20,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [unitName]);

  const save = async (override?: Partial<VideoSettings>) => {
    const next = { ...settings, ...override };
    // Filter and trim urls
    const cleanUrls = next.urls.map((u) => u.trim()).filter(Boolean);
    setSaving(true);
    const { error } = await supabase
      .from('unit_settings')
      .upsert(
        {
          unit_name: unitName,
          tv_video_url: cleanUrls[0] || null, // legacy compat
          tv_video_urls: cleanUrls as any,
          tv_video_enabled: next.enabled,
          tv_video_volume: next.volume,
          tv_video_resume_delay_seconds: next.resumeDelaySec,
        } as any,
        { onConflict: 'unit_name' }
      );
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      setSettings({ ...next, urls: cleanUrls });
      toast.success('Configurações salvas — TV atualizada em tempo real');
    }
  };

  const updateUrl = (idx: number, value: string) => {
    setSettings((s) => {
      const urls = [...s.urls];
      urls[idx] = value;
      return { ...s, urls };
    });
  };

  const removeUrl = (idx: number) => {
    setSettings((s) => ({ ...s, urls: s.urls.filter((_, i) => i !== idx) }));
  };

  const addUrl = () => {
    setSettings((s) => ({ ...s, urls: [...s.urls, ''] }));
  };

  const importBulk = () => {
    const list = bulkText
      .split(/\r?\n/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error('Cole pelo menos uma URL');
      return;
    }
    setSettings((s) => ({ ...s, urls: [...s.urls, ...list] }));
    setBulkText('');
    toast.success(`${list.length} URL(s) adicionada(s)`);
  };

  const handleClearAll = () => save({ urls: [], enabled: false });

  const allValid = settings.urls.every((u) => !u || isValidUrl(u));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Vídeos em tela cheia na TV</CardTitle>
            <CardDescription>
              Reproduz vídeos (YouTube ou link MP4) ocupando toda a TV. Quando vários vídeos são informados, eles tocam em sequência e voltam ao primeiro ao final. O vídeo desaparece durante chamadas e volta após o tempo de espera configurado.
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>URLs dos vídeos ({settings.urls.length})</Label>
                <Button size="sm" variant="outline" onClick={addUrl}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar URL
                </Button>
              </div>

              {settings.urls.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum vídeo configurado. Clique em "Adicionar URL" ou cole uma lista abaixo.
                </p>
              )}

              <div className="space-y-2">
                {settings.urls.map((u, idx) => {
                  const valid = !u || isValidUrl(u);
                  const kind = u ? detectKind(u) : null;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6 shrink-0">#{idx + 1}</span>
                        <Input
                          placeholder="https://www.youtube.com/watch?v=... ou https://servidor.com/video.mp4"
                          value={u}
                          onChange={(e) => updateUrl(idx, e.target.value)}
                        />
                        {u && valid && (
                          <a
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline shrink-0"
                            title="Abrir"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeUrl(idx)}
                          title="Remover"
                          className="shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {u && (
                        <p className={`text-xs pl-8 ${valid ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {valid ? `Tipo: ${kind}` : 'URL inválida'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Importar várias URLs de uma vez (uma por linha)
                </summary>
                <div className="mt-2 space-y-2">
                  <Textarea
                    rows={4}
                    placeholder="https://...mp4&#10;https://youtube.com/watch?v=...&#10;https://...mp4"
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <Button size="sm" variant="secondary" onClick={importBulk}>
                    Adicionar todas
                  </Button>
                </div>
              </details>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="video-enabled" className="text-base">
                  Exibir vídeos na TV
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Liga/desliga em todas as TVs desta unidade instantaneamente.
                </p>
              </div>
              <Switch
                id="video-enabled"
                checked={settings.enabled}
                onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
                disabled={!allValid || settings.urls.filter(Boolean).length === 0}
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Espera após chamada (antes de retomar o vídeo)</Label>
                <span className="text-sm text-muted-foreground">{settings.resumeDelaySec}s</span>
              </div>
              <Slider
                min={0}
                max={120}
                step={5}
                value={[settings.resumeDelaySec]}
                onValueChange={([v]) => setSettings({ ...settings, resumeDelaySec: v })}
              />
              <p className="text-xs text-muted-foreground">
                Após o término da chamada, o vídeo só volta a tocar depois desse tempo (padrão 20s — tempo recomendado para uma segunda repetição da chamada acontecer sem o vídeo aparecer no meio).
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Como funciona:</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Os vídeos tocam em loop e em sequência (um após o outro).</li>
                <li>Ao chamar um paciente, o vídeo é pausado e o painel padrão reaparece.</li>
                <li>Após a chamada terminar, o vídeo aguarda <strong>{settings.resumeDelaySec} segundos</strong> antes de voltar a tocar — tempo suficiente para a chamada ser repetida sem ser interrompida pelo vídeo.</li>
                <li>Para áudio funcionar, a TV precisa ter o som desbloqueado.</li>
              </ul>
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={handleClearAll}
                disabled={saving || (settings.urls.length === 0 && !settings.enabled)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Limpar tudo
              </Button>
              <Button onClick={() => save()} disabled={saving || !allValid}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Salvar
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
