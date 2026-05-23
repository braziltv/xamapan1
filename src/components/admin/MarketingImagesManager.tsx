import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Trash2, ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MAX_IMAGES_PER_MONTH = 30;
const MAX_FILE_SIZE_MB = 5;

interface MarketingImage {
  id: string;
  unit_name: string;
  month: number;
  image_url: string;
  storage_path: string;
  display_order: number;
  is_active: boolean;
}

interface Props {
  unitName: string;
}

export function MarketingImagesManager({ unitName }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [images, setImages] = useState<MarketingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketing_images')
      .select('*')
      .eq('unit_name', unitName)
      .eq('month', selectedMonth)
      .order('display_order', { ascending: true });

    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setImages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [unitName, selectedMonth]);

  // Converte para WebP q=0.90 mantendo resolução original.
  // WebP oferece ~25-35% melhor compressão que JPEG na mesma qualidade visual.
  const compressImage = async (file: File): Promise<Blob> => {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas ctx null');
    // Fundo branco para evitar áreas pretas vindas de PNG transparente
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/webp', 0.90)
    );
    // Se compressão deixou maior, mantém original
    return blob.size < file.size ? blob : file;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES_PER_MONTH - images.length;
    if (remaining <= 0) {
      toast({ title: 'Limite atingido', description: `Máximo de ${MAX_IMAGES_PER_MONTH} imagens por mês.`, variant: 'destructive' });
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploading(true);

    let uploaded = 0;
    let nextOrder = images.length > 0 ? Math.max(...images.map(i => i.display_order)) + 1 : 0;

    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Arquivo ignorado', description: `${file.name} não é uma imagem.`, variant: 'destructive' });
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: `${file.name} excede ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
        continue;
      }

      let payload: Blob = file;
      let contentType = file.type;
      let ext = file.name.split('.').pop() || 'jpg';
      try {
        const compressed = await compressImage(file);
        if (compressed !== file) {
          payload = compressed;
          contentType = 'image/jpeg';
          ext = 'jpg';
        }
      } catch (err) {
        console.warn('Falha ao comprimir, usando original:', err);
      }

      const path = `${unitName}/${selectedMonth}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('marketing-images')
        .upload(path, payload, { contentType, upsert: false });

      if (upErr) {
        toast({ title: 'Falha no upload', description: upErr.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage.from('marketing-images').getPublicUrl(path);

      const { error: insErr } = await supabase.from('marketing_images').insert({
        unit_name: unitName,
        month: selectedMonth,
        image_url: urlData.publicUrl,
        storage_path: path,
        display_order: nextOrder++,
        is_active: true,
      });

      if (insErr) {
        await supabase.storage.from('marketing-images').remove([path]);
        toast({ title: 'Erro ao salvar', description: insErr.message, variant: 'destructive' });
        continue;
      }
      uploaded++;
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (uploaded > 0) {
      toast({ title: 'Upload concluído', description: `${uploaded} imagem(ns) adicionada(s).` });
      load();
    }
  };

  const handleDelete = async (img: MarketingImage) => {
    if (!confirm('Remover esta imagem?')) return;
    await supabase.storage.from('marketing-images').remove([img.storage_path]);
    const { error } = await supabase.from('marketing_images').delete().eq('id', img.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Imagem removida' });
      load();
    }
  };

  const toggleActive = async (img: MarketingImage) => {
    const { error } = await supabase
      .from('marketing_images')
      .update({ is_active: !img.is_active })
      .eq('id', img.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Slideshow de Imagens por Mês
        </CardTitle>
        <CardDescription>
          Até {MAX_IMAGES_PER_MONTH} imagens por mês. Exibidas em tela cheia na TV após 30s sem chamadas
          (15s por imagem). Ao ocorrer uma chamada, o slideshow some e o painel volta automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[180px]">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= MAX_IMAGES_PER_MONTH}
            className="gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Enviando...' : 'Adicionar Imagens'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />

          <span className="text-sm text-muted-foreground ml-auto">
            {images.length} / {MAX_IMAGES_PER_MONTH} imagens
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma imagem para {MONTHS[selectedMonth - 1]}.</p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Adicionar Imagens" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  img.is_active ? 'border-primary/40' : 'border-muted opacity-50'
                }`}
              >
                <img
                  src={img.image_url}
                  alt=""
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleActive(img)}
                  >
                    {img.is_active ? 'Pausar' : 'Ativar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(img)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  #{img.display_order + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
