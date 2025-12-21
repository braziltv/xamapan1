import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, Plus, Edit, Trash2, Loader2, GripVertical } from 'lucide-react';
import { useModules } from '@/hooks/useAdminData';
import { Module, AVAILABLE_ICONS } from '@/types/admin';
import * as LucideIcons from 'lucide-react';

interface ModulesManagerProps {
  unitId: string;
}

export function ModulesManager({ unitId }: ModulesManagerProps) {
  const { modules, loading, createModule, updateModule, deleteModule } = useModules(unitId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    icon: 'Activity',
    call_type: 'service',
    is_active: true,
    display_order: 0
  });

  const handleOpenCreate = () => {
    setEditingModule(null);
    setFormData({
      code: '',
      name: '',
      icon: 'Activity',
      call_type: 'service',
      is_active: true,
      display_order: modules.length
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (mod: Module) => {
    setEditingModule(mod);
    setFormData({
      code: mod.code,
      name: mod.name,
      icon: mod.icon,
      call_type: mod.call_type,
      is_active: mod.is_active,
      display_order: mod.display_order
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingModule) {
      await updateModule(editingModule.id, formData);
    } else {
      await createModule({ ...formData, unit_id: unitId });
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este módulo?')) {
      await deleteModule(id);
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
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
          <Layers className="w-5 h-5" />
          Módulos do Sistema
        </CardTitle>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Módulo
        </Button>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum módulo cadastrado. Clique em "Novo Módulo" para criar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((mod) => (
                <TableRow key={mod.id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {renderIcon(mod.icon)}
                      {mod.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{mod.code}</TableCell>
                  <TableCell>{mod.call_type}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${mod.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {mod.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(mod)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(mod.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingModule ? 'Editar Módulo' : 'Novo Módulo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Módulo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Sala de Eletrocardiograma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código (único)</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="Ex: ecg"
                />
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {renderIcon(formData.icon)}
                        {formData.icon}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          {renderIcon(icon)}
                          {icon}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Chamada</Label>
                <Select value={formData.call_type} onValueChange={(value) => setFormData({ ...formData, call_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="triage">Triagem</SelectItem>
                    <SelectItem value="doctor">Consulta Médica</SelectItem>
                    <SelectItem value="service">Serviço/Procedimento</SelectItem>
                    <SelectItem value="registration">Cadastro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Módulo Ativo</Label>
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
              <Button onClick={handleSubmit}>
                {editingModule ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
