import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar,
  Clock,
  RefreshCw,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ScheduledCommercialPhrase {
  id: string;
  unit_name: string;
  phrase_content: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  display_order: number;
  created_at: string;
  updated_at: string;
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

const MAX_PHRASES = 10;

export function ScheduledCommercialPhrasesManager({ unitName }: Props) {
  const [phrases, setPhrases] = useState<ScheduledCommercialPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<ScheduledCommercialPhrase | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    phrase_content: '',
    days_of_week: [1, 2, 3, 4, 5] as number[],
    start_time: '08:00',
    end_time: '18:00',
    is_active: true,
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  });
  
  const { toast } = useToast();

  const loadPhrases = useCallback(async () => {
    if (!unitName) return;
    
    try {
      const { data, error } = await supabase
        .from('scheduled_commercial_phrases')
        .select('*')
        .eq('unit_name', unitName)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setPhrases(data || []);
    } catch (err) {
      console.error('Error loading phrases:', err);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as frases programadas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [unitName, toast]);

  useEffect(() => {
    loadPhrases();
  }, [loadPhrases]);

  const resetForm = () => {
    setFormData({
      phrase_content: '',
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '08:00',
      end_time: '18:00',
      is_active: true,
      valid_from: format(new Date(), 'yyyy-MM-dd'),
      valid_until: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    });
    setSelectedPhrase(null);
  };

  const openCreateDialog = () => {
    if (phrases.length >= MAX_PHRASES) {
      toast({
        title: 'Limite atingido',
        description: `Você pode ter no máximo ${MAX_PHRASES} frases programadas.`,
        variant: 'destructive',
      });
      return;
    }
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (phrase: ScheduledCommercialPhrase) => {
    setSelectedPhrase(phrase);
    setFormData({
      phrase_content: phrase.phrase_content,
      days_of_week: phrase.days_of_week,
      start_time: phrase.start_time.slice(0, 5),
      end_time: phrase.end_time.slice(0, 5),
      is_active: phrase.is_active,
      valid_from: phrase.valid_from,
      valid_until: phrase.valid_until,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.phrase_content.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Preencha o conteúdo da frase.',
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
      const maxOrder = phrases.reduce((max, p) => Math.max(max, p.display_order), 0);
      
      const payload = {
        unit_name: unitName,
        phrase_content: formData.phrase_content.trim(),
        days_of_week: formData.days_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        is_active: formData.is_active,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        display_order: selectedPhrase ? selectedPhrase.display_order : maxOrder + 1,
      };

      if (selectedPhrase) {
        const { error } = await supabase
          .from('scheduled_commercial_phrases')
          .update(payload)
          .eq('id', selectedPhrase.id);
        if (error) throw error;
        toast({ title: 'Frase atualizada', description: 'As alterações foram salvas.' });
      } else {
        const { error } = await supabase
          .from('scheduled_commercial_phrases')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Frase criada', description: 'A frase programada foi adicionada.' });
      }

      setDialogOpen(false);
      loadPhrases();
    } catch (err) {
      console.error('Error saving phrase:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a frase programada.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPhrase) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('scheduled_commercial_phrases')
        .delete()
        .eq('id', selectedPhrase.id);
      
      if (error) throw error;
      toast({ title: 'Frase excluída', description: 'A frase programada foi removida.' });
      setDeleteDialogOpen(false);
      setSelectedPhrase(null);
      loadPhrases();
    } catch (err) {
      console.error('Error deleting phrase:', err);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a frase programada.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (phrase: ScheduledCommercialPhrase) => {
    try {
      const { error } = await supabase
        .from('scheduled_commercial_phrases')
        .update({ is_active: !phrase.is_active })
        .eq('id', phrase.id);
      
      if (error) throw error;
      loadPhrases();
    } catch (err) {
      console.error('Error toggling phrase:', err);
    }
  };

  const movePhrase = async (phrase: ScheduledCommercialPhrase, direction: 'up' | 'down') => {
    const currentIndex = phrases.findIndex(p => p.id === phrase.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= phrases.length) return;
    
    const targetPhrase = phrases[targetIndex];
    
    try {
      await Promise.all([
        supabase
          .from('scheduled_commercial_phrases')
          .update({ display_order: targetPhrase.display_order })
          .eq('id', phrase.id),
        supabase
          .from('scheduled_commercial_phrases')
          .update({ display_order: phrase.display_order })
          .eq('id', targetPhrase.id),
      ]);
      loadPhrases();
    } catch (err) {
      console.error('Error moving phrase:', err);
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
    <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-yellow-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Megaphone className="w-5 h-5" />
            Frases Comerciais Programadas (Rodapé da TV)
          </CardTitle>
          <Badge variant="outline" className="text-amber-600 border-amber-500">
            {phrases.length}/{MAX_PHRASES}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure até {MAX_PHRASES} frases que serão exibidas no rodapé da TV pública em dias e horários específicos.
        </p>

        <Button onClick={openCreateDialog} className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4" />
          Nova Frase Programada
        </Button>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : phrases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma frase programada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {phrases.map((phrase, index) => {
              const isExpired = new Date(phrase.valid_until) < new Date();
              const isNotStarted = new Date(phrase.valid_from) > new Date();
              
              return (
                <div
                  key={phrase.id}
                  className={`relative p-4 rounded-lg border transition-all ${
                    !phrase.is_active || isExpired
                      ? 'bg-muted/30 border-muted opacity-60'
                      : 'bg-background border-amber-500/30 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs">Expirado</Badge>
                        )}
                        {isNotStarted && (
                          <Badge variant="secondary" className="text-xs">Aguardando</Badge>
                        )}
                        {phrase.is_active && !isExpired && !isNotStarted && (
                          <Badge className="text-xs bg-green-600">Ativo</Badge>
                        )}
                      </div>
                      <p className="text-sm mb-2 line-clamp-2">
                        {phrase.phrase_content}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDays(phrase.days_of_week)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {phrase.start_time.slice(0, 5)} - {phrase.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span>
                          Válido: {format(new Date(phrase.valid_from), 'dd/MM/yy')} - {format(new Date(phrase.valid_until), 'dd/MM/yy')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => movePhrase(phrase, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => movePhrase(phrase, 'down')}
                          disabled={index === phrases.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex gap-1">
                        <Switch
                          checked={phrase.is_active}
                          onCheckedChange={() => toggleActive(phrase)}
                          className="data-[state=checked]:bg-amber-600"
                        />
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(phrase)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedPhrase(phrase);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                {selectedPhrase ? 'Editar Frase' : 'Nova Frase Programada'}
              </DialogTitle>
              <DialogDescription>
                Configure quando a frase será exibida no rodapé da TV.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Conteúdo da Frase</Label>
                <Textarea
                  placeholder="Ex: Vacine-se! Campanha de vacinação disponível."
                  value={formData.phrase_content}
                  onChange={(e) => setFormData(prev => ({ ...prev, phrase_content: e.target.value }))}
                  className="min-h-[100px]"
                  maxLength={200}
                />
                <span className="text-xs text-muted-foreground">{formData.phrase_content.length}/200</span>
              </div>

              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day.value} className="flex items-center gap-1">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={formData.days_of_week.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, days_of_week: [1, 2, 3, 4, 5] }))}
                  >
                    Dias úteis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, days_of_week: [0, 1, 2, 3, 4, 5, 6] }))}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, days_of_week: [0, 6] }))}
                  >
                    Fins de semana
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Início</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fim</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Válido a partir de</Label>
                  <Input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Válido até</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
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
              <DialogTitle>Excluir Frase</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta frase programada? Esta ação não pode ser desfeita.
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
