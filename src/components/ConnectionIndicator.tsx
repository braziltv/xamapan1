import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function ConnectionIndicator() {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Create a test channel to monitor connection status
    const channel = supabase
      .channel('connection-status')
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setIsChecking(false);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setIsChecking(false);
        } else {
          setIsChecking(true);
        }
      });

    // Periodic ping check
    const interval = setInterval(async () => {
      try {
        const { error } = await supabase.from('patient_calls').select('id').limit(1);
        setIsConnected(!error);
      } catch {
        setIsConnected(false);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300",
        isChecking && "bg-yellow-500/20 text-yellow-500",
        isConnected && !isChecking && "bg-green-500/20 text-green-500",
        !isConnected && !isChecking && "bg-red-500/20 text-red-500 animate-pulse"
      )}
      title={isConnected ? "Conectado ao servidor" : "Desconectado do servidor"}
    >
      {isChecking ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Conectando...</span>
        </>
      ) : isConnected ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>Conectado com o Servidor</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Desconectado do Servidor</span>
        </>
      )}
    </div>
  );
}
