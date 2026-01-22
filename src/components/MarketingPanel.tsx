import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Megaphone, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Volume2,
  Calendar,
  Clock,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VoiceAnnouncement {
  id: string;
  title: string;
  text_content: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  valid_from: string;
  valid_until: string;
  interval_minutes: number;
  repeat_count: number;
  is_active: boolean;
  audio_type: string;
  unit_name: string;
  audio_cache_url?: string | null;
  audio_generated_at?: string | null;
}

interface CommercialPhrase {
  id: string;
  phrase_content: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  valid_from: string;
  valid_until: string;
  display_order: number;
  is_active: boolean;
  unit_name: string;
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

export function MarketingPanel() {
  const [unitName] = useState(() => localStorage.getItem('selectedUnitName') || '');
  const [activeTab, setActiveTab] = useState('voice');
  
  // Voice Announcements State
  const [voiceAnnouncements, setVoiceAnnouncements] = useState<VoiceAnnouncement[]>([]);
  const [loadingVoice, setLoadingVoice] = useState(true);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [editingVoice, setEditingVoice] = useState<VoiceAnnouncement | null>(null);
  const [savingVoice, setSavingVoice] = useState(false);
  const [testingVoice, setTestingVoice] = useState<string | null>(null);
  
  // Commercial Phrases State
  const [commercialPhrases, setCommercialPhrases] = useState<CommercialPhrase[]>([]);
  const [loadingCommercial, setLoadingCommercial] = useState(true);
  const [commercialDialogOpen, setCommercialDialogOpen] = useState(false);
  const [editingCommercial, setEditingCommercial] = useState<CommercialPhrase | null>(null);
  const [savingCommercial, setSavingCommercial] = useState(false);
  
  // Voice Form State
  const [voiceForm, setVoiceForm] = useState({
    title: '',
    text_content: '',
    start_time: '08:00',
    end_time: '18:00',
    days_of_week: [1, 2, 3, 4, 5],
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    interval_minutes: 60,
    repeat_count: 1,
    is_active: true,
  });
  
  // Commercial Form State
  const [commercialForm, setCommercialForm] = useState({
    phrase_content: '',
    start_time: '08:00',
    end_time: '18:00',
    days_of_week: [1, 2, 3, 4, 5],
    valid_from: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    display_order: 0,
    is_active: true,
  });

  // Load voice announcements
  const loadVoiceAnnouncements = useCallback(async () => {
    setLoadingVoice(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_announcements')
        .select('*')
        .eq('unit_name', unitName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVoiceAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading voice announcements:', error);
      toast.error('Erro ao carregar anúncios de voz');
    } finally {
      setLoadingVoice(false);
    }
  }, [unitName]);

  // Load commercial phrases
  const loadCommercialPhrases = useCallback(async () => {
    setLoadingCommercial(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_commercial_phrases')
        .select('*')
        .eq('unit_name', unitName)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCommercialPhrases(data || []);
    } catch (error) {
      console.error('Error loading commercial phrases:', error);
      toast.error('Erro ao carregar frases comerciais');
    } finally {
      setLoadingCommercial(false);
    }
  }, [unitName]);

  useEffect(() => {
    loadVoiceAnnouncements();
    loadCommercialPhrases();
  }, [loadVoiceAnnouncements, loadCommercialPhrases]);

  // Open dialog for new voice announcement
  const openNewVoiceDialog = () => {
    setEditingVoice(null);
    setVoiceForm({
      title: '',
      text_content: '',
      start_time: '08:00',
      end_time: '18:00',
      days_of_week: [1, 2, 3, 4, 5],
      valid_from: format(new Date(), 'yyyy-MM-dd'),
      valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      interval_minutes: 60,
      repeat_count: 1,
      is_active: true,
    });
    setVoiceDialogOpen(true);
  };

  // Open dialog for editing voice announcement
  const openEditVoiceDialog = (announcement: VoiceAnnouncement) => {
    setEditingVoice(announcement);
    setVoiceForm({
      title: announcement.title,
      text_content: announcement.text_content,
      start_time: announcement.start_time,
      end_time: announcement.end_time,
      days_of_week: announcement.days_of_week,
      valid_from: announcement.valid_from,
      valid_until: announcement.valid_until,
      interval_minutes: announcement.interval_minutes,
      repeat_count: announcement.repeat_count,
      is_active: announcement.is_active,
    });
    setVoiceDialogOpen(true);
  };

  // Generate and cache audio for announcement using Chirp 3 HD Kore voice
  const generateAudioCache = async (announcementId: string, textContent: string): Promise<string | null> => {
    try {
      // Use dedicated marketing audio edge function with Chirp 3 HD Kore voice
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            action: 'generate-single',
            announcementId,
            text: textContent
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error generating audio cache:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      
      if (result.success && result.url) {
        console.log('📢 Audio cache generated with Chirp 3 HD Kore:', result.url);
        return result.url;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating audio cache:', error);
      return null;
    }
  };

  // Delete cached audio for announcement using edge function
  const deleteAudioCache = async (announcementId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            action: 'delete-audio',
            announcementId
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('🗑️ Audio cache deleted via edge function:', result.deleted);
        }
      }
    } catch (error) {
      console.error('Error deleting audio cache:', error);
    }
  };

  // Save voice announcement
  const saveVoiceAnnouncement = async () => {
    if (!voiceForm.title.trim() || !voiceForm.text_content.trim()) {
      toast.error('Preencha o título e o conteúdo do anúncio');
      return;
    }

    if (voiceAnnouncements.length >= 10 && !editingVoice) {
      toast.error('Limite máximo de 10 anúncios atingido');
      return;
    }

    setSavingVoice(true);
    try {
      const textContent = voiceForm.text_content.trim();
      const needsNewCache = !editingVoice || editingVoice.text_content !== textContent;
      
      let announcementId = editingVoice?.id;
      
      const data: any = {
        title: voiceForm.title.trim(),
        text_content: textContent,
        start_time: voiceForm.start_time,
        end_time: voiceForm.end_time,
        days_of_week: voiceForm.days_of_week,
        valid_from: voiceForm.valid_from,
        valid_until: voiceForm.valid_until,
        interval_minutes: voiceForm.interval_minutes,
        repeat_count: voiceForm.repeat_count,
        is_active: voiceForm.is_active,
        unit_name: unitName,
        audio_type: 'text',
      };

      if (editingVoice) {
        const { error } = await supabase
          .from('scheduled_announcements')
          .update(data)
          .eq('id', editingVoice.id);

        if (error) throw error;
      } else {
        const { data: insertedData, error } = await supabase
          .from('scheduled_announcements')
          .insert(data)
          .select('id')
          .single();

        if (error) throw error;
        announcementId = insertedData.id;
      }

      // Generate audio cache if text changed or new announcement
      if (needsNewCache && announcementId) {
        toast.info('Gerando cache de áudio...');
        const cacheUrl = await generateAudioCache(announcementId, textContent);
        
        if (cacheUrl) {
          // Update with cache URL
          await supabase
            .from('scheduled_announcements')
            .update({ 
              audio_cache_url: cacheUrl,
              audio_generated_at: new Date().toISOString()
            })
            .eq('id', announcementId);
          
          toast.success('Anúncio salvo com cache de áudio');
        } else {
          toast.success(editingVoice ? 'Anúncio atualizado (cache falhou)' : 'Anúncio criado (cache falhou)');
        }
      } else {
        toast.success(editingVoice ? 'Anúncio atualizado' : 'Anúncio criado');
      }

      setVoiceDialogOpen(false);
      loadVoiceAnnouncements();
    } catch (error) {
      console.error('Error saving voice announcement:', error);
      toast.error('Erro ao salvar anúncio');
    } finally {
      setSavingVoice(false);
    }
  };

  // Delete voice announcement
  const deleteVoiceAnnouncement = async (id: string) => {
    if (!confirm('Deseja realmente excluir este anúncio?')) return;

    try {
      // Delete cached audio first
      await deleteAudioCache(id);
      
      // Then delete from database
      const { error } = await supabase
        .from('scheduled_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Anúncio e cache de áudio excluídos');
      loadVoiceAnnouncements();
    } catch (error) {
      console.error('Error deleting voice announcement:', error);
      toast.error('Erro ao excluir anúncio');
    }
  };

  // Toggle voice announcement active status
  const toggleVoiceActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_announcements')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      loadVoiceAnnouncements();
    } catch (error) {
      console.error('Error toggling voice announcement:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Test voice announcement
  const testVoiceAnnouncement = async (announcement: VoiceAnnouncement) => {
    setTestingVoice(announcement.id);
    try {
      const configuredVoice = localStorage.getItem('googleVoiceFemale') || 'pt-BR-Neural2-A';
      
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
            voiceName: configuredVoice
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar áudio');
      }

      const audioBuffer = await response.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 1.0;
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
      
      toast.success('Reproduzindo anúncio');
    } catch (error) {
      console.error('Error testing voice announcement:', error);
      toast.error('Erro ao testar anúncio');
    } finally {
      setTestingVoice(null);
    }
  };

  // Open dialog for new commercial phrase
  const openNewCommercialDialog = () => {
    setEditingCommercial(null);
    setCommercialForm({
      phrase_content: '',
      start_time: '08:00',
      end_time: '18:00',
      days_of_week: [1, 2, 3, 4, 5],
      valid_from: format(new Date(), 'yyyy-MM-dd'),
      valid_until: format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      display_order: commercialPhrases.length,
      is_active: true,
    });
    setCommercialDialogOpen(true);
  };

  // Open dialog for editing commercial phrase
  const openEditCommercialDialog = (phrase: CommercialPhrase) => {
    setEditingCommercial(phrase);
    setCommercialForm({
      phrase_content: phrase.phrase_content,
      start_time: phrase.start_time,
      end_time: phrase.end_time,
      days_of_week: phrase.days_of_week,
      valid_from: phrase.valid_from,
      valid_until: phrase.valid_until,
      display_order: phrase.display_order,
      is_active: phrase.is_active,
    });
    setCommercialDialogOpen(true);
  };

  // Save commercial phrase
  const saveCommercialPhrase = async () => {
    if (!commercialForm.phrase_content.trim()) {
      toast.error('Preencha o conteúdo da frase');
      return;
    }

    if (commercialPhrases.length >= 10 && !editingCommercial) {
      toast.error('Limite máximo de 10 frases atingido');
      return;
    }

    setSavingCommercial(true);
    try {
      const data = {
        phrase_content: commercialForm.phrase_content.trim(),
        start_time: commercialForm.start_time,
        end_time: commercialForm.end_time,
        days_of_week: commercialForm.days_of_week,
        valid_from: commercialForm.valid_from,
        valid_until: commercialForm.valid_until,
        display_order: commercialForm.display_order,
        is_active: commercialForm.is_active,
        unit_name: unitName,
      };

      if (editingCommercial) {
        const { error } = await supabase
          .from('scheduled_commercial_phrases')
          .update(data)
          .eq('id', editingCommercial.id);

        if (error) throw error;
        toast.success('Frase atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('scheduled_commercial_phrases')
          .insert(data);

        if (error) throw error;
        toast.success('Frase criada com sucesso');
      }

      setCommercialDialogOpen(false);
      loadCommercialPhrases();
    } catch (error) {
      console.error('Error saving commercial phrase:', error);
      toast.error('Erro ao salvar frase');
    } finally {
      setSavingCommercial(false);
    }
  };

  // Delete commercial phrase
  const deleteCommercialPhrase = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta frase?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_commercial_phrases')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Frase excluída');
      loadCommercialPhrases();
    } catch (error) {
      console.error('Error deleting commercial phrase:', error);
      toast.error('Erro ao excluir frase');
    }
  };

  // Toggle commercial phrase active status
  const toggleCommercialActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('scheduled_commercial_phrases')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      loadCommercialPhrases();
    } catch (error) {
      console.error('Error toggling commercial phrase:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Format days display
  const formatDays = (days: number[]) => {
    if (days.length === 7) return 'Todos os dias';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Seg a Sex';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Fim de semana';
    return days.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label).join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Marketing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Anúncios de Voz
            </TabsTrigger>
            <TabsTrigger value="commercial" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Frases no Rodapé
            </TabsTrigger>
          </TabsList>

          {/* Voice Announcements Tab */}
          <TabsContent value="voice" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Programe até 10 anúncios para serem falados no módulo TV.
              </p>
              <Button onClick={openNewVoiceDialog} size="sm" disabled={voiceAnnouncements.length >= 10}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Anúncio
              </Button>
            </div>

            {loadingVoice ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : voiceAnnouncements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Volume2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum anúncio programado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {voiceAnnouncements.map((announcement) => (
                  <div 
                    key={announcement.id} 
                    className={`p-4 border rounded-lg ${announcement.is_active ? 'bg-card' : 'bg-muted/50 opacity-75'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{announcement.title}</h4>
                          <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
                            {announcement.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {announcement.text_content}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {announcement.start_time} - {announcement.end_time}
                          </span>
                          <span>•</span>
                          <span>{formatDays(announcement.days_of_week)}</span>
                          <span>•</span>
                          <span>A cada {announcement.interval_minutes} min</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Até {format(parseISO(announcement.valid_until), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch 
                          checked={announcement.is_active}
                          onCheckedChange={(checked) => toggleVoiceActive(announcement.id, checked)}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => testVoiceAnnouncement(announcement)}
                          disabled={testingVoice === announcement.id}
                        >
                          {testingVoice === announcement.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditVoiceDialog(announcement)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteVoiceAnnouncement(announcement.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Commercial Phrases Tab */}
          <TabsContent value="commercial" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Programe até 10 frases para aparecer no rodapé do módulo TV, junto às notícias.
              </p>
              <Button onClick={openNewCommercialDialog} size="sm" disabled={commercialPhrases.length >= 10}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Frase
              </Button>
            </div>

            {loadingCommercial ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : commercialPhrases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma frase comercial programada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {commercialPhrases.map((phrase) => (
                  <div 
                    key={phrase.id} 
                    className={`p-4 border rounded-lg ${phrase.is_active ? 'bg-card' : 'bg-muted/50 opacity-75'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={phrase.is_active ? 'default' : 'secondary'}>
                            {phrase.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Badge variant="outline">Ordem: {phrase.display_order + 1}</Badge>
                        </div>
                        <p className="text-sm mb-2">{phrase.phrase_content}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {phrase.start_time} - {phrase.end_time}
                          </span>
                          <span>•</span>
                          <span>{formatDays(phrase.days_of_week)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Até {format(parseISO(phrase.valid_until), 'dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch 
                          checked={phrase.is_active}
                          onCheckedChange={(checked) => toggleCommercialActive(phrase.id, checked)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEditCommercialDialog(phrase)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCommercialPhrase(phrase.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Voice Announcement Dialog */}
        <Dialog open={voiceDialogOpen} onOpenChange={setVoiceDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                {editingVoice ? 'Editar Anúncio' : 'Novo Anúncio de Voz'}
              </DialogTitle>
              <DialogDescription>
                Configure um anúncio para ser falado automaticamente no módulo TV.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="voice-title">Título do Anúncio</Label>
                <Input
                  id="voice-title"
                  placeholder="Ex: Aviso de vacinação"
                  value={voiceForm.title}
                  onChange={(e) => setVoiceForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-content">Texto a ser falado</Label>
                <Textarea
                  id="voice-content"
                  placeholder="Digite o texto que será convertido em voz..."
                  rows={4}
                  value={voiceForm.text_content}
                  onChange={(e) => setVoiceForm(prev => ({ ...prev, text_content: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voice-start">Horário Início</Label>
                  <Input
                    id="voice-start"
                    type="time"
                    value={voiceForm.start_time}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voice-end">Horário Fim</Label>
                  <Input
                    id="voice-end"
                    type="time"
                    value={voiceForm.end_time}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center gap-1">
                      <Checkbox
                        id={`voice-day-${day.value}`}
                        checked={voiceForm.days_of_week.includes(day.value)}
                        onCheckedChange={(checked) => {
                          setVoiceForm(prev => ({
                            ...prev,
                            days_of_week: checked
                              ? [...prev.days_of_week, day.value].sort()
                              : prev.days_of_week.filter(d => d !== day.value)
                          }));
                        }}
                      />
                      <Label htmlFor={`voice-day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voice-valid-from">Data Início</Label>
                  <Input
                    id="voice-valid-from"
                    type="date"
                    value={voiceForm.valid_from}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, valid_from: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voice-valid-until">Data Fim</Label>
                  <Input
                    id="voice-valid-until"
                    type="date"
                    value={voiceForm.valid_until}
                    onChange={(e) => setVoiceForm(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voice-interval">Intervalo (minutos)</Label>
                  <Select 
                    value={voiceForm.interval_minutes.toString()} 
                    onValueChange={(v) => setVoiceForm(prev => ({ ...prev, interval_minutes: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">1 hora</SelectItem>
                      <SelectItem value="120">2 horas</SelectItem>
                      <SelectItem value="180">3 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voice-repeat">Repetições</Label>
                  <Select 
                    value={voiceForm.repeat_count.toString()} 
                    onValueChange={(v) => setVoiceForm(prev => ({ ...prev, repeat_count: parseInt(v) }))}
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

              <div className="flex items-center gap-2">
                <Switch
                  id="voice-active"
                  checked={voiceForm.is_active}
                  onCheckedChange={(checked) => setVoiceForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="voice-active">Anúncio ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setVoiceDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveVoiceAnnouncement} disabled={savingVoice}>
                {savingVoice ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Commercial Phrase Dialog */}
        <Dialog open={commercialDialogOpen} onOpenChange={setCommercialDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {editingCommercial ? 'Editar Frase' : 'Nova Frase Comercial'}
              </DialogTitle>
              <DialogDescription>
                Configure uma frase para aparecer no rodapé do módulo TV.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="commercial-content">Frase</Label>
                <Textarea
                  id="commercial-content"
                  placeholder="Digite a frase comercial..."
                  rows={3}
                  value={commercialForm.phrase_content}
                  onChange={(e) => setCommercialForm(prev => ({ ...prev, phrase_content: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commercial-start">Horário Início</Label>
                  <Input
                    id="commercial-start"
                    type="time"
                    value={commercialForm.start_time}
                    onChange={(e) => setCommercialForm(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercial-end">Horário Fim</Label>
                  <Input
                    id="commercial-end"
                    type="time"
                    value={commercialForm.end_time}
                    onChange={(e) => setCommercialForm(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center gap-1">
                      <Checkbox
                        id={`commercial-day-${day.value}`}
                        checked={commercialForm.days_of_week.includes(day.value)}
                        onCheckedChange={(checked) => {
                          setCommercialForm(prev => ({
                            ...prev,
                            days_of_week: checked
                              ? [...prev.days_of_week, day.value].sort()
                              : prev.days_of_week.filter(d => d !== day.value)
                          }));
                        }}
                      />
                      <Label htmlFor={`commercial-day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commercial-valid-from">Data Início</Label>
                  <Input
                    id="commercial-valid-from"
                    type="date"
                    value={commercialForm.valid_from}
                    onChange={(e) => setCommercialForm(prev => ({ ...prev, valid_from: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercial-valid-until">Data Fim</Label>
                  <Input
                    id="commercial-valid-until"
                    type="date"
                    value={commercialForm.valid_until}
                    onChange={(e) => setCommercialForm(prev => ({ ...prev, valid_until: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commercial-order">Ordem de Exibição</Label>
                <Input
                  id="commercial-order"
                  type="number"
                  min="0"
                  max="9"
                  value={commercialForm.display_order}
                  onChange={(e) => setCommercialForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="commercial-active"
                  checked={commercialForm.is_active}
                  onCheckedChange={(checked) => setCommercialForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="commercial-active">Frase ativa</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCommercialDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={saveCommercialPhrase} disabled={savingCommercial}>
                {savingCommercial ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
