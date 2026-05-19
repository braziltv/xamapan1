import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketingImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface MarketingImageSlideshowProps {
  unitName: string;
  isIdle: boolean; // true quando deve aparecer (sem chamadas há 30s)
  imageDurationMs?: number;
}

/**
 * Slideshow de imagens de marketing exibido em tela cheia
 * sobreposto ao painel da TV quando ocioso. Ao iniciar uma
 * chamada, o componente pai define isIdle=false e o slideshow
 * desaparece imediatamente. Após 30s sem chamadas, isIdle=true
 * e o slideshow retorna.
 */
export function MarketingImageSlideshow({
  unitName,
  isIdle,
  imageDurationMs = 15000,
}: MarketingImageSlideshowProps) {
  const [images, setImages] = useState<MarketingImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Carrega as imagens do mês atual da unidade
  useEffect(() => {
    if (!unitName) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const loadImages = async (uName: string) => {
      const month = new Date().getMonth() + 1; // 1-12
      const { data, error } = await supabase
        .from('marketing_images')
        .select('id, image_url, display_order')
        .eq('unit_name', uName)
        .eq('month', month)
        .eq('is_active', true);

      if (error) {
        console.error('[MarketingImageSlideshow] load error:', error);
        return;
      }
      console.log('[MarketingImageSlideshow] loaded', {
        unitName: uName, month, count: data?.length || 0,
      });
      if (cancelled) return;
      // Embaralha ordem aleatória a cada carregamento
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      setImages(shuffled);
      setCurrentIndex(0);
    };

    const init = async () => {
      // O painel pode passar o display_name (ex: "Pronto Atendimento...") mas
      // o DB armazena o slug (ex: "pa_pedro_jose"). Resolvemos via units.
      let resolvedUnitName = unitName;
      const { data: unitRow } = await supabase
        .from('units')
        .select('name')
        .or(`name.eq.${unitName},display_name.eq.${unitName}`)
        .maybeSingle();

      if (unitRow?.name) resolvedUnitName = unitRow.name;
      console.log('[MarketingImageSlideshow] resolved unit', {
        input: unitName, resolved: resolvedUnitName,
      });

      await loadImages(resolvedUnitName);

      channel = supabase
        .channel(`marketing-images-${resolvedUnitName}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'marketing_images',
            filter: `unit_name=eq.${resolvedUnitName}`,
          },
          () => loadImages(resolvedUnitName)
        )
        .subscribe();
    };

    init();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [unitName]);

  // Avança a imagem em intervalos
  useEffect(() => {
    if (!isIdle || images.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        setPreviousIndex(prev);
        return (prev + 1) % images.length;
      });
    }, imageDurationMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isIdle, images.length, imageDurationMs]);

  if (!isIdle || images.length === 0) {
    if (import.meta.env.DEV) {
      console.log('[MarketingImageSlideshow] hidden', { isIdle, count: images.length, unitName });
    }
    return null;
  }

  const currentImg = images[currentIndex];
  const prevImg = previousIndex !== null ? images[previousIndex] : null;

  return (
    <div className="fixed inset-0 z-[80] bg-black animate-fade-in">
      {prevImg && (
        <img
          key={`prev-${prevImg.id}`}
          src={prevImg.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
        />
      )}
      <img
        key={`cur-${currentImg.id}`}
        src={currentImg.image_url}
        alt=""
        className="absolute inset-0 w-full h-full object-contain animate-fade-in"
      />
    </div>
  );
}
