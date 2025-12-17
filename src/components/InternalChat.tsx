import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatMessage {
  id: string;
  sender_station: string;
  sender_name?: string;
  message: string;
  created_at: string;
  recipient?: string;
}

interface InternalChatProps {
  station: 'cadastro' | 'triagem' | 'medico';
}

const STATION_COLORS: Record<string, string> = {
  cadastro: 'bg-blue-500',
  triagem: 'bg-amber-500',
  medico: 'bg-green-500',
};

const STATION_LABELS: Record<string, string> = {
  cadastro: 'Cadastro',
  triagem: 'Triagem',
  medico: 'Médico',
};

const RECIPIENT_LABELS: Record<string, string> = {
  todos: 'Todos',
  cadastro: 'Cadastro',
  triagem: 'Triagem',
  medico: 'Médico',
};

export function InternalChat({ station }: InternalChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState('todos');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unitName = localStorage.getItem('selectedUnitName') || '';

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Load initial messages
  useEffect(() => {
    if (!unitName) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('unit_name', unitName)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!error && data) {
        setMessages(data);
      }
    };

    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `unit_name=eq.${unitName}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          
          // Increment unread if chat is closed and message is for this station or all
          const isForMe = newMsg.recipient === 'todos' || newMsg.recipient === station;
          if (!isOpen && newMsg.sender_station !== station && isForMe) {
            setUnreadCount((prev) => prev + 1);
            // Play notification sound
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName, station, isOpen]);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 100);
    } catch (e) {
      console.log('Audio notification failed:', e);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !unitName) return;

    const { error } = await supabase.from('chat_messages').insert({
      unit_name: unitName,
      sender_station: station,
      message: newMessage.trim(),
      recipient: recipient,
    });

    if (!error) {
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="font-semibold text-sm">Chat Interno</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-2 bg-background">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                Nenhuma mensagem ainda
              </p>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.sender_station === station;
                const isPrivate = msg.recipient && msg.recipient !== 'todos';
                const isForMe = msg.recipient === 'todos' || msg.recipient === station || msg.sender_station === station;
                
                // Only show messages that are for this station or from this station
                if (!isForMe) return null;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded text-white ${
                          STATION_COLORS[msg.sender_station] || 'bg-gray-500'
                        }`}
                      >
                        {STATION_LABELS[msg.sender_station] || msg.sender_station}
                      </span>
                      {isPrivate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500 text-white">
                          → {RECIPIENT_LABELS[msg.recipient!] || msg.recipient}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatBrazilTime(new Date(msg.created_at), 'HH:mm')}
                      </span>
                    </div>
                    <div
                      className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : isPrivate
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-foreground border border-purple-300 dark:border-purple-700'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-border bg-card space-y-2">
            <div className="flex gap-2">
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger className="w-28 h-8 text-xs">
                  <SelectValue placeholder="Para" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-[60]">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cadastro" disabled={station === 'cadastro'}>Cadastro</SelectItem>
                  <SelectItem value="triagem" disabled={station === 'triagem'}>Triagem</SelectItem>
                  <SelectItem value="medico" disabled={station === 'medico'}>Médico</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite uma mensagem..."
                className="flex-1 text-sm h-8"
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                size="sm"
                className="px-3 h-8"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <Button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setUnreadCount(0);
        }}
        className={`rounded-full w-12 h-12 shadow-lg ${STATION_COLORS[station]} hover:opacity-90`}
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-white" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white" />
        )}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
}
