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

    const loadImages = async () => {
      const month = new Date().getMonth() + 1; // 1-12
      const { data, error } = await supabase
        .from('marketing_images')
        .select('id, image_url, display_order')
        .eq('unit_name', unitName)
        .eq('month', month)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[MarketingImageSlideshow] load error:', error);
        return;
      }
      console.log('[MarketingImageSlideshow] loaded', {
        unitName, month, count: data?.length || 0,
      });
      setImages(data || []);
      setCurrentIndex(0);
    };

    loadImages();

    // Realtime: atualiza ao mudar imagens no admin
    const channel = supabase
      .channel(`marketing-images-${unitName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketing_images',
          filter: `unit_name=eq.${unitName}`,
        },
        () => loadImages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  if (!isIdle || images.length === 0) return null;

  const currentImg = images[currentIndex];
  const prevImg = previousIndex !== null ? images[previousIndex] : null;

  return (
    <div className="fixed inset-0 z-[60] bg-black animate-fade-in">
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
      {/* Indicador discreto de progresso */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
