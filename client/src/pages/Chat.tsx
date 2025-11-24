import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { logger } from "@/lib/logger";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchDrawer } from "@/components/SearchDrawer";
import { ChatListView } from "@/components/chat/ChatListView";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatMessages } from "@/hooks/chat/useChatMessages";
import { useTypingIndicator } from "@/hooks/chat/useTypingIndicator";
import { useMessageReactions } from "@/hooks/chat/useMessageReactions";
import { useChatSettings } from "@/hooks/chat/useChatSettings";
import { Camera, Image, MapPin, Contact, Headphones, BarChart3, Calendar, FileText } from "lucide-react";
import type { Message, MessageReaction, EscrowTransaction, StatusUpdate } from "@shared/schema";
import type { ChatListItem, ChatDetails } from "@/types/chat";

export default function Chat() {
  // 1. Route & Auth
  const { id: chatId } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const currentUserId = user?.id || null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 2. Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<number, HTMLDivElement>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 3. State
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [peerOnlineStatus, setPeerOnlineStatus] = useState<Record<number, boolean>>({});
  const [tappedChatId, setTappedChatId] = useState<number | null>(null);

  // 4. Custom Hooks
  const messagesHook = useChatMessages({
    chatId,
    currentUserId,
    scrollContainerRef,
    messageRefs
  });

  const typingHook = useTypingIndicator({
    chatId,
    currentUserId,
    isConnected: false, // Will be updated by WebSocket
    sendWsMessage: () => {} // Will be updated by WebSocket
  });

  const reactionsHook = useMessageReactions({
    chatId,
    currentUserId
  });

  const settingsHook = useChatSettings();

  // 5. WebSocket Connection
  const { isConnected, connectionStatus, sendMessage: sendWsMessage } = useWebSocket(currentUserId, {
    onMessage: async (message) => {
      if (message.type === 'new_message') {
        try {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] }),
            queryClient.invalidateQueries({ queryKey: ['/api/chats'] }),
            queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] }),
            queryClient.invalidateQueries({ queryKey: ['/api/chats/unread'] })
          ]);
        } catch (error) {
          logger.error('Failed to invalidate queries', error, { component: 'Chat', operation: 'handleWebSocketMessage' });
        }
      } else if (message.type === 'reaction_added') {
        const { reaction } = message;
        if (reaction) {
          reactionsHook.setMessageReactions(prev => {
            const messageReactions = prev[reaction.messageId] || [];
            const existingIndex = messageReactions.findIndex(r => r.userId === reaction.userId);
            const normalizedReaction = {
              id: reaction.id,
              messageId: reaction.messageId,
              userId: reaction.userId,
              emoji: reaction.emoji,
              createdAt: reaction.createdAt ? new Date(reaction.createdAt) : null
            } as MessageReaction;
            if (existingIndex >= 0) {
              const updated = [...messageReactions];
              updated[existingIndex] = normalizedReaction;
              return { ...prev, [reaction.messageId]: updated };
            } else {
              return { ...prev, [reaction.messageId]: [...messageReactions, normalizedReaction] };
            }
          });
        }
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/reactions`] });
      } else if (message.type === 'reaction_removed') {
        const { messageId, userId } = message;
        if (messageId && userId) {
          reactionsHook.setMessageReactions(prev => {
            const messageReactions = prev[messageId] || [];
            const filtered = messageReactions.filter(r => r.userId !== userId);
            if (filtered.length === 0) {
              const { [messageId]: removed, ...rest } = prev;
              return rest;
            }
            return { ...prev, [messageId]: filtered };
          });
        }
        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/reactions`] });
      } else if (message.type === 'user_typing') {
        if (message.chatId && chatId && parseInt(chatId) === message.chatId) {
          typingHook.setTypingUsers(prev => ({
            ...prev,
            [message.userId]: message.isTyping
          }));
          if (message.isTyping) {
            setTimeout(() => {
              typingHook.setTypingUsers(prev => ({
                ...prev,
                [message.userId]: false
              }));
            }, 3000);
          }
        }
      } else if (message.type === 'user_status') {
        setPeerOnlineStatus(prev => ({
          ...prev,
          [message.userId]: message.status === 'online'
        }));
        logger.info(`User status changed`, { component: 'Chat', operation: 'handleWebSocketMessage', userId: message.userId, status: message.status });
      }
    },
    onConnect: () => {
      if (chatId) {
        sendWsMessage({
          type: 'join_chat',
          chatId: parseInt(chatId)
        });
        if (currentUserId) {
          sendWsMessage({
            type: 'user_online',
            userId: currentUserId
          });
        }
      }
    }
  });

  // Update typing hook with WebSocket functions
  useEffect(() => {
    (typingHook as any).isConnected = isConnected;
    (typingHook as any).sendWsMessage = sendWsMessage;
  }, [isConnected, sendWsMessage]);

  // 6. Queries
  const { data: chatList = [], isLoading: chatListLoading } = useQuery<ChatListItem[]>({
    queryKey: ["/api/chats"],
    enabled: !chatId,
  });

  const { data: allStatuses = [] } = useQuery<StatusUpdate[]>({
    queryKey: ['/api/status'],
    enabled: !!user,
    staleTime: 10 * 1000,
  });

  const { data: chatDetails } = useQuery<ChatDetails>({
    queryKey: [`/api/chats/${chatId}`],
    enabled: !!chatId,
  });

  const otherUserDisplayName = useMemo(() => {
    if (!chatDetails || !currentUserId) return 'pengguna ini';
    const isCurrentUserBuyer = currentUserId === chatDetails.buyerId;
    return isCurrentUserBuyer
      ? (chatDetails.sellerDisplayName || chatDetails.sellerUsername || 'pengguna ini')
      : (chatDetails.buyerDisplayName || chatDetails.buyerUsername || 'pengguna ini');
  }, [chatDetails, currentUserId]);

  const { data: reactionsData = [] } = useQuery<MessageReaction[]>({
    queryKey: [`/api/chats/${chatId}/reactions`],
    enabled: !!chatId,
  });

  useEffect(() => {
    const organizedReactions: Record<number, MessageReaction[]> = {};
    reactionsData.forEach(reaction => {
      if (!organizedReactions[reaction.messageId]) {
        organizedReactions[reaction.messageId] = [];
      }
      organizedReactions[reaction.messageId].push(reaction);
    });
    reactionsHook.setMessageReactions(organizedReactions);
  }, [reactionsData]);

  // 7. Mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!chatId) throw new Error("No chat selected");
      if (!content.trim()) throw new Error("Message cannot be empty");
      if (!currentUserId) throw new Error("User not authenticated");
      
      try {
        const sent = sendWsMessage({
          type: 'chat_message',
          chatId: parseInt(chatId),
          senderId: currentUserId,
          content: content.trim()
        }, false);

        if (!sent) {
          logger.info('WebSocket unavailable, falling back to HTTP API', { component: 'Chat', operation: 'sendMessage' });
          return apiRequest(`/api/chats/${chatId}/messages`, { 
            method: 'POST', 
            body: { content: content.trim() } 
          });
        }
      } catch (error) {
        logger.error('Failed to send message via WebSocket, trying HTTP fallback', error, { component: 'Chat', operation: 'sendMessage' });
        return apiRequest(`/api/chats/${chatId}/messages`, { 
          method: 'POST', 
          body: { content: content.trim() } 
        });
      }
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats/unread'] });
    },
    onError: (error: any) => {
      logger.error('Failed to send message', error, { component: 'Chat', operation: 'sendMessageMutation' });
      toast({
        title: "Gagal mengirim pesan",
        description: error.message || "Silakan coba lagi.",
        variant: "destructive"
      });
    }
  });

  const fileUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/chats/${chatId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats/unread'] });
    },
    onError: (error: any) => {
      logger.error('File upload error', error, { component: 'Chat', operation: 'uploadFileMutation' });
      toast({
        title: "Gagal mengunggah file",
        description: error.message || "Silakan coba lagi.",
        variant: "destructive"
      });
    }
  });

  // 8. Event Handlers
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !sendMessageMutation.isPending) {
      if (typingHook.isTyping && currentUserId) {
        typingHook.handleTyping();
      }
      sendMessageMutation.mutate(newMessage.trim());
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      await fileUploadMutation.mutateAsync(file);
    } catch (error) {
      logger.error('Failed to upload file', error, { component: 'Chat', operation: 'handleFileSelect' });
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleAttachmentOptionClick = (type: string) => {
    settingsHook.setAttachmentSheetOpen(false);
    if (type === 'gallery' || type === 'document') {
      fileInputRef.current?.click();
    } else {
      toast({
        title: "Coming Soon",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} feature will be available soon.`,
      });
    }
  };

  const handleChatClick = useCallback((chatId: number) => {
    setTappedChatId(chatId);
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    navigationTimeoutRef.current = setTimeout(() => {
      setLocation(`/chat/${chatId}`);
      setTappedChatId(null);
      navigationTimeoutRef.current = null;
    }, 150);
  }, [setLocation]);

  const handleCameraClick = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          logger.info('Camera access granted', { component: 'Chat', operation: 'requestCameraAccess' });
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          logger.error('Camera access denied', err, { component: 'Chat', operation: 'requestCameraAccess' });
          toast({
            title: "Akses kamera ditolak",
            description: "Pastikan Anda memberikan izin kamera.",
            variant: "destructive"
          });
        });
    } else {
      toast({
        title: "Kamera tidak tersedia",
        description: "Kamera tidak tersedia di perangkat ini.",
        variant: "destructive"
      });
    }
  };

  // 9. Helper Functions
  const filteredChatList = chatList.filter(chat => 
    searchQuery === "" || 
    chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.productTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.otherUser?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `Chat #${chat.id}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (timestamp?: string | null) => {
    if (!timestamp) return '';
    try {
      const now = new Date();
      const messageTime = new Date(timestamp);
      if (isNaN(messageTime.getTime())) return '';
      const diffInHours = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60 * 60));
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
        return diffInMinutes < 1 ? 'Sekarang' : `${diffInMinutes}m`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h`;
      } else if (diffInHours < 48) {
        return 'Kemarin';
      } else {
        return messageTime.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
      }
    } catch (error) {
      logger.error('Error formatting time', error, { component: 'Chat', operation: 'formatTimeAgo' });
      return '';
    }
  };

  const userHasActiveStatus = (userId: number) => {
    if (!allStatuses || allStatuses.length === 0) return false;
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    return allStatuses.some(status => {
      if (status.userId !== userId) return false;
      if (!status.createdAt) return false;
      const statusTime = new Date(status.createdAt).getTime();
      return statusTime > twentyFourHoursAgo;
    });
  };

  // 10. Cleanup
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, []);

  // 11. Render
  if (!chatId) {
    return (
      <ChatListView
        chats={filteredChatList}
        currentUserId={currentUserId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onChatSelect={handleChatClick}
        onCameraClick={handleCameraClick}
        onGoToSettings={() => setLocation("/settings")}
        chatListLoading={chatListLoading}
        typingUsers={typingHook.typingUsers}
        peerOnlineStatus={peerOnlineStatus}
        userHasActiveStatus={userHasActiveStatus}
        formatTimeAgo={formatTimeAgo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-nxe-dark flex flex-col animate-chat-enter">
      <ChatHeader
        chatDetails={chatDetails}
        isTyping={typingHook.isTyping}
        typingUsers={typingHook.typingUsers}
        onlineStatus={peerOnlineStatus}
        currentUserId={currentUserId}
        chatSettings={settingsHook.chatSettings}
        onBack={() => setLocation("/chat")}
        onSearch={() => settingsHook.setSearchDrawerOpen(true)}
        onViewProfile={() => toast({ title: "Coming Soon", description: "Profile view will be available soon." })}
        onCall={() => toast({ title: "Coming Soon", description: "Voice call will be available soon." })}
        onVideoCall={() => toast({ title: "Coming Soon", description: "Video call will be available soon." })}
        toggleNotifications={settingsHook.toggleNotifications}
        toggleTemporaryMessages={settingsHook.toggleTemporaryMessages}
        toggleChatLock={settingsHook.toggleChatLock}
        toggleFavorite={settingsHook.toggleFavorite}
        toggleBlocked={settingsHook.toggleBlocked}
        onGoToSettings={() => setLocation("/settings")}
      />

      <ChatMessageList
        messages={messagesHook.localMessages}
        currentUserId={currentUserId}
        reactions={reactionsHook.messageReactions}
        onReactionAdd={reactionsHook.handleEmojiClick}
        onReactionRemove={reactionsHook.handleReactionClick}
        chatId={chatId}
        highlightedMessageId={messagesHook.highlightedMessageId}
        showJumpToBottom={messagesHook.showJumpToBottom}
        unreadCount={messagesHook.unreadCount}
        onJumpToBottom={messagesHook.handleJumpToBottom}
        onLoadOlder={messagesHook.handleLoadOlder}
        isLoadingOlder={messagesHook.isLoadingOlder}
        hasOlderMessages={messagesHook.hasOlderMessages}
        expandedMessages={messagesHook.expandedMessages}
        onToggleExpand={messagesHook.toggleMessageExpansion}
        hoveredMessageId={reactionsHook.hoveredMessageId}
        setHoveredMessageId={reactionsHook.setHoveredMessageId}
        showReactionPicker={reactionsHook.showReactionPicker}
        toggleReactionPicker={reactionsHook.toggleReactionPicker}
        availableEmojis={reactionsHook.availableEmojis}
        addReactionPending={reactionsHook.addReactionMutation.isPending}
        removeReactionPending={reactionsHook.removeReactionMutation.isPending}
        typingUsers={typingHook.typingUsers}
        scrollContainerRef={scrollContainerRef}
        messageRefs={messageRefs}
        messagesEndRef={messagesEndRef}
        messagesLoading={messagesHook.messagesLoading}
      />

      <ChatInput
        value={newMessage}
        onChange={setNewMessage}
        onSend={handleSendMessage}
        disabled={sendMessageMutation.isPending || fileUploadMutation.isPending}
        isTyping={typingHook.isTyping}
        onTyping={typingHook.handleTyping}
        onAttachmentClick={handleAttachmentClick}
        onStickerClick={() => settingsHook.setStickerPickerOpen(true)}
        onCameraClick={() => toast({ title: "Coming Soon", description: "Camera feature will be available soon." })}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        uploadPending={fileUploadMutation.isPending}
      />

      <SearchDrawer
        open={settingsHook.searchDrawerOpen}
        onOpenChange={settingsHook.setSearchDrawerOpen}
        onJumpToMessage={messagesHook.handleJumpToMessage}
        currentChatId={Number(chatId)}
      />

      <Sheet open={settingsHook.attachmentSheetOpen} onOpenChange={settingsHook.setAttachmentSheetOpen}>
        <SheetContent side="bottom" className="bg-nxe-dark border-nxe-surface">
          <SheetHeader>
            <SheetTitle className="text-white">Share</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-4 mt-6 pb-6">
            {[
              { icon: Image, label: "Galeri", type: "gallery", color: "blue" },
              { icon: Camera, label: "Kamera", type: "camera", color: "pink" },
              { icon: MapPin, label: "Lokasi", type: "location", color: "green" },
              { icon: Contact, label: "Kontak", type: "contact", color: "cyan" },
              { icon: FileText, label: "Dokumen", type: "document", color: "purple" },
              { icon: Headphones, label: "Audio", type: "audio", color: "orange" },
              { icon: BarChart3, label: "Polling", type: "polling", color: "yellow" },
              { icon: Calendar, label: "Acara", type: "event", color: "red" }
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => handleAttachmentOptionClick(item.type)}
                className="flex flex-col items-center gap-2 group"
                data-testid={`attachment-${item.type}`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-${item.color}-500/20 flex items-center justify-center group-hover:bg-${item.color}-500/30 transition-colors`}>
                  <item.icon className={`h-6 w-6 text-${item.color}-400`} />
                </div>
                <span className="text-xs text-gray-300">{item.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={settingsHook.stickerPickerOpen} onOpenChange={settingsHook.setStickerPickerOpen}>
        <SheetContent side="bottom" className="bg-nxe-dark border-nxe-surface h-[400px]">
          <SheetHeader>
            <SheetTitle className="text-white">Stickers</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-3 mt-6 pb-6 overflow-y-auto h-[320px]">
            {['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥', '👏', '💯', '🚀', '⭐', '💪', '🎊', '✨', '🌟'].map((sticker, index) => (
              <button
                key={index}
                onClick={() => {
                  setNewMessage(prev => prev + sticker);
                  settingsHook.setStickerPickerOpen(false);
                }}
                className="w-full aspect-square rounded-2xl bg-nxe-surface hover:bg-nxe-surface/70 flex items-center justify-center text-4xl transition-colors"
                data-testid={`sticker-${index}`}
              >
                {sticker}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
