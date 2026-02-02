import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Tv, Palette, Layout, Type, Clock, Sidebar, Newspaper, 
  Save, RotateCcw, Sparkles, ExternalLink, Loader2, Wand2
} from 'lucide-react';
import { useTVCustomization, presets, TVCustomization } from '@/hooks/useTVCustomization';
import { TVPreview } from './TVPreview';
import { toast } from 'sonner';

interface TVCustomizationPanelProps {
  unitId: string;
  unitName: string;
}

export function TVCustomizationPanel({ unitId, unitName }: TVCustomizationPanelProps) {
  const { customization, loading, saving, updateCustomization, applyPreset, triggerTVReload } = useTVCustomization(unitId);
  const [localChanges, setLocalChanges] = useState<Partial<TVCustomization>>({});
  const [activeTab, setActiveTab] = useState('presets');

  const currentConfig = { ...customization, ...localChanges };

  const handleLocalChange = (key: keyof TVCustomization, value: unknown) => {
    setLocalChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const success = await updateCustomization(localChanges);
    if (success) {
      setLocalChanges({});
      toast.success('Configurações salvas!');
    }
  };

  const handleApplyToTV = async () => {
    // First save any pending changes
    if (Object.keys(localChanges).length > 0) {
      const saved = await updateCustomization(localChanges);
      if (!saved) return;
      setLocalChanges({});
    }
    // Then trigger TV reload
    await triggerTVReload();
  };

  const handleReset = () => {
    setLocalChanges({});
    toast.info('Alterações descartadas');
  };

  const handlePresetSelect = async (presetName: string) => {
    await applyPreset(presetName);
    setLocalChanges({});
  };

  const hasChanges = Object.keys(localChanges).length > 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tv className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Personalização da TV</h2>
            <p className="text-sm text-muted-foreground">Customize a aparência do painel de TV para {unitName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Descartar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Salvar
              </Button>
            </>
          )}
          <Button variant="default" size="sm" onClick={handleApplyToTV} disabled={saving} className="bg-green-600 hover:bg-green-700">
            <ExternalLink className="w-4 h-4 mr-1" />
            Aplicar na TV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Preview */}
        <Card className="xl:col-span-1 order-1 xl:order-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Preview ao Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TVPreview customization={currentConfig} className="w-full" />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Prévia em miniatura do painel da TV
            </p>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="xl:col-span-2 order-2 xl:order-1">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-6 mb-6">
                <TabsTrigger value="presets" className="text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  Presets
                </TabsTrigger>
                <TabsTrigger value="background" className="text-xs">
                  <Palette className="w-3 h-3 mr-1" />
                  Fundo
                </TabsTrigger>
                <TabsTrigger value="cards" className="text-xs">
                  <Layout className="w-3 h-3 mr-1" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="header" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Cabeçalho
                </TabsTrigger>
                <TabsTrigger value="sidebar" className="text-xs">
                  <Sidebar className="w-3 h-3 mr-1" />
                  Lateral
                </TabsTrigger>
                <TabsTrigger value="ticker" className="text-xs">
                  <Newspaper className="w-3 h-3 mr-1" />
                  Ticker
                </TabsTrigger>
              </TabsList>

              {/* Presets Tab */}
              <TabsContent value="presets" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.keys(presets).map((presetName) => (
                    <Button
                      key={presetName}
                      variant={currentConfig.preset_name === presetName ? 'default' : 'outline'}
                      className="h-auto py-3 flex-col gap-1"
                      onClick={() => handlePresetSelect(presetName)}
                    >
                      <Wand2 className="w-4 h-4" />
                      <span className="text-xs">{presetName}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecione um preset para aplicar rapidamente um estilo completo, ou personalize cada elemento nas outras abas.
                </p>
              </TabsContent>

              {/* Background Tab */}
              <TabsContent value="background" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={currentConfig.background_color || '#0a0a1a'}
                        onChange={(e) => handleLocalChange('background_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={currentConfig.background_color || '#0a0a1a'}
                        onChange={(e) => handleLocalChange('background_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estilo de Fundo</Label>
                    <Select
                      value={currentConfig.background_style || 'gradient'}
                      onValueChange={(v) => handleLocalChange('background_style', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Cor Sólida</SelectItem>
                        <SelectItem value="gradient">Gradiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between md:col-span-2">
                    <div>
                      <Label>Animação de Fundo</Label>
                      <p className="text-xs text-muted-foreground">Efeito de transição de cores</p>
                    </div>
                    <Switch
                      checked={currentConfig.background_animation ?? true}
                      onCheckedChange={(v) => handleLocalChange('background_animation', v)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Cards Tab */}
              <TabsContent value="cards" className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-indigo-500" />
                    Card de Triagem
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cor de Fundo (CSS)</Label>
                      <Input
                        type="text"
                        value={currentConfig.card_triage_bg || ''}
                        onChange={(e) => handleLocalChange('card_triage_bg', e.target.value)}
                        placeholder="linear-gradient(135deg, #4f46e5, #7c3aed)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={currentConfig.card_triage_text || '#ffffff'}
                          onChange={(e) => handleLocalChange('card_triage_text', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={currentConfig.card_triage_text || '#ffffff'}
                          onChange={(e) => handleLocalChange('card_triage_text', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    Card do Médico
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cor de Fundo (CSS)</Label>
                      <Input
                        type="text"
                        value={currentConfig.card_doctor_bg || ''}
                        onChange={(e) => handleLocalChange('card_doctor_bg', e.target.value)}
                        placeholder="linear-gradient(135deg, #059669, #10b981)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={currentConfig.card_doctor_text || '#ffffff'}
                          onChange={(e) => handleLocalChange('card_doctor_text', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={currentConfig.card_doctor_text || '#ffffff'}
                          onChange={(e) => handleLocalChange('card_doctor_text', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Configurações Gerais dos Cards</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tamanho</Label>
                      <Select
                        value={currentConfig.card_size || 'large'}
                        onValueChange={(v) => handleLocalChange('card_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Pequeno</SelectItem>
                          <SelectItem value="medium">Médio</SelectItem>
                          <SelectItem value="large">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estilo da Borda</Label>
                      <Select
                        value={currentConfig.card_border_style || 'neon'}
                        onValueChange={(v) => handleLocalChange('card_border_style', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem Borda</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="neon">Neon Brilhante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor da Borda</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={currentConfig.card_border_color || '#38bdf8'}
                          onChange={(e) => handleLocalChange('card_border_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={currentConfig.card_border_color || '#38bdf8'}
                          onChange={(e) => handleLocalChange('card_border_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tamanho do Nome</Label>
                      <Select
                        value={currentConfig.patient_font_size || '4xl'}
                        onValueChange={(v) => handleLocalChange('patient_font_size', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2xl">Pequeno</SelectItem>
                          <SelectItem value="3xl">Médio</SelectItem>
                          <SelectItem value="4xl">Grande</SelectItem>
                          <SelectItem value="5xl">Extra Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Peso da Fonte</Label>
                      <Select
                        value={currentConfig.patient_font_weight || '800'}
                        onValueChange={(v) => handleLocalChange('patient_font_weight', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="400">Normal</SelectItem>
                          <SelectItem value="600">Semi-Bold</SelectItem>
                          <SelectItem value="700">Bold</SelectItem>
                          <SelectItem value="800">Extra-Bold</SelectItem>
                          <SelectItem value="900">Black</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Capitalização</Label>
                      <Select
                        value={currentConfig.patient_text_transform || 'uppercase'}
                        onValueChange={(v) => handleLocalChange('patient_text_transform', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Normal</SelectItem>
                          <SelectItem value="uppercase">MAIÚSCULAS</SelectItem>
                          <SelectItem value="capitalize">Capitalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Header Tab */}
              <TabsContent value="header" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor de Fundo</Label>
                    <Input
                      type="text"
                      value={currentConfig.header_bg_color || 'rgba(0,0,0,0.3)'}
                      onChange={(e) => handleLocalChange('header_bg_color', e.target.value)}
                      placeholder="rgba(0,0,0,0.3)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor do Texto</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={currentConfig.header_text_color || '#ffffff'}
                        onChange={(e) => handleLocalChange('header_text_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={currentConfig.header_text_color || '#ffffff'}
                        onChange={(e) => handleLocalChange('header_text_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tamanho do Logo</Label>
                    <Select
                      value={currentConfig.header_logo_size || 'medium'}
                      onValueChange={(v) => handleLocalChange('header_logo_size', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Pequeno</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar Título</Label>
                      <p className="text-xs text-muted-foreground">Nome da unidade no cabeçalho</p>
                    </div>
                    <Switch
                      checked={currentConfig.header_title_visible ?? true}
                      onCheckedChange={(v) => handleLocalChange('header_title_visible', v)}
                    />
                  </div>
                </div>

                <Separator />

                <h4 className="font-medium">Configurações do Relógio</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estilo do Relógio</Label>
                    <Select
                      value={currentConfig.clock_style || 'digital'}
                      onValueChange={(v) => handleLocalChange('clock_style', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="analog">Analógico</SelectItem>
                        <SelectItem value="minimal">Minimalista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cor do Relógio</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={currentConfig.clock_color || '#38bdf8'}
                        onChange={(e) => handleLocalChange('clock_color', e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={currentConfig.clock_color || '#38bdf8'}
                        onChange={(e) => handleLocalChange('clock_color', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Sidebar Tab */}
              <TabsContent value="sidebar" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mostrar Histórico Lateral</Label>
                    <p className="text-xs text-muted-foreground">Painel com últimas chamadas</p>
                  </div>
                  <Switch
                    checked={currentConfig.sidebar_visible ?? true}
                    onCheckedChange={(v) => handleLocalChange('sidebar_visible', v)}
                  />
                </div>

                {currentConfig.sidebar_visible && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Largura</Label>
                      <Select
                        value={currentConfig.sidebar_width || '320px'}
                        onValueChange={(v) => handleLocalChange('sidebar_width', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="280px">Estreito</SelectItem>
                          <SelectItem value="320px">Normal</SelectItem>
                          <SelectItem value="380px">Largo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Itens Visíveis</Label>
                      <Slider
                        value={[currentConfig.sidebar_items_count || 8]}
                        onValueChange={([v]) => handleLocalChange('sidebar_items_count', v)}
                        min={4}
                        max={12}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        {currentConfig.sidebar_items_count || 8} itens
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor de Fundo</Label>
                      <Input
                        type="text"
                        value={currentConfig.sidebar_bg_color || 'rgba(0,0,0,0.4)'}
                        onChange={(e) => handleLocalChange('sidebar_bg_color', e.target.value)}
                        placeholder="rgba(0,0,0,0.4)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cor da Borda</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={currentConfig.sidebar_border_color || '#38bdf8'}
                          onChange={(e) => handleLocalChange('sidebar_border_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={currentConfig.sidebar_border_color || '#38bdf8'}
                          onChange={(e) => handleLocalChange('sidebar_border_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mensagens de Espera</Label>
                    <p className="text-xs text-muted-foreground">Frases exibidas enquanto aguarda chamadas</p>
                  </div>
                  <Switch
                    checked={currentConfig.waiting_message_visible ?? true}
                    onCheckedChange={(v) => handleLocalChange('waiting_message_visible', v)}
                  />
                </div>

                {currentConfig.waiting_message_visible && (
                  <div className="space-y-2">
                    <Label>Frases (uma por linha)</Label>
                    <Textarea
                      value={(currentConfig.waiting_messages || []).join('\n')}
                      onChange={(e) => handleLocalChange('waiting_messages', e.target.value.split('\n').filter(Boolean))}
                      rows={4}
                      placeholder="Aguarde sua vez, estamos te chamando em breve!&#10;Mantenha seu documento em mãos"
                    />
                  </div>
                )}
              </TabsContent>

              {/* Ticker Tab */}
              <TabsContent value="ticker" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mostrar Ticker de Notícias</Label>
                    <p className="text-xs text-muted-foreground">Barra de notícias na parte inferior</p>
                  </div>
                  <Switch
                    checked={currentConfig.ticker_visible ?? true}
                    onCheckedChange={(v) => handleLocalChange('ticker_visible', v)}
                  />
                </div>

                {currentConfig.ticker_visible && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cor de Fundo</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={currentConfig.ticker_bg_color || '#1e1e2e'}
                          onChange={(e) => handleLocalChange('ticker_bg_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={currentConfig.ticker_bg_color || '#1e1e2e'}
                          onChange={(e) => handleLocalChange('ticker_bg_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor do Texto</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={currentConfig.ticker_text_color || '#ffffff'}
                          onChange={(e) => handleLocalChange('ticker_text_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={currentConfig.ticker_text_color || '#ffffff'}
                          onChange={(e) => handleLocalChange('ticker_text_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Cor do Separador</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={currentConfig.ticker_separator_color || '#ef4444'}
                          onChange={(e) => handleLocalChange('ticker_separator_color', e.target.value)}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={currentConfig.ticker_separator_color || '#ef4444'}
                          onChange={(e) => handleLocalChange('ticker_separator_color', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Velocidade</Label>
                      <Select
                        value={currentConfig.ticker_speed || 'normal'}
                        onValueChange={(v) => handleLocalChange('ticker_speed', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slow">Lento</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="fast">Rápido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
