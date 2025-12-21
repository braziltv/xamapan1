import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useDestinations, useModules } from '@/hooks/useAdminData';
import { Destination } from '@/types/admin';

interface DestinationsManagerProps {
  unitId: string;
}

export function DestinationsManager({ unitId }: DestinationsManagerProps) {
  const { destinations, loading, createDestination, updateDestination, deleteDestination } = useDestinations(unitId);
  const { modules } = useModules(unitId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    module_id: '' as string | null,
    is_active: true,
    display_order: 0
  });

  const handleOpenCreate = () => {
    setEditingDestination(null);
    setFormData({
      name: '',
      display_name: '',
      module_id: null,
      is_active: true,
      display_order: destinations.length
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (dest: Destination) => {
    setEditingDestination(dest);
    setFormData({
      name: dest.name,
      display_name: dest.display_name,
      module_id: dest.module_id,
      is_active: dest.is_active,
      display_order: dest.display_order
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      unit_id: unitId,
      module_id: formData.module_id || null
    };
    
    if (editingDestination) {
      await updateDestination(editingDestination.id, payload);
    } else {
      await createDestination(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este destino?')) {
      await deleteDestination(id);
    }
  };

  const getModuleName = (moduleId: string | null) => {
    if (!moduleId) return 'Geral';
    const mod = modules.find(m => m.id === moduleId);
    return mod?.name || 'Desconhecido';
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
          <MapPin className="w-5 h-5" />
          Destinos de Chamada
        </CardTitle>
        <Button onClick={handleOpenCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Destino
        </Button>
      </CardHeader>
      <CardContent>
        {destinations.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum destino cadastrado. Clique em "Novo Destino" para criar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinations.map((dest) => (
                <TableRow key={dest.id}>
                  <TableCell className="font-medium">{dest.display_name}</TableCell>
                  <TableCell className="text-muted-foreground">{dest.name}</TableCell>
                  <TableCell>{getModuleName(dest.module_id)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${dest.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                      {dest.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(dest)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(dest.id)}>
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
                {editingDestination ? 'Editar Destino' : 'Novo Destino'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nome do Destino</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Ex: Consultório 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Código (para TTS)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: consultorio_1"
                />
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
                <Label htmlFor="is_active">Destino Ativo</Label>
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
                {editingDestination ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
