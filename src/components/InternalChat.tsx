import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, ChevronDown, Smile, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatBrazilTime } from '@/hooks/useBrazilTime';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

// Sound frequencies for each station (distinct tones)
const STATION_SOUNDS: Record<string, { freq: number; freq2?: number; type: OscillatorType; duration: number }> = {
  cadastro: { freq: 523, freq2: 659, type: 'sine', duration: 150 }, // C5 + E5 (melodic)
  triagem: { freq: 440, freq2: 554, type: 'triangle', duration: 120 }, // A4 + C#5 (alert)
  medico: { freq: 392, freq2: 523, type: 'sine', duration: 180 }, // G4 + C5 (gentle)
};

const COMMON_EMOJIS = [
  '👍', '👎', '👋', '🙏', '👏', '🤝',
  '✅', '❌', '⚠️', '🔴', '🟢', '🟡',
  '📋', '💊', '🩺', '🏥', '🚑', '⏰',
  '😊', '😅', '🤔', '😰', '😤', '🙄',
  '❗', '❓', '💬', '📢', '🔔', '✨',
];

export function InternalChat({ station }: InternalChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState('todos');
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceChannelRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
            // Play notification sound based on sender station
            playNotificationSound(newMsg.sender_station);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [unitName, station, isOpen]);

  // Presence channel for typing indicators
  useEffect(() => {
    if (!unitName) return;

    const presenceChannel = supabase.channel(`typing-${unitName}`);
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const typing: string[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.isTyping && presence.station !== station) {
              typing.push(presence.station);
            }
          });
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ station, isTyping: false });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [unitName, station]);

  const playNotificationSound = (senderStation: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sound = STATION_SOUNDS[senderStation] || STATION_SOUNDS.cadastro;
      
      // First tone
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      oscillator1.frequency.value = sound.freq;
      oscillator1.type = sound.type;
      gainNode1.gain.value = 0.15;
      
      oscillator1.start();
      setTimeout(() => {
        oscillator1.stop();
        
        // Second tone (if defined)
        if (sound.freq2) {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.value = sound.freq2;
          oscillator2.type = sound.type;
          gainNode2.gain.value = 0.12;
          
          oscillator2.start();
          setTimeout(() => {
            oscillator2.stop();
            audioContext.close();
          }, sound.duration);
        } else {
          audioContext.close();
        }
      }, sound.duration);
    } catch (e) {
      console.log('Audio notification failed:', e);
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !unitName) return;

    // Stop typing indicator
    if (presenceChannelRef.current) {
      await presenceChannelRef.current.track({ station, isTyping: false });
    }

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

  const handleTyping = async (value: string) => {
    setNewMessage(value);
    
    if (!presenceChannelRef.current) return;

    // Track typing
    await presenceChannelRef.current.track({ station, isTyping: value.length > 0 });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    if (value.length > 0) {
      typingTimeoutRef.current = setTimeout(async () => {
        if (presenceChannelRef.current) {
          await presenceChannelRef.current.track({ station, isTyping: false });
        }
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    if (!unitName) return;
    
    const confirmed = window.confirm('Limpar todas as mensagens do chat desta unidade?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('unit_name', unitName);

    if (!error) {
      setMessages([]);
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
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
                title="Limpar chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
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
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse px-1">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>
                  {typingUsers.map(u => STATION_LABELS[u]).join(', ')} digitando...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-border bg-card space-y-2">
            <div className="flex gap-1.5 items-center">
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue placeholder="Para" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-[60]">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="cadastro" disabled={station === 'cadastro'}>Cadastro</SelectItem>
                  <SelectItem value="triagem" disabled={station === 'triagem'}>Triagem</SelectItem>
                  <SelectItem value="medico" disabled={station === 'medico'}>Médico</SelectItem>
                </SelectContent>
              </Select>
              
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    type="button"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-64 p-2 bg-popover border border-border z-[60]" 
                  side="top" 
                  align="start"
                >
                  <div className="grid grid-cols-6 gap-1">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mensagem..."
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
