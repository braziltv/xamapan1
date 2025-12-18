import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CustomAnnouncementButtonProps {
  className?: string;
}

export function CustomAnnouncementButton({ className }: CustomAnnouncementButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error('Digite uma mensagem para anunciar');
      return;
    }

    setIsSubmitting(true);

    try {
      const unitName = localStorage.getItem('selectedUnitName') || '';

      // Insert a custom announcement into patient_calls
      const { error } = await supabase.from('patient_calls').insert({
        patient_name: text.trim(),
        call_type: 'custom',
        status: 'active',
        unit_name: unitName,
        priority: 'normal',
        destination: null,
      });

      if (error) {
        console.error('Error creating custom announcement:', error);
        toast.error('Erro ao enviar mensagem');
        return;
      }

      toast.success('Mensagem enviada para a TV!');
      setText('');
      setOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-300 ${className}`}
        >
          <Megaphone className="w-4 h-4" />
          Áudio Avulso Na TV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-red-500" />
            Áudio Avulso Na TV
          </DialogTitle>
          <DialogDescription>
            Digite exatamente o que será anunciado na TV por voz. O texto será falado exatamente como digitado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Ex: Atenção! O atendimento será encerrado às 18 horas."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {text.length}/500 caracteres
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <>Enviando...</>
            ) : (
              <>
                <Megaphone className="w-4 h-4 mr-2" />
                Anunciar na TV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
