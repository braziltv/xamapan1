import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Volume2, Type, Play, Loader2, RefreshCw, Tv, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MarketingPanelProps {
  unitName: string;
}

interface VoiceAnnouncement {
  id: string;
  title: string;
  text_content: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  interval_minutes: number;
  repeat_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  audio_cache_url: string | null;
  audio_generated_at: string | null;
  audio_type: string;
  custom_audio_url: string | null;
}

interface CommercialPhrase {
  id: string;
  phrase_content: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  display_order: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export function MarketingPanel({ unitName }: MarketingPanelProps) {
  const [announcements, setAnnouncements] = useState<VoiceAnnouncement[]>([]);
  const [phrases, setPhrases] = useState<CommercialPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phraseDialogOpen, setPhraseDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<VoiceAnnouncement | null>(null);
  const [editingPhrase, setEditingPhrase] = useState<CommercialPhrase | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testingOnTV, setTestingOnTV] = useState<string | null>(null);
  const [generatingAudio, setGeneratingAudio] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    text_content: '',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    start_time: '08:00',
    end_time: '18:00',
    interval_minutes: 30,
    repeat_count: 1,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [phraseFormData, setPhraseFormData] = useState({
    phrase_content: '',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    start_time: '08:00',
    end_time: '18:00',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    display_order: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [announcementsRes, phrasesRes] = await Promise.all([
        supabase
          .from('scheduled_announcements')
          .select('*')
          .eq('unit_name', unitName)
          .order('created_at', { ascending: false }),
        supabase
          .from('scheduled_commercial_phrases')
          .select('*')
          .eq('unit_name', unitName)
          .order('display_order', { ascending: true }),
      ]);

      if (announcementsRes.error) throw announcementsRes.error;
      if (phrasesRes.error) throw phrasesRes.error;

      setAnnouncements(announcementsRes.data || []);
      setPhrases(phrasesRes.data || []);
    } catch (error) {
      console.error('Error loading marketing data:', error);
      toast.error('Erro ao carregar dados de marketing');
    } finally {
      setLoading(false);
    }
  }, [unitName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      text_content: '',
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '08:00',
      end_time: '18:00',
      interval_minutes: 30,
      repeat_count: 1,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (announcement: VoiceAnnouncement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      text_content: announcement.text_content,
      days_of_week: announcement.days_of_week,
      start_time: announcement.start_time,
      end_time: announcement.end_time,
      interval_minutes: announcement.interval_minutes,
      repeat_count: announcement.repeat_count,
      valid_from: announcement.valid_from,
      valid_until: announcement.valid_until,
    });
    setDialogOpen(true);
  };

  const handleOpenCreatePhrase = () => {
    setEditingPhrase(null);
    setPhraseFormData({
      phrase_content: '',
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '08:00',
      end_time: '18:00',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      display_order: phrases.length,
    });
    setPhraseDialogOpen(true);
  };

  const handleOpenEditPhrase = (phrase: CommercialPhrase) => {
    setEditingPhrase(phrase);
    setPhraseFormData({
      phrase_content: phrase.phrase_content,
      days_of_week: phrase.days_of_week,
      start_time: phrase.start_time,
      end_time: phrase.end_time,
      valid_from: phrase.valid_from,
      valid_until: phrase.valid_until,
      display_order: phrase.display_order,
    });
    setPhraseDialogOpen(true);
  };

  const handleSubmitAnnouncement = async () => {
    if (!formData.title.trim() || !formData.text_content.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('scheduled_announcements')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
        toast.success('Anúncio atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('scheduled_announcements')
          .insert({
            ...formData,
            unit_name: unitName,
            audio_type: 'tts',
          });

        if (error) throw error;
        toast.success('Anúncio criado com sucesso');
      }

      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Erro ao salvar anúncio');
    }
  };

  const handleSubmitPhrase = async () => {
    if (!phraseFormData.phrase_content.trim()) {
      toast.error('Preencha o conteúdo da frase');
      return;
    }

    try {
      if (editingPhrase) {
        const { error } = await supabase
          .from('scheduled_commercial_phrases')
          .update({
            ...phraseFormData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPhrase.id);

        if (error) throw error;
        toast.success('Frase atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('scheduled_commercial_phrases')
          .insert({
            ...phraseFormData,
            unit_name: unitName,
          });

        if (error) throw error;
        toast.success('Frase criada com sucesso');
      }

      setPhraseDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving phrase:', error);
      toast.error('Erro ao salvar frase');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Anúncio excluído com sucesso');
      loadData();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Erro ao excluir anúncio');
    }
  };

  const handleDeletePhrase = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta frase?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_commercial_phrases')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Frase excluída com sucesso');
      loadData();
    } catch (error) {
      console.error('Error deleting phrase:', error);
      toast.error('Erro ao excluir frase');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean, type: 'announcement' | 'phrase') => {
    try {
      const table = type === 'announcement' ? 'scheduled_announcements' : 'scheduled_commercial_phrases';
      const { error } = await supabase
        .from(table)
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const handleTestAnnouncement = async (announcement: VoiceAnnouncement) => {
    setTesting(announcement.id);
    try {
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
            text: announcement.text_content,
            voiceName: localStorage.getItem('googleVoiceFemale') || 'pt-BR-Neural2-A',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao gerar áudio');
      }

      // A edge function retorna o áudio como binário, não como JSON
      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => URL.revokeObjectURL(audioUrl);
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        toast.error('Erro ao reproduzir áudio');
      };
      
      await audio.play();
      toast.success('Reproduzindo anúncio');
    } catch (error) {
      console.error('Error testing announcement:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao reproduzir anúncio');
    } finally {
      setTesting(null);
    }
  };

  const handleGenerateAudioCache = async (announcement: VoiceAnnouncement) => {
    setGeneratingAudio(announcement.id);
    try {
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
            text: announcement.text_content,
            voiceName: localStorage.getItem('googleVoiceFemale') || 'pt-BR-Neural2-A',
            cacheForAnnouncement: announcement.id,
          }),
        }
      );

      if (!response.ok) throw new Error('Falha ao gerar cache de áudio');

      toast.success('Cache de áudio gerado com sucesso');
      loadData();
    } catch (error) {
      console.error('Error generating audio cache:', error);
      toast.error('Erro ao gerar cache de áudio');
    } finally {
      setGeneratingAudio(null);
    }
  };

  // Teste imediato na TV - usa realtime para enviar comando para todas as TVs
  const handleTestOnTV = async (announcement: VoiceAnnouncement) => {
    setTestingOnTV(announcement.id);
    try {
      // Forçar last_played_at para null para que o anúncio seja reproduzido imediatamente
      // e reduzir temporariamente o intervalo
      const { error } = await supabase
        .from('scheduled_announcements')
        .update({ 
          last_played_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', announcement.id);

      if (error) throw error;

      // Aguardar um pouco para a TV detectar a mudança
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(
        `Anúncio "${announcement.title}" enviado para as TVs! Será reproduzido em até 60 segundos.`,
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Error sending to TV:', error);
      toast.error('Erro ao enviar para TV');
    } finally {
      setTestingOnTV(null);
    }
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Todos os dias';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias úteis';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Fins de semana';
    return days.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ');
  };

  const handleDayToggle = (day: number, isPhrase: boolean) => {
    if (isPhrase) {
      setPhraseFormData(prev => ({
        ...prev,
        days_of_week: prev.days_of_week.includes(day)
          ? prev.days_of_week.filter(d => d !== day)
          : [...prev.days_of_week, day].sort(),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        days_of_week: prev.days_of_week.includes(day)
          ? prev.days_of_week.filter(d => d !== day)
          : [...prev.days_of_week, day].sort(),
      }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Anúncios de Voz
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Frases no Rodapé
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Anúncios de Voz</CardTitle>
                <CardDescription>
                  Mensagens de áudio reproduzidas automaticamente na TV
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Anúncio
              </Button>
            </CardHeader>
            <CardContent>
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum anúncio de voz cadastrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Intervalo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.map((announcement) => (
                      <TableRow key={announcement.id}>
                        <TableCell className="font-medium">{announcement.title}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {announcement.text_content}
                        </TableCell>
                        <TableCell>{formatDays(announcement.days_of_week)}</TableCell>
                        <TableCell>
                          {announcement.start_time} - {announcement.end_time}
                        </TableCell>
                        <TableCell>{announcement.interval_minutes} min</TableCell>
                        <TableCell>
                          <Switch
                            checked={announcement.is_active}
                            onCheckedChange={() =>
                              handleToggleActive(announcement.id, announcement.is_active, 'announcement')
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTestAnnouncement(announcement)}
                              disabled={testing === announcement.id}
                              title="Testar aqui"
                            >
                              {testing === announcement.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleTestOnTV(announcement)}
                              disabled={testingOnTV === announcement.id || !announcement.is_active}
                              title="Tocar na TV agora"
                              className="text-primary hover:bg-primary hover:text-primary-foreground"
                            >
                              {testingOnTV === announcement.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Tv className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleGenerateAudioCache(announcement)}
                              disabled={generatingAudio === announcement.id}
                              title="Gerar cache de áudio"
                            >
                              {generatingAudio === announcement.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(announcement)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAnnouncement(announcement.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Frases Comerciais</CardTitle>
                <CardDescription>
                  Mensagens exibidas no rodapé da tela da TV
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreatePhrase} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Frase
              </Button>
            </CardHeader>
            <CardContent>
              {phrases.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma frase comercial cadastrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phrases.map((phrase) => (
                      <TableRow key={phrase.id}>
                        <TableCell>
                          <Badge variant="secondary">{phrase.display_order + 1}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {phrase.phrase_content}
                        </TableCell>
                        <TableCell>{formatDays(phrase.days_of_week)}</TableCell>
                        <TableCell>
                          {phrase.start_time} - {phrase.end_time}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={phrase.is_active}
                            onCheckedChange={() =>
                              handleToggleActive(phrase.id, phrase.is_active, 'phrase')
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditPhrase(phrase)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePhrase(phrase.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Anúncios de Voz */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'Editar Anúncio' : 'Novo Anúncio de Voz'}
            </DialogTitle>
            <DialogDescription>
              Configure o anúncio que será reproduzido na TV.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Promoção de Inverno"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="text_content">Texto do Anúncio</Label>
              <Textarea
                id="text_content"
                value={formData.text_content}
                onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                placeholder="Ex: Aproveite nossa promoção de inverno com descontos especiais..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={formData.days_of_week.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value, false)}
                    />
                    <Label htmlFor={`day-${day.value}`} className="text-sm">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_time">Hora Início</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_time">Hora Fim</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="interval">Intervalo (minutos)</Label>
                <Input
                  id="interval"
                  type="number"
                  min={5}
                  value={formData.interval_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, interval_minutes: parseInt(e.target.value) || 30 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat">Repetições</Label>
                <Input
                  id="repeat"
                  type="number"
                  min={1}
                  max={5}
                  value={formData.repeat_count}
                  onChange={(e) =>
                    setFormData({ ...formData, repeat_count: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="valid_from">Válido de</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valid_until">Válido até</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitAnnouncement}>
              {editingAnnouncement ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Frases Comerciais */}
      <Dialog open={phraseDialogOpen} onOpenChange={setPhraseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPhrase ? 'Editar Frase' : 'Nova Frase Comercial'}
            </DialogTitle>
            <DialogDescription>
              Configure a frase que será exibida no rodapé da TV.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phrase_content">Conteúdo da Frase</Label>
              <Textarea
                id="phrase_content"
                value={phraseFormData.phrase_content}
                onChange={(e) =>
                  setPhraseFormData({ ...phraseFormData, phrase_content: e.target.value })
                }
                placeholder="Ex: Bem-vindo à nossa clínica! Atendimento humanizado e de qualidade."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`phrase-day-${day.value}`}
                      checked={phraseFormData.days_of_week.includes(day.value)}
                      onCheckedChange={() => handleDayToggle(day.value, true)}
                    />
                    <Label htmlFor={`phrase-day-${day.value}`} className="text-sm">
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phrase_start_time">Hora Início</Label>
                <Input
                  id="phrase_start_time"
                  type="time"
                  value={phraseFormData.start_time}
                  onChange={(e) =>
                    setPhraseFormData({ ...phraseFormData, start_time: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phrase_end_time">Hora Fim</Label>
                <Input
                  id="phrase_end_time"
                  type="time"
                  value={phraseFormData.end_time}
                  onChange={(e) =>
                    setPhraseFormData({ ...phraseFormData, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phrase_valid_from">Válido de</Label>
                <Input
                  id="phrase_valid_from"
                  type="date"
                  value={phraseFormData.valid_from}
                  onChange={(e) =>
                    setPhraseFormData({ ...phraseFormData, valid_from: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phrase_valid_until">Válido até</Label>
                <Input
                  id="phrase_valid_until"
                  type="date"
                  value={phraseFormData.valid_until}
                  onChange={(e) =>
                    setPhraseFormData({ ...phraseFormData, valid_until: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="display_order">Ordem de Exibição</Label>
              <Input
                id="display_order"
                type="number"
                min={0}
                value={phraseFormData.display_order}
                onChange={(e) =>
                  setPhraseFormData({
                    ...phraseFormData,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPhraseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitPhrase}>
              {editingPhrase ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
