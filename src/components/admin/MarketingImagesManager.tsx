import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Trash2, ImageIcon, Pin, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Categoria 0 = Fixas (exibir todo ano). 1-12 = mês correspondente.
const CATEGORY_FIXED = 0;

const MAX_IMAGES_PER_CATEGORY = 50;
const MAX_FILE_SIZE_MB = 5;
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.86;
const ONE_YEAR = '31536000';

interface MarketingImage {
  id: string;
  unit_name: string;
  month: number;
  image_url: string;
  storage_path: string;
  display_order: number;
  is_active: boolean;
  is_fixed: boolean;
}

interface Props {
  unitName: string;
}

export function MarketingImagesManager({ unitName }: Props) {
  // selectedCategory: 0 = fixas, 1..12 = mês
  const [selectedCategory, setSelectedCategory] = useState<number>(new Date().getMonth() + 1);
  const [images, setImages] = useState<MarketingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFixedCategory = selectedCategory === CATEGORY_FIXED;

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from('marketing_images')
      .select('*')
      .eq('unit_name', unitName)
      .order('display_order', { ascending: true });

    const { data, error } = isFixedCategory
      ? await query.eq('is_fixed', true)
      : await query.eq('is_fixed', false).eq('month', selectedCategory);

    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setImages((data || []) as MarketingImage[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [unitName, selectedCategory]);

  // Redimensiona p/ máx 1920px (lado maior) e converte para WebP q=0.86.
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

    const { naturalWidth: w0, naturalHeight: h0 } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(w0, h0));
    const w = Math.round(w0 * scale);
    const h = Math.round(h0 * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas ctx null');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob null'))), 'image/webp', WEBP_QUALITY)
    );
    return blob.size < file.size ? blob : file;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES_PER_CATEGORY - images.length;
    if (remaining <= 0) {
      toast({ title: 'Limite atingido', description: `Máximo de ${MAX_IMAGES_PER_CATEGORY} imagens por categoria.`, variant: 'destructive' });
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploading(true);

    let uploaded = 0;
    let nextOrder = images.length > 0 ? Math.max(...images.map(i => i.display_order)) + 1 : 0;

    const folder = isFixedCategory ? 'fixas' : String(selectedCategory);

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
      let ext = file.name.split('.').pop() || 'webp';
      try {
        const compressed = await compressImage(file);
        if (compressed !== file) {
          payload = compressed;
          contentType = 'image/webp';
          ext = 'webp';
        }
      } catch (err) {
        console.warn('Falha ao comprimir, usando original:', err);
      }

      const path = `${unitName}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('marketing-images')
        .upload(path, payload, { contentType, upsert: false, cacheControl: ONE_YEAR });

      if (upErr) {
        toast({ title: 'Falha no upload', description: upErr.message, variant: 'destructive' });
        continue;
      }

      const { data: urlData } = supabase.storage.from('marketing-images').getPublicUrl(path);

      const { error: insErr } = await supabase.from('marketing_images').insert({
        unit_name: unitName,
        month: isFixedCategory ? 1 : selectedCategory,
        is_fixed: isFixedCategory,
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
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Imagem removida' }); load(); }
  };

  const toggleActive = async (img: MarketingImage) => {
    const { error } = await supabase
      .from('marketing_images')
      .update({ is_active: !img.is_active })
      .eq('id', img.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else load();
  };

  // Reordena trocando display_order com vizinho.
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const a = images[index];
    const b = images[target];
    const { error: e1 } = await supabase.from('marketing_images').update({ display_order: b.display_order }).eq('id', a.id);
    const { error: e2 } = await supabase.from('marketing_images').update({ display_order: a.display_order }).eq('id', b.id);
    if (e1 || e2) toast({ title: 'Erro ao reordenar', description: (e1 || e2)!.message, variant: 'destructive' });
    else load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Slideshow de Imagens de Marketing
        </CardTitle>
        <CardDescription>
          Até {MAX_IMAGES_PER_CATEGORY} imagens por categoria. As <strong>Fixas</strong> aparecem o ano inteiro,
          enquanto as de cada mês aparecem apenas no mês correspondente. Exibidas em tela cheia na TV após 30s sem chamadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px]">
            <Select value={String(selectedCategory)} onValueChange={(v) => setSelectedCategory(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={String(CATEGORY_FIXED)}>📌 Fixas (exibir todo ano)</SelectItem>
                {MONTHS.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= MAX_IMAGES_PER_CATEGORY}
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
            {images.length} / {MAX_IMAGES_PER_CATEGORY} imagens
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
            <p className="text-muted-foreground">
              Nenhuma imagem em {isFixedCategory ? 'Fixas' : MONTHS[selectedCategory - 1]}.
            </p>
            <p className="text-sm text-muted-foreground mt-1">Clique em "Adicionar Imagens" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((img, idx) => (
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

                {img.is_fixed && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                    <Pin className="w-3 h-3" /> FIXA
                  </div>
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => move(idx, 1)} disabled={idx === images.length - 1}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => toggleActive(img)}>
                      {img.is_active ? 'Pausar' : 'Ativar'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(img)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
