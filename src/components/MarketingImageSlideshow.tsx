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
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[MarketingImageSlideshow] load error:', error);
        return;
      }
      console.log('[MarketingImageSlideshow] loaded', {
        unitName: uName, month, count: data?.length || 0,
      });
      if (cancelled) return;
      setImages(data || []);
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

  // Alterna efeito Ken Burns para cada imagem
  const kbClass = `slideshow-kb-${(currentIndex % 4) + 1}`;
  const prevKbClass = previousIndex !== null ? `slideshow-kb-${(previousIndex % 4) + 1}` : '';

  return (
    <div className="fixed inset-0 z-[80] bg-black animate-fade-in overflow-hidden">
      {prevImg && (
        <img
          key={`prev-${prevImg.id}-${currentIndex}`}
          src={prevImg.image_url}
          alt=""
          className={`absolute inset-0 w-full h-full object-contain slideshow-previous ${prevKbClass}`}
        />
      )}
      <img
        key={`cur-${currentImg.id}-${currentIndex}`}
        src={currentImg.image_url}
        alt=""
        className={`absolute inset-0 w-full h-full object-contain ${kbClass}`}
      />
      {/* Vinheta sutil para um toque mais profissional */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(0,0,0,0.45)_100%)] z-[5]" />
      {/* Indicador discreto de progresso */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === currentIndex ? 'w-10 bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'w-1.5 bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
