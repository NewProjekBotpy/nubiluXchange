import { Check, CheckCheck, FileText, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DOMPurify from 'dompurify';
import type { Message, MessageReaction } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
  currentUserId: number | null;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  reactions: MessageReaction[];
  showReactionPicker: boolean;
  onToggleReactionPicker: () => void;
  onReactionClick: (emoji: string) => void;
  onEmojiClick: (emoji: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  availableEmojis: string[];
  addReactionPending: boolean;
  removeReactionPending: boolean;
  showTail: boolean;
  highlighted: boolean;
  messageRef: (el: HTMLDivElement | null) => void;
}

const MESSAGE_CHAR_LIMIT = 700;

export function ChatMessage({
  message,
  currentUserId,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  reactions,
  showReactionPicker,
  onToggleReactionPicker,
  onReactionClick,
  onEmojiClick,
  expanded,
  onToggleExpand,
  availableEmojis,
  addReactionPending,
  removeReactionPending,
  showTail,
  highlighted,
  messageRef
}: ChatMessageProps) {
  
  // Sanitize message content to prevent XSS attacks
  const sanitizeContent = (content: string): string => {
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Check if message should be truncated
  const shouldTruncateMessage = (content: string) => {
    return content.length > MESSAGE_CHAR_LIMIT;
  };

  // Get truncated content
  const getTruncatedContent = (content: string) => {
    if (content.length <= MESSAGE_CHAR_LIMIT) return content;
    return content.substring(0, MESSAGE_CHAR_LIMIT);
  };

  // Get message bubble style
  const getMessageStyle = (senderId: number, messageType: string, metadata?: any) => {
    if (metadata?.isAiAdmin || metadata?.aiType) {
      return "bg-yellow-600/20 border border-yellow-600/30 text-yellow-100";
    }
    if (metadata?.isSystem) {
      return "bg-gray-600/20 border border-gray-600/30 text-gray-300";
    }
    if (senderId === currentUserId) {
      return "bg-nxe-primary text-white ml-auto";
    }
    return "bg-nxe-surface text-white";
  };


  // WhatsApp-style status indicator
  const MessageStatusIndicator = ({ message }: { message: Message }) => {
    if (message.senderId !== currentUserId) return null;
    if (message.metadata?.isAiAdmin || message.metadata?.aiType) return null;

    const getStatusIcon = () => {
      switch (message.status) {
        case 'sent':
          return <Check className="h-4 w-4 text-gray-400" />;
        case 'delivered':
          return <CheckCheck className="h-4 w-4 text-gray-400" />;
        case 'read':
          return <CheckCheck className="h-4 w-4 text-blue-400" />;
        default:
          return <Check className="h-4 w-4 text-gray-400" />;
      }
    };

    return (
      <span className="inline-flex items-center ml-1" data-testid={`status-${message.status}-${message.id}`}>
        {getStatusIcon()}
      </span>
    );
  };

  // Get aggregated reactions for display
  const getAggregatedReactions = () => {
    const aggregated: Record<string, { count: number; users: number[] }> = {};

    reactions.forEach(reaction => {
      if (!aggregated[reaction.emoji]) {
        aggregated[reaction.emoji] = { count: 0, users: [] };
      }
      aggregated[reaction.emoji].count++;
      aggregated[reaction.emoji].users.push(reaction.userId);
    });

    return aggregated;
  };

  const isSentByCurrentUser = message.senderId === currentUserId;

  return (
    <div
      ref={messageRef}
      className={`flex ${isSentByCurrentUser ? 'justify-end' : 'justify-start'} mb-1 px-2 ${highlighted ? 'bg-yellow-500/20 animate-highlight-flash' : ''}`}
      data-testid={`message-${message.id}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex flex-col">
        <div 
          className={`relative max-w-[85%] sm:max-w-sm lg:max-w-md px-1.5 py-1 ${isSentByCurrentUser ? 'rounded-[1.2rem_1.2rem_0.2rem_1.2rem]' : 'rounded-[1.2rem_1.2rem_1.2rem_0.2rem]'} ${getMessageStyle(message.senderId, message.messageType || 'text', message.metadata)}`}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
              return;
            }
            onToggleReactionPicker();
          }}
        >
          {(message.metadata?.isAiAdmin || message.metadata?.aiType) && (
            <div className="flex items-center space-x-1 -mb-0.5">
              <Badge variant="outline" className="text-[10px] border-yellow-600/50 px-1 py-0">
                AI Admin
              </Badge>
            </div>
          )}
          
          {/* Render different message types */}
          {message.messageType === 'image' ? (
            <div className="space-y-0.5">
              <img 
                src={message.content} 
                alt="Shared image" 
                className="max-w-full h-auto rounded-md cursor-pointer"
                onClick={() => window.open(message.content, '_blank')}
                data-testid={`image-message-${message.id}`}
              />
              {message.metadata?.fileName && (
                <p className="text-[10px] opacity-70">{message.metadata.fileName}</p>
              )}
            </div>
          ) : message.messageType === 'file' ? (
            <div className="flex items-center space-x-1 p-1 bg-white/10 rounded-md">
              <FileText className="h-6 w-6 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {message.metadata?.fileName || 'File'}
                </p>
                {message.metadata?.fileSize && (
                  <p className="text-[10px] opacity-70">
                    {(message.metadata.fileSize / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => window.open(message.content, '_blank')}
                className="text-blue-400 hover:text-blue-300 h-6 w-6 p-0"
                data-testid={`download-file-${message.id}`}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="text-xs leading-snug break-words">
              {shouldTruncateMessage(message.content) && !expanded ? (
                <div>
                  <p dangerouslySetInnerHTML={{__html: sanitizeContent(getTruncatedContent(message.content))}} />
                  <button 
                    onClick={onToggleExpand}
                    className="text-blue-400 hover:text-blue-300 font-medium text-[10px] transition-colors"
                    data-testid={`button-read-more-${message.id}`}
                  >
                    ... Baca Selengkapnya
                  </button>
                </div>
              ) : (
                <div>
                  <p dangerouslySetInnerHTML={{__html: sanitizeContent(message.content)}} />
                  {shouldTruncateMessage(message.content) && expanded && (
                    <button 
                      onClick={onToggleExpand}
                      className="text-blue-400 hover:text-blue-300 font-medium text-[10px] transition-colors"
                      data-testid={`button-show-less-${message.id}`}
                    >
                      Tampilkan lebih sedikit
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between animate-timestamp-fade mt-0.5">
            <p className="text-[10px] opacity-70">
              {message.createdAt ? formatMessageTime(typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString()) : ''}
            </p>
            <MessageStatusIndicator message={message} />
          </div>
        </div>

        {/* Reactions Display */}
        {(message.messageType === 'text' || message.messageType === 'image' || message.messageType === 'file') && (
          <div className={`flex items-center gap-0.5 mt-0.5 ${isSentByCurrentUser ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(getAggregatedReactions()).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => onReactionClick(emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-colors animate-reaction-pop ${
                  data.users.includes(currentUserId || 0)
                    ? 'bg-nxe-primary/30 border border-nxe-primary'
                    : 'bg-nxe-surface/50 border border-nxe-surface hover:bg-nxe-surface'
                }`}
                data-testid={`reaction-${emoji}-${message.id}`}
              >
                <span className="text-xs">{emoji}</span>
                <span className="text-white">{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reaction Picker */}
        {showReactionPicker && (
          <div 
            className={`flex items-center gap-1.5 mt-1 p-1.5 bg-nxe-surface/95 backdrop-blur-sm rounded-xl shadow-lg border border-nxe-surface animate-reaction-pop ${
              isSentByCurrentUser ? 'ml-auto' : 'mr-auto'
            }`}
            data-testid={`popover-reactions-${message.id}`}
          >
            {availableEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onEmojiClick(emoji);
                  onToggleReactionPicker();
                }}
                disabled={addReactionPending || removeReactionPending}
                className="text-xl hover:scale-110 transition-transform p-0.5 rounded disabled:opacity-50"
                data-testid={`emoji-${emoji}-${message.id}`}
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={onToggleReactionPicker}
              className="ml-0.5 text-gray-400 hover:text-white transition-colors"
              data-testid={`button-close-reactions-${message.id}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
