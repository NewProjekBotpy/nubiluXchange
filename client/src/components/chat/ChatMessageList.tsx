import { useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ChatMessage } from "./ChatMessage";
import type { Message, MessageReaction } from "@shared/schema";

interface ChatMessageListProps {
  messages: Message[];
  currentUserId: number | null;
  reactions: Record<number, MessageReaction[]>;
  onReactionAdd: (messageId: number, emoji: string) => void;
  onReactionRemove: (messageId: number, emoji: string) => void;
  chatId: string;
  highlightedMessageId: number | null;
  showJumpToBottom: boolean;
  unreadCount: number;
  onJumpToBottom: () => void;
  onLoadOlder: () => void;
  isLoadingOlder: boolean;
  hasOlderMessages: boolean;
  expandedMessages: Record<number, boolean>;
  onToggleExpand: (messageId: number) => void;
  hoveredMessageId: number | null;
  setHoveredMessageId: (id: number | null) => void;
  showReactionPicker: Record<number, boolean>;
  toggleReactionPicker: (messageId: number) => void;
  availableEmojis: string[];
  addReactionPending: boolean;
  removeReactionPending: boolean;
  typingUsers: Record<number, boolean>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  messageRefs: React.MutableRefObject<Record<number, HTMLDivElement>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesLoading: boolean;
}

export function ChatMessageList({
  messages,
  currentUserId,
  reactions,
  onReactionAdd,
  onReactionRemove,
  chatId,
  highlightedMessageId,
  showJumpToBottom,
  unreadCount,
  onJumpToBottom,
  onLoadOlder,
  isLoadingOlder,
  hasOlderMessages,
  expandedMessages,
  onToggleExpand,
  hoveredMessageId,
  setHoveredMessageId,
  showReactionPicker,
  toggleReactionPicker,
  availableEmojis,
  addReactionPending,
  removeReactionPending,
  typingUsers,
  scrollContainerRef,
  messageRefs,
  messagesEndRef,
  messagesLoading
}: ChatMessageListProps) {

  // Get date label for headers
  const getDateLabel = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Hari Ini';
    } else if (diffDays === 1) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  };

  // Determine if date header should be shown
  const shouldShowDateHeader = (currentMessage: Message, previousMessage: Message | null): boolean => {
    if (!previousMessage) return true;
    if (!currentMessage.createdAt || !previousMessage.createdAt) return false;
    
    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);
    
    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);
    
    return currentDate.getTime() !== previousDate.getTime();
  };

  // Determine if bubble should show tail
  const shouldShowTail = (currentMessage: Message, nextMessage: Message | null): boolean => {
    if (!nextMessage) return true;
    if (currentMessage.senderId !== nextMessage.senderId) return true;
    
    if (!currentMessage.createdAt || !nextMessage.createdAt) return true;
    const currentTime = new Date(currentMessage.createdAt).getTime();
    const nextTime = new Date(nextMessage.createdAt).getTime();
    const timeGapMinutes = (nextTime - currentTime) / (1000 * 60);
    
    if (timeGapMinutes > 5) return true;
    
    return false;
  };

  // Infinite scroll: detect when user scrolls to top
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 100 && !isLoadingOlder && hasOlderMessages) {
        onLoadOlder();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isLoadingOlder, hasOlderMessages, onLoadOlder, scrollContainerRef]);

  return (
    <div className="relative flex-1 overflow-y-auto" ref={scrollContainerRef} data-testid="message-list">
      <div className="min-h-full flex flex-col justify-end">
        {/* Load Older Messages Button */}
        {hasOlderMessages && (
          <div className="text-center py-2">
            {isLoadingOlder ? (
              <div className="inline-flex items-center space-x-2 text-gray-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <span>Memuat pesan...</span>
              </div>
            ) : (
              <button
                onClick={onLoadOlder}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                data-testid="button-load-older"
              >
                Muat pesan lama
              </button>
            )}
          </div>
        )}

        {messagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loading size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Belum ada pesan</p>
            <p className="text-sm mt-1">Mulai percakapan!</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const previousMessage = index > 0 ? messages[index - 1] : null;
              const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
              const showDateHeader = shouldShowDateHeader(message, previousMessage);
              const showTail = shouldShowTail(message, nextMessage);
              
              return (
                <div key={message.id}>
                  {showDateHeader && message.createdAt && (
                    <div 
                      className="flex justify-center my-3"
                      data-testid={`date-header-${getDateLabel(typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString())}`}
                    >
                      <div className="bg-nxe-surface/60 backdrop-blur-sm text-gray-300 text-[11px] px-3 py-1 rounded-full">
                        {getDateLabel(typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString())}
                      </div>
                    </div>
                  )}
                  
                  <ChatMessage
                    message={message}
                    currentUserId={currentUserId}
                    isHovered={hoveredMessageId === message.id}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                    reactions={reactions[message.id] || []}
                    showReactionPicker={showReactionPicker[message.id] || false}
                    onToggleReactionPicker={() => toggleReactionPicker(message.id)}
                    onReactionClick={(emoji) => onReactionRemove(message.id, emoji)}
                    onEmojiClick={(emoji) => onReactionAdd(message.id, emoji)}
                    expanded={expandedMessages[message.id] || false}
                    onToggleExpand={() => onToggleExpand(message.id)}
                    availableEmojis={availableEmojis}
                    addReactionPending={addReactionPending}
                    removeReactionPending={removeReactionPending}
                    showTail={showTail}
                    highlighted={highlightedMessageId === message.id}
                    messageRef={(el) => {
                      if (el) messageRefs.current[message.id] = el;
                    }}
                  />
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {Object.values(typingUsers).some(typing => typing) && (
              <div className="flex justify-start mt-2">
                <TypingIndicator />
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Jump to Bottom Button */}
      {showJumpToBottom && (
        <div
          onClick={onJumpToBottom}
          className="absolute bottom-28 right-4 z-20 cursor-pointer group animate-scroll-button"
          data-testid="button-jump-to-bottom"
          style={{
            bottom: 'calc(7rem + env(safe-area-inset-bottom))'
          }}
        >
          {unreadCount > 0 ? (
            <div className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              <span className="font-medium text-sm" data-testid="text-unread-count">
                {unreadCount === 1 ? "1 pesan baru" : `${unreadCount} pesan baru`}
              </span>
              <ChevronDown className="h-5 w-5 group-hover:translate-y-0.5 transition-transform duration-200" />
            </div>
          ) : (
            <div 
              className="w-12 h-12 rounded-full relative overflow-hidden backdrop-blur-xl border border-white/20"
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25) 0%, rgba(34,197,94,0.15) 40%, rgba(22,163,74,0.1) 100%)',
                boxShadow: '0 8px 32px rgba(34,197,94,0.2), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)'
              }}
            >
              <div 
                className="absolute top-1 left-3 w-4 h-4 rounded-full opacity-60"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 70%)',
                  filter: 'blur(2px)'
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-emerald-500/10 rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ChevronDown className="h-6 w-6 text-emerald-600 drop-shadow-sm group-hover:translate-y-0.5 group-hover:text-emerald-500 transition-all duration-200" />
              </div>
              <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
