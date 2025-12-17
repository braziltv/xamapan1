import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function ConnectionIndicator() {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Initial connection check
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('patient_calls').select('id').limit(1);
        setIsConnected(!error);
        setIsChecking(false);
      } catch {
        setIsConnected(false);
        setIsChecking(false);
      }
    };

    // Check immediately on mount
    checkConnection();

    // Periodic ping check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => {
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
          <span>Conectando</span>
        </>
      ) : isConnected ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
}
