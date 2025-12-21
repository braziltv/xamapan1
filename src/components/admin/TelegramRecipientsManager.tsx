import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Send,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MessageCircle,
  Bell,
  Calendar,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TelegramRecipient {
  id: string;
  unit_id: string;
  chat_id: string;
  name: string;
  is_active: boolean;
  receives_daily_report: boolean;
  receives_weekly_report: boolean;
  receives_alerts: boolean;
  created_at: string;
  updated_at: string;
}

interface TelegramRecipientsManagerProps {
  unitId: string;
  unitName: string;
}

const MAX_RECIPIENTS = 3;

export function TelegramRecipientsManager({ unitId, unitName }: TelegramRecipientsManagerProps) {
  const [recipients, setRecipients] = useState<TelegramRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<TelegramRecipient | null>(null);
  const [deletingRecipient, setDeletingRecipient] = useState<TelegramRecipient | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    chat_id: '',
    is_active: true,
    receives_daily_report: true,
    receives_weekly_report: true,
    receives_alerts: false,
  });

  const loadRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('telegram_recipients')
        .select('*')
        .eq('unit_id', unitId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRecipients(data || []);
    } catch (error) {
      console.error('Error loading recipients:', error);
      toast.error('Erro ao carregar destinatários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipients();
  }, [unitId]);

  const handleOpenCreate = () => {
    if (recipients.length >= MAX_RECIPIENTS) {
      toast.error(`Limite de ${MAX_RECIPIENTS} destinatários por unidade atingido`);
      return;
    }
    setEditingRecipient(null);
    setFormData({
      name: '',
      chat_id: '',
      is_active: true,
      receives_daily_report: true,
      receives_weekly_report: true,
      receives_alerts: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (recipient: TelegramRecipient) => {
    setEditingRecipient(recipient);
    setFormData({
      name: recipient.name,
      chat_id: recipient.chat_id,
      is_active: recipient.is_active,
      receives_daily_report: recipient.receives_daily_report,
      receives_weekly_report: recipient.receives_weekly_report,
      receives_alerts: recipient.receives_alerts,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.chat_id.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validate chat_id format (should be numeric, can have negative sign for groups)
    const chatIdRegex = /^-?\d+$/;
    if (!chatIdRegex.test(formData.chat_id.trim())) {
      toast.error('Chat ID inválido. Deve conter apenas números.');
      return;
    }

    try {
      if (editingRecipient) {
        const { error } = await supabase
          .from('telegram_recipients')
          .update({
            name: formData.name.trim(),
            chat_id: formData.chat_id.trim(),
            is_active: formData.is_active,
            receives_daily_report: formData.receives_daily_report,
            receives_weekly_report: formData.receives_weekly_report,
            receives_alerts: formData.receives_alerts,
          })
          .eq('id', editingRecipient.id);

        if (error) throw error;
        toast.success('Destinatário atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('telegram_recipients')
          .insert({
            unit_id: unitId,
            name: formData.name.trim(),
            chat_id: formData.chat_id.trim(),
            is_active: formData.is_active,
            receives_daily_report: formData.receives_daily_report,
            receives_weekly_report: formData.receives_weekly_report,
            receives_alerts: formData.receives_alerts,
          });

        if (error) {
          if (error.code === '23505') {
            toast.error('Este Chat ID já está cadastrado para esta unidade');
            return;
          }
          throw error;
        }
        toast.success('Destinatário cadastrado com sucesso');
      }

      setDialogOpen(false);
      loadRecipients();
    } catch (error) {
      console.error('Error saving recipient:', error);
      toast.error('Erro ao salvar destinatário');
    }
  };

  const handleDelete = async () => {
    if (!deletingRecipient) return;

    try {
      const { error } = await supabase
        .from('telegram_recipients')
        .delete()
        .eq('id', deletingRecipient.id);

      if (error) throw error;
      toast.success('Destinatário removido com sucesso');
      setDeleteDialogOpen(false);
      setDeletingRecipient(null);
      loadRecipients();
    } catch (error) {
      console.error('Error deleting recipient:', error);
      toast.error('Erro ao remover destinatário');
    }
  };

  const handleTestMessage = async (recipient: TelegramRecipient) => {
    setTestingId(recipient.id);
    try {
      const { error } = await supabase.functions.invoke('telegram-alert', {
        body: {
          chat_id: recipient.chat_id,
          message: `✅ *Teste de Conexão*\n\nOlá ${recipient.name}!\n\nEsta é uma mensagem de teste do sistema de chamadas.\n\n📍 Unidade: ${unitName}\n🕐 Data/Hora: ${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}\n\n_Você está configurado para receber relatórios desta unidade._`,
        },
      });

      if (error) throw error;
      toast.success('Mensagem de teste enviada com sucesso!');
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Erro ao enviar mensagem de teste. Verifique o Chat ID.');
    } finally {
      setTestingId(null);
    }
  };

  const toggleActive = async (recipient: TelegramRecipient) => {
    try {
      const { error } = await supabase
        .from('telegram_recipients')
        .update({ is_active: !recipient.is_active })
        .eq('id', recipient.id);

      if (error) throw error;
      loadRecipients();
      toast.success(recipient.is_active ? 'Destinatário desativado' : 'Destinatário ativado');
    } catch (error) {
      console.error('Error toggling active:', error);
      toast.error('Erro ao alterar status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-600 dark:text-blue-400">Como obter o Chat ID do Telegram</p>
              <ol className="mt-2 text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Abra o Telegram e inicie uma conversa com <code className="bg-muted px-1 rounded">@userinfobot</code></li>
                <li>Envie qualquer mensagem para o bot</li>
                <li>O bot responderá com seu ID (número que começa com números)</li>
                <li>Para grupos, adicione o bot ao grupo e ele mostrará o ID do grupo (número negativo)</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Destinatários Telegram</h3>
          <Badge variant="outline" className="text-xs">
            {recipients.length}/{MAX_RECIPIENTS}
          </Badge>
        </div>
        <Button onClick={handleOpenCreate} disabled={recipients.length >= MAX_RECIPIENTS}>
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Recipients List */}
      {recipients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
            <p>Nenhum destinatário cadastrado</p>
            <p className="text-xs mt-1">Adicione até {MAX_RECIPIENTS} números para receber relatórios</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead className="text-center">Relatórios</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{recipient.chat_id}</code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {recipient.receives_daily_report && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            Diário
                          </Badge>
                        )}
                        {recipient.receives_weekly_report && (
                          <Badge variant="outline" className="text-xs">
                            <CalendarDays className="w-3 h-3 mr-1" />
                            Semanal
                          </Badge>
                        )}
                        {recipient.receives_alerts && (
                          <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/30">
                            <Bell className="w-3 h-3 mr-1" />
                            Alertas
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(recipient)}
                      >
                        {recipient.is_active ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Inativo
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestMessage(recipient)}
                          disabled={testingId === recipient.id}
                        >
                          {testingId === recipient.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(recipient)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingRecipient(recipient);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRecipient ? 'Editar Destinatário' : 'Novo Destinatário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: João Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat_id">Chat ID do Telegram *</Label>
              <Input
                id="chat_id"
                placeholder="Ex: 123456789"
                value={formData.chat_id}
                onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Use @userinfobot no Telegram para obter seu Chat ID
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Tipos de Notificação</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Relatório Diário</span>
                  </div>
                  <Switch
                    checked={formData.receives_daily_report}
                    onCheckedChange={(checked) => setFormData({ ...formData, receives_daily_report: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Relatório Semanal</span>
                  </div>
                  <Switch
                    checked={formData.receives_weekly_report}
                    onCheckedChange={(checked) => setFormData({ ...formData, receives_weekly_report: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-500" />
                    <span className="text-sm">Alertas do Sistema</span>
                  </div>
                  <Switch
                    checked={formData.receives_alerts}
                    onCheckedChange={(checked) => setFormData({ ...formData, receives_alerts: checked })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Ativo</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingRecipient ? 'Salvar' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deletingRecipient?.name}</strong> da lista de destinatários?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
