import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Volume2, Plus, Edit, Trash2, Loader2, Play, Mic } from 'lucide-react';
import { useTTSPhrases, useModules } from '@/hooks/useAdminData';
import { TTSPhrase } from '@/types/admin';
import { toast } from 'sonner';

interface TTSPhrasesManagerProps {
  unitId: string;
}

const PHRASE_TYPES = [
  { value: 'call', label: 'Chamada de Paciente' },
  { value: 'destination', label: 'Anúncio de Destino' },
  { value: 'announcement', label: 'Comunicado Geral' },
  { value: 'welcome', label: 'Boas-vindas' },
  { value: 'info', label: 'Informativo' }
];

export function TTSPhrasesManager({ unitId }: TTSPhrasesManagerProps) {
  const { phrases, loading, createPhrase, updatePhrase, deletePhrase } = useTTSPhrases(unitId);
  const { modules } = useModules(unitId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<TTSPhrase | null>(null);
  const [testing, setTesting] = useState(false);
  const [formData, setFormData] = useState({
    phrase_type: 'call',
    phrase_template: '',
    module_id: '' as string | null,
    voice_id: '',
    is_active: true,
    display_order: 0
  });

  const handleOpenCreate = () => {
    setEditingPhrase(null);
    setFormData({
      phrase_type: 'call',
      phrase_template: '',
      module_id: null,
      voice_id: '',
      is_active: true,
      display_order: phrases.length
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (phrase: TTSPhrase) => {
    setEditingPhrase(phrase);
    setFormData({
      phrase_type: phrase.phrase_type,
      phrase_template: phrase.phrase_template,
      module_id: phrase.module_id,
      voice_id: phrase.voice_id || '',
      is_active: phrase.is_active,
      display_order: phrase.display_order
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      unit_id: unitId,
      module_id: formData.module_id || null,
      voice_id: formData.voice_id || null
    };
    
    if (editingPhrase) {
      await updatePhrase(editingPhrase.id, payload);
    } else {
      await createPhrase(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta frase?')) {
      await deletePhrase(id);
    }
  };

  const handleTestPhrase = async () => {
    setTesting(true);
    try {
      // Substituir variáveis de exemplo
      const testText = formData.phrase_template
        .replace('{nome}', 'Maria da Silva')
        .replace('{destino}', 'Consultório 1')
        .replace('{sala}', 'Sala de Triagem');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: testText }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao gerar áudio');
      }

      const audioBuffer = await response.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();

      toast.success('Áudio reproduzido com sucesso!');
    } catch (error) {
      console.error('Erro ao testar frase:', error);
      toast.error('Erro ao testar frase TTS');
    } finally {
      setTesting(false);
    }
  };

  const getModuleName = (moduleId: string | null) => {
    if (!moduleId) return 'Geral';
    const mod = modules.find(m => m.id === moduleId);
    return mod?.name || 'Desconhecido';
  };

  const getPhraseTypeLabel = (type: string) => {
    return PHRASE_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Frases TTS (Texto para Voz)
        </CardTitle>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Frase
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-muted/50 rounded-md">
          <p className="text-sm text-muted-foreground">
            <strong>Variáveis disponíveis:</strong> {'{nome}'} = nome do paciente, {'{destino}'} = destino da chamada, {'{sala}'} = sala de atendimento
          </p>
        </div>

        {phrases.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhuma frase TTS cadastrada. Clique em "Nova Frase" para criar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Frase</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phrases.map((phrase) => (
                <TableRow key={phrase.id}>
                  <TableCell>
                    <span className="px-2 py-1 bg-primary/10 rounded text-xs">
                      {getPhraseTypeLabel(phrase.phrase_type)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {phrase.phrase_template}
                  </TableCell>
                  <TableCell>{getModuleName(phrase.module_id)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${phrase.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {phrase.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(phrase)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(phrase.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPhrase ? 'Editar Frase TTS' : 'Nova Frase TTS'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Frase</Label>
                <Select 
                  value={formData.phrase_type} 
                  onValueChange={(value) => setFormData({ ...formData, phrase_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHRASE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phrase_template">Texto da Frase</Label>
                <Textarea
                  id="phrase_template"
                  value={formData.phrase_template}
                  onChange={(e) => setFormData({ ...formData, phrase_template: e.target.value })}
                  placeholder="Ex: {nome}, por favor, dirija-se ao {destino}."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{nome}'}, {'{destino}'}, {'{sala}'} para inserir dados dinâmicos.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Módulo Associado</Label>
                <Select 
                  value={formData.module_id || 'none'} 
                  onValueChange={(value) => setFormData({ ...formData, module_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral (todos os módulos)</SelectItem>
                    {modules.map((mod) => (
                      <SelectItem key={mod.id} value={mod.id}>
                        {mod.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Frase Ativa</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleTestPhrase}
                disabled={testing || !formData.phrase_template}
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Testar Frase
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.phrase_template}>
                {editingPhrase ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
