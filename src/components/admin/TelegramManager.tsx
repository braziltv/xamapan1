import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Bell, 
  FileText, 
  Calendar,
  MessageCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnits } from '@/hooks/useAdminData';

interface TelegramRecipient {
  id: string;
  unit_id: string;
  name: string;
  chat_id: string;
  is_active: boolean;
  receives_alerts: boolean;
  receives_daily_report: boolean;
  receives_weekly_report: boolean;
  created_at: string;
  updated_at: string;
}

interface TelegramManagerProps {
  unitId: string;
}

type ReportType = 'daily' | 'weekly' | 'test_message';

export function TelegramManager({ unitId }: TelegramManagerProps) {
  const { units } = useUnits();
  const [recipients, setRecipients] = useState<TelegramRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<TelegramRecipient | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [testMessage, setTestMessage] = useState('🔔 Mensagem de teste do Xama Pan!\n\nSe você recebeu esta mensagem, a integração com o Telegram está funcionando corretamente.');
  const [selectedReportUnit, setSelectedReportUnit] = useState<string>(unitId);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('daily');
  const [formData, setFormData] = useState({
    name: '',
    chat_id: '',
    is_active: true,
    receives_alerts: false,
    receives_daily_report: true,
    receives_weekly_report: true
  });

  const unitName = units.find(u => u.id === unitId)?.display_name || 'Unidade';

  const fetchRecipients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('telegram_recipients')
      .select('*')
      .eq('unit_id', unitId)
      .order('name');

    if (error) {
      console.error('Erro ao carregar destinatários:', error);
      toast.error('Erro ao carregar destinatários');
    } else {
      setRecipients(data || []);
    }
    setLoading(false);
  }, [unitId]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  const handleOpenCreate = () => {
    setEditingRecipient(null);
    setFormData({
      name: '',
      chat_id: '',
      is_active: true,
      receives_alerts: false,
      receives_daily_report: true,
      receives_weekly_report: true
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (recipient: TelegramRecipient) => {
    setEditingRecipient(recipient);
    setFormData({
      name: recipient.name,
      chat_id: recipient.chat_id,
      is_active: recipient.is_active,
      receives_alerts: recipient.receives_alerts,
      receives_daily_report: recipient.receives_daily_report,
      receives_weekly_report: recipient.receives_weekly_report
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.chat_id.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const payload = {
      ...formData,
      unit_id: unitId
    };

    if (editingRecipient) {
      const { error } = await supabase
        .from('telegram_recipients')
        .update(payload)
        .eq('id', editingRecipient.id);

      if (error) {
        toast.error('Erro ao atualizar destinatário: ' + error.message);
        return;
      }
      toast.success('Destinatário atualizado!');
    } else {
      const { error } = await supabase
        .from('telegram_recipients')
        .insert(payload);

      if (error) {
        toast.error('Erro ao criar destinatário: ' + error.message);
        return;
      }
      toast.success('Destinatário criado!');
    }

    setDialogOpen(false);
    fetchRecipients();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este destinatário?')) return;

    const { error } = await supabase
      .from('telegram_recipients')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir destinatário: ' + error.message);
      return;
    }

    toast.success('Destinatário excluído!');
    fetchRecipients();
  };

  const sendTestMessage = async (chatId?: string) => {
    setIsSendingTest(true);
    
    try {
      const response = await supabase.functions.invoke('telegram-alert', {
        body: {
          type: 'test_message',
          message: testMessage,
          chatId: chatId
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast.success('Mensagem de teste enviada com sucesso!');
        setTestDialogOpen(false);
      } else {
        toast.error('Falha ao enviar mensagem: ' + (response.data?.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem de teste:', error);
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setIsSendingTest(false);
    }
  };

  const sendReport = async () => {
    setIsSendingReport(true);
    
    try {
      const selectedUnit = units.find(u => u.id === selectedReportUnit);
      const unitDisplayName = selectedUnit?.display_name || 'Todas as Unidades';

      if (selectedReportType === 'daily' || selectedReportType === 'weekly') {
        // Trigger the daily statistics function which sends both reports
        const response = await supabase.functions.invoke('send-daily-statistics', {
          body: { unitFilter: selectedReportUnit !== 'all' ? selectedUnit?.name : null }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        toast.success(`Relatório ${selectedReportType === 'daily' ? 'diário' : 'semanal'} enviado para ${unitDisplayName}!`);
        setReportDialogOpen(false);
      }
    } catch (error) {
      console.error('Erro ao enviar relatório:', error);
      toast.error('Erro ao enviar relatório');
    } finally {
      setIsSendingReport(false);
    }
  };

  const toggleRecipientStatus = async (recipient: TelegramRecipient) => {
    const { error } = await supabase
      .from('telegram_recipients')
      .update({ is_active: !recipient.is_active })
      .eq('id', recipient.id);

    if (error) {
      toast.error('Erro ao atualizar status');
      return;
    }

    fetchRecipients();
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
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            Integração Telegram
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setReportDialogOpen(true)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Enviar Relatório
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTestDialogOpen(true)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Teste
            </Button>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Destinatário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure os destinatários que receberão alertas e relatórios via Telegram para <strong>{unitName}</strong>.
          </p>
        </CardContent>
      </Card>

      {/* Recipients List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Destinatários ({recipients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum destinatário cadastrado.</p>
              <p className="text-sm">Clique em "Novo Destinatário" para adicionar.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Chat ID</TableHead>
                    <TableHead>Notificações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell className="font-medium">{recipient.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {recipient.chat_id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {recipient.receives_alerts && (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/20">
                              <Bell className="w-3 h-3 mr-1" />
                              Alertas
                            </Badge>
                          )}
                          {recipient.receives_daily_report && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                              <FileText className="w-3 h-3 mr-1" />
                              Diário
                            </Badge>
                          )}
                          {recipient.receives_weekly_report && (
                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/20">
                              <Calendar className="w-3 h-3 mr-1" />
                              Semanal
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleRecipientStatus(recipient)}
                          className="cursor-pointer"
                        >
                          {recipient.is_active ? (
                            <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="hover:bg-secondary/80">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => sendTestMessage(recipient.chat_id)}
                            title="Enviar teste"
                          >
                            <Send className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleOpenEdit(recipient)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(recipient.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Como obter o Chat ID do Telegram
          </h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Inicie uma conversa com o bot @XamaPanBot no Telegram</li>
            <li>Envie o comando <code className="bg-muted px-1 rounded">/start</code></li>
            <li>O bot responderá com seu Chat ID</li>
            <li>Copie e cole o número no campo "Chat ID"</li>
          </ol>
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground">
            <strong>Dica:</strong> Para grupos, adicione o bot ao grupo e use o Chat ID do grupo (número negativo).
          </p>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRecipient ? 'Editar Destinatário' : 'Novo Destinatário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Administrador João"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chat_id">Chat ID</Label>
              <Input
                id="chat_id"
                value={formData.chat_id}
                onChange={(e) => setFormData({ ...formData, chat_id: e.target.value })}
                placeholder="Ex: 123456789"
              />
              <p className="text-xs text-muted-foreground">
                ID numérico do chat no Telegram
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Tipos de Notificação</Label>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Alertas de Sistema</span>
                </div>
                <Switch
                  checked={formData.receives_alerts}
                  onCheckedChange={(checked) => setFormData({ ...formData, receives_alerts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Relatório Diário</span>
                </div>
                <Switch
                  checked={formData.receives_daily_report}
                  onCheckedChange={(checked) => setFormData({ ...formData, receives_daily_report: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">Relatório Semanal</span>
                </div>
                <Switch
                  checked={formData.receives_weekly_report}
                  onCheckedChange={(checked) => setFormData({ ...formData, receives_weekly_report: checked })}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Destinatário Ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.chat_id}>
              {editingRecipient ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Message Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Enviar Mensagem de Teste
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Esta mensagem será enviada para o chat configurado nas variáveis de ambiente (TELEGRAM_CHAT_ID).
            </p>
            <div className="space-y-2">
              <Label htmlFor="testMessage">Mensagem</Label>
              <Textarea
                id="testMessage"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => sendTestMessage()} disabled={isSendingTest || !testMessage.trim()}>
              {isSendingTest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Teste
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Enviar Relatório
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Escolha a unidade e o tipo de relatório que deseja enviar via Telegram.
            </p>
            
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={selectedReportUnit} onValueChange={setSelectedReportUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Tabs value={selectedReportType} onValueChange={(v) => setSelectedReportType(v as ReportType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="daily" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Diário
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Semanal
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="bg-muted/50 p-3 rounded-md text-sm">
              <p className="font-medium mb-1">O que será enviado:</p>
              {selectedReportType === 'daily' ? (
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Total de chamadas do dia</li>
                  <li>Chamadas por hora</li>
                  <li>Chamadas por destino</li>
                  <li>Sessões ativas e concluídas</li>
                </ul>
              ) : (
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Total de chamadas da semana</li>
                  <li>Chamadas por dia da semana</li>
                  <li>Top destinos</li>
                  <li>Dia mais movimentado</li>
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={sendReport} disabled={isSendingReport}>
              {isSendingReport ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Enviar Relatório
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
