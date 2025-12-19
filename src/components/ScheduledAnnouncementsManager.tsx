import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Volume2, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar,
  Clock,
  RefreshCw,
  Play,
  Pause,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduledAnnouncement {
  id: string;
  unit_name: string;
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
  last_played_at: string | null;
  created_at: string;
}

interface Props {
  unitName: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
];

const MAX_ANNOUNCEMENTS = 10;

export function ScheduledAnnouncementsManager({ unitName }: Props) {
  const [announcements, setAnnouncements] = useState<ScheduledAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<ScheduledAnnouncement | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    text_content: '',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    start_time: '08:00',
    end_time: '18:00',
    interval_minutes: 60,
    repeat_count: 1,
    is_active: true,
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  });
  
  const { toast } = useToast();

  const loadAnnouncements = useCallback(async () => {
    if (!unitName) return;
    
    try {
      const { data, error } = await supabase
        .from('scheduled_announcements')
        .select('*')
        .eq('unit_name', unitName)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Error loading announcements:', err);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os áudios programados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [unitName, toast]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const resetForm = () => {
    setFormData({
      title: '',
      text_content: '',
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '08:00',
      end_time: '18:00',
      interval_minutes: 60,
      repeat_count: 1,
      is_active: true,
      valid_from: format(new Date(), 'yyyy-MM-dd'),
      valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    });
    setSelectedAnnouncement(null);
  };

  const openCreateDialog = () => {
    if (announcements.length >= MAX_ANNOUNCEMENTS) {
      toast({
        title: 'Limite atingido',
        description: `Você pode ter no máximo ${MAX_ANNOUNCEMENTS} áudios programados.`,
        variant: 'destructive',
      });
      return;
    }
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (announcement: ScheduledAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      text_content: announcement.text_content,
      days_of_week: announcement.days_of_week,
      start_time: announcement.start_time.slice(0, 5),
      end_time: announcement.end_time.slice(0, 5),
      interval_minutes: announcement.interval_minutes,
      repeat_count: announcement.repeat_count,
      is_active: announcement.is_active,
      valid_from: announcement.valid_from,
      valid_until: announcement.valid_until,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.text_content.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e o texto do áudio.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.days_of_week.length === 0) {
      toast({
        title: 'Selecione os dias',
        description: 'Selecione pelo menos um dia da semana.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        unit_name: unitName,
        title: formData.title.trim(),
        text_content: formData.text_content.trim(),
        days_of_week: formData.days_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        interval_minutes: formData.interval_minutes,
        repeat_count: formData.repeat_count,
        is_active: formData.is_active,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
      };

      if (selectedAnnouncement) {
        const { error } = await supabase
          .from('scheduled_announcements')
          .update(payload)
          .eq('id', selectedAnnouncement.id);
        if (error) throw error;
        toast({ title: 'Áudio atualizado', description: 'As alterações foram salvas.' });
      } else {
        const { error } = await supabase
          .from('scheduled_announcements')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Áudio criado', description: 'O áudio programado foi adicionado.' });
      }

      setDialogOpen(false);
      loadAnnouncements();
    } catch (err) {
      console.error('Error saving announcement:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o áudio programado.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('scheduled_announcements')
        .delete()
        .eq('id', selectedAnnouncement.id);
      
      if (error) throw error;
      toast({ title: 'Áudio excluído', description: 'O áudio programado foi removido.' });
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
      loadAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o áudio programado.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (announcement: ScheduledAnnouncement) => {
    try {
      const { error } = await supabase
        .from('scheduled_announcements')
        .update({ is_active: !announcement.is_active })
        .eq('id', announcement.id);
      
      if (error) throw error;
      loadAnnouncements();
    } catch (err) {
      console.error('Error toggling announcement:', err);
    }
  };

  const testAudio = async (announcement: ScheduledAnnouncement) => {
    setTesting(announcement.id);
    
    try {
      const voice = localStorage.getItem('patientCallVoice') || 'pt-BR-Chirp3-HD-Achernar';
      
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
            voiceName: voice,
          }),
        }
      );

      if (!response.ok) throw new Error('TTS failed');

      const audioBuffer = await response.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = parseFloat(localStorage.getItem('volume-tts') || '1');
      
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTesting(null);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Error testing audio:', err);
      toast({
        title: 'Erro no teste',
        description: 'Não foi possível reproduzir o áudio.',
        variant: 'destructive',
      });
      setTesting(null);
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Todos os dias';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias úteis';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Fins de semana';
    return days.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label).join(', ');
  };

  return (
    <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-violet-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Volume2 className="w-5 h-5" />
            Áudios de Propaganda Programados
          </CardTitle>
          <Badge variant="outline" className="text-purple-600 border-purple-500">
            {announcements.length}/{MAX_ANNOUNCEMENTS}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure até {MAX_ANNOUNCEMENTS} áudios de propaganda para tocar automaticamente na TV pública em horários específicos.
          A voz usada será a mesma configurada para chamada de pacientes.
        </p>

        <Button onClick={openCreateDialog} className="gap-2 bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4" />
          Novo Áudio Programado
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Volume2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum áudio programado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => {
              const isExpired = new Date(announcement.valid_until) < new Date();
              const isNotStarted = new Date(announcement.valid_from) > new Date();
              
              return (
                <div
                  key={announcement.id}
                  className={`relative p-4 rounded-lg border transition-all ${
                    !announcement.is_active || isExpired
                      ? 'bg-muted/30 border-muted opacity-60'
                      : 'bg-background border-purple-500/30 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{announcement.title}</h4>
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs">Expirado</Badge>
                        )}
                        {isNotStarted && (
                          <Badge variant="secondary" className="text-xs">Aguardando</Badge>
                        )}
                        {announcement.is_active && !isExpired && !isNotStarted && (
                          <Badge className="text-xs bg-green-600">Ativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {announcement.text_content}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDays(announcement.days_of_week)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {announcement.start_time.slice(0, 5)} - {announcement.end_time.slice(0, 5)}
                        </span>
                        <span>A cada {announcement.interval_minutes} min</span>
                        <span>{announcement.repeat_count}x por vez</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Válido: {format(new Date(announcement.valid_from), 'dd/MM/yyyy', { locale: ptBR })} 
                        {' até '} 
                        {format(new Date(announcement.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => testAudio(announcement)}
                        disabled={testing === announcement.id}
                        title="Testar áudio"
                      >
                        {testing === announcement.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 text-purple-600" />
                        )}
                      </Button>
                      <Switch
                        checked={announcement.is_active}
                        onCheckedChange={() => toggleActive(announcement)}
                        title={announcement.is_active ? 'Desativar' : 'Ativar'}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(announcement)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedAnnouncement(announcement);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedAnnouncement ? 'Editar' : 'Novo'} Áudio Programado
              </DialogTitle>
              <DialogDescription>
                Configure o texto e os horários para reprodução automática na TV.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título (identificação)</Label>
                <Input
                  id="title"
                  placeholder="Ex: Campanha de Vacinação"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="text_content">Texto do Áudio</Label>
                <Textarea
                  id="text_content"
                  placeholder="Digite o texto que será falado..."
                  value={formData.text_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                  className="min-h-[100px]"
                  maxLength={500}
                />
                <span className="text-xs text-muted-foreground">{formData.text_content.length}/500</span>
              </div>

              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center gap-1">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={formData.days_of_week.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Hora Início</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Hora Fim</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalo (minutos)</Label>
                  <Select
                    value={String(formData.interval_minutes)}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, interval_minutes: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">A cada 15 min</SelectItem>
                      <SelectItem value="30">A cada 30 min</SelectItem>
                      <SelectItem value="60">A cada 1 hora</SelectItem>
                      <SelectItem value="120">A cada 2 horas</SelectItem>
                      <SelectItem value="180">A cada 3 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repeat">Repetições por vez</Label>
                  <Select
                    value={String(formData.repeat_count)}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, repeat_count: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 vez</SelectItem>
                      <SelectItem value="2">2 vezes</SelectItem>
                      <SelectItem value="3">3 vezes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">Válido a partir de</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Válido até</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Confirmar Exclusão
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o áudio "{selectedAnnouncement?.title}"?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
