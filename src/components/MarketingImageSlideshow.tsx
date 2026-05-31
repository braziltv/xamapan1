import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketingImage {
  id: string;
  image_url: string;
  display_order: number;
  is_fixed: boolean;
  month: number;
}

interface MarketingImageSlideshowProps {
  unitName: string;
  isIdle: boolean;
  imageDurationMs?: number;
}

/**
 * Slideshow de imagens de marketing (TV).
 *
 * Regras:
 * - Exibe simultaneamente imagens FIXAS (is_fixed=true) e as do MÊS atual.
 * - Embaralha ao carregar.
 * - Avança alternando fixa <-> mensal sempre que possível, para não repetir
 *   o mesmo tipo seguidamente.
 * - Pré-carrega apenas a próxima imagem (TVs fracas tipo Mi Stick).
 * - Crossfade de 1200ms.
 */
export function MarketingImageSlideshow({
  unitName,
  isIdle,
  imageDurationMs = 30000,
}: MarketingImageSlideshowProps) {
  const [images, setImages] = useState<MarketingImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [fadeProgress, setFadeProgress] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imagesRef = useRef<MarketingImage[]>([]);
  const currentIndexRef = useRef(0);

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const preloadImage = (image: MarketingImage) => new Promise<MarketingImage | null>((resolve) => {
    const img = new Image();
    img.onload = async () => {
      try { if (img.decode) await img.decode(); } catch {}
      resolve(image);
    };
    img.onerror = () => resolve(null);
    img.src = image.image_url;
  });

  // Carrega imagens (fixas + mês atual) da unidade
  useEffect(() => {
    if (!unitName) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const loadImages = async (uName: string) => {
      const month = new Date().getMonth() + 1;
      const { data, error } = await supabase
        .from('marketing_images')
        .select('id, image_url, display_order, is_fixed, month')
        .eq('unit_name', uName)
        .eq('is_active', true)
        .or(`is_fixed.eq.true,month.eq.${month}`);

      if (error) {
        console.error('[MarketingImageSlideshow] load error:', error);
        return;
      }
      if (cancelled) return;

      const raw = (data || []) as MarketingImage[];
      // Filtra: fixas OU (não-fixa do mês atual)
      const filtered = raw.filter(i => i.is_fixed || i.month === month);
      const ordered = shuffle(filtered);

      // Pré-carrega só a primeira; demais carregam sob demanda
      const first = ordered[0] ? await preloadImage(ordered[0]) : null;
      if (cancelled) return;

      // Remove imagens que falharam no preload inicial
      const valid = first ? ordered : ordered.slice(1);
      console.log('[MarketingImageSlideshow] loaded', {
        unitName: uName, month, count: valid.length,
        fixed: valid.filter(i => i.is_fixed).length,
        monthly: valid.filter(i => !i.is_fixed).length,
      });

      setImages(valid);
      setCurrentIndex(0);
      setPreviousIndex(null);
      setFadeProgress(1);
    };

    const init = async () => {
      let resolvedUnitName = unitName;
      const { data: unitRow } = await supabase
        .from('units')
        .select('name')
        .or(`name.eq.${unitName},display_name.eq.${unitName}`)
        .maybeSingle();
      if (unitRow?.name) resolvedUnitName = unitRow.name;

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

  // Escolhe próximo índice alternando fixa<->mensal quando ambos existem
  const pickNextIndex = (curr: number): number => {
    const list = imagesRef.current;
    if (list.length <= 1) return 0;
    const hasFixed = list.some(i => i.is_fixed);
    const hasMonthly = list.some(i => !i.is_fixed);
    if (!hasFixed || !hasMonthly) {
      return (curr + 1) % list.length;
    }
    const currentIsFixed = list[curr]?.is_fixed;
    // Procura próximo do tipo oposto, começando após curr
    for (let off = 1; off <= list.length; off++) {
      const idx = (curr + off) % list.length;
      if (list[idx].is_fixed !== currentIsFixed) return idx;
    }
    return (curr + 1) % list.length;
  };

  // Avança em intervalos, pré-carregando a próxima
  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!isIdle || images.length <= 1) return;

    const tick = async () => {
      const next = pickNextIndex(currentIndexRef.current);
      const nextImg = imagesRef.current[next];
      if (nextImg) await preloadImage(nextImg);
      setCurrentIndex((prev) => {
        setPreviousIndex(prev);
        return next;
      });
      timerRef.current = setTimeout(tick, imageDurationMs);
    };

    timerRef.current = setTimeout(tick, imageDurationMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isIdle, images.length, imageDurationMs]);

  useLayoutEffect(() => {
    if (previousIndex === null) return;
    setFadeProgress(0);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadeProgress(1));
    });
    return () => cancelAnimationFrame(raf);
  }, [currentIndex, previousIndex]);

  const handleImageError = (failedId: string) => {
    setImages((curr) => {
      if (curr.length <= 1) return curr;
      const failedIndex = curr.findIndex((image) => image.id === failedId);
      const next = curr.filter((image) => image.id !== failedId);
      if (failedIndex >= 0 && failedIndex <= currentIndex) {
        setCurrentIndex((index) => Math.max(0, Math.min(index - 1, next.length - 1)));
      }
      setPreviousIndex(null);
      setFadeProgress(1);
      return next;
    });
  };

  if (!isIdle || images.length === 0) return null;

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
          onError={() => handleImageError(prevImg.id)}
        />
      )}
      <img
        key={`cur-${currentIndex}`}
        src={currentImg.image_url}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        style={{ ...transitionStyle, opacity: fadeProgress }}
        onError={() => handleImageError(currentImg.id)}
      />
    </div>
  );
}
