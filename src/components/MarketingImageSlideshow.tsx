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
  const [fadeProgress, setFadeProgress] = useState(1); // 0 = recém-trocado, 1 = totalmente exibido
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guarda a ordem embaralhada fixa durante a sessão
  const sessionOrderRef = useRef<string[]>([]);
  const sessionMonthRef = useRef<number>(0);

  // Carrega as imagens do mês atual da unidade
  useEffect(() => {
    if (!unitName) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const applySessionOrder = (data: MarketingImage[]) => {
      const currentMonth = new Date().getMonth() + 1;
      // Se mudou de mês ou primeira carga, embaralha e fixa a ordem
      if (sessionMonthRef.current !== currentMonth || sessionOrderRef.current.length === 0) {
        sessionMonthRef.current = currentMonth;
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        sessionOrderRef.current = shuffled.map((img) => img.id);
        return shuffled;
      }
      // Mantém ordem da sessão: imagens conhecidas na ordem fixa, novas no final
      const orderMap = new Map(sessionOrderRef.current.map((id, idx) => [id, idx]));
      const known: MarketingImage[] = [];
      const novel: MarketingImage[] = [];
      data.forEach((img) => {
        if (orderMap.has(img.id)) known.push(img);
        else novel.push(img);
      });
      known.sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!));
      // Adiciona novas imagens ao final do array de ordem
      novel.forEach((img) => sessionOrderRef.current.push(img.id));
      return [...known, ...novel];
    };

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
      const ordered = applySessionOrder(data || []);
      setImages(ordered);
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
      sessionOrderRef.current = [];
      sessionMonthRef.current = 0;
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

  // Dispara o crossfade apenas quando o índice realmente muda.
  // Resize/re-render não reinicia a animação (transition baseada em estado).
  useEffect(() => {
    if (previousIndex === null) return;
    setFadeProgress(0);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeProgress(1));
    });
    return () => cancelAnimationFrame(raf);
  }, [currentIndex, previousIndex]);

  if (!isIdle || images.length === 0) {
    if (import.meta.env.DEV) {
      console.log('[MarketingImageSlideshow] hidden', { isIdle, count: images.length, unitName });
    }
    return null;
  }

  const currentImg = images[currentIndex];
  const prevImg = previousIndex !== null ? images[previousIndex] : null;
  const FADE_MS = 1200;
  const transitionStyle = {
    transition: `opacity ${FADE_MS}ms ease-in-out`,
    willChange: 'opacity' as const,
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black">
      {prevImg && (
        <img
          key={`prev-${previousIndex}`}
          src={prevImg.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ ...transitionStyle, opacity: 1 - fadeProgress }}
        />
      )}
      <img
        key={`cur-${currentIndex}`}
        src={currentImg.image_url}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ ...transitionStyle, opacity: fadeProgress }}
      />
    </div>
  );
}
