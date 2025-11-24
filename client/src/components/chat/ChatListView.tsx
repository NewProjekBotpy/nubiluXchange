import { useState } from "react";
import { Camera, MoreVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Loading, LoadingSkeleton } from "@/components/ui/loading";
import type { ChatListItem } from "@/types/chat";

interface ChatListViewProps {
  chats: ChatListItem[];
  currentUserId: number | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onChatSelect: (chatId: number) => void;
  onCameraClick: () => void;
  onGoToSettings: () => void;
  chatListLoading: boolean;
  typingUsers: Record<number, boolean>;
  peerOnlineStatus: Record<number, boolean>;
  userHasActiveStatus: (userId: number) => boolean;
  formatTimeAgo: (timestamp?: string | null) => string;
}

export function ChatListView({
  chats,
  currentUserId,
  searchQuery,
  onSearchChange,
  onChatSelect,
  onCameraClick,
  onGoToSettings,
  chatListLoading,
  typingUsers,
  peerOnlineStatus,
  userHasActiveStatus,
  formatTimeAgo
}: ChatListViewProps) {
  const [tappedChatId, setTappedChatId] = useState<number | null>(null);

  const handleChatClick = (chatId: number) => {
    setTappedChatId(chatId);
    setTimeout(() => setTappedChatId(null), 150);
    onChatSelect(chatId);
  };

  const getDisplayName = (chat: ChatListItem) => {
    if (chat.otherUser?.displayName) {
      return chat.otherUser.displayName;
    }
    if (chat.otherUser?.username) {
      return chat.otherUser.username;
    }
    return `User ${chat.isCurrentUserBuyer ? chat.sellerId : chat.buyerId}`;
  };

  const getAvatarFallback = (chat: ChatListItem) => {
    const name = getDisplayName(chat);
    return name ? name[0]?.toUpperCase() || 'U' : 'U';
  };

  return (
    <div className="min-h-screen bg-nxe-dark animate-chat-enter">
      {/* WhatsApp-style Header */}
      <div className="sticky top-0 z-30 bg-nxe-dark/95 backdrop-blur-md border-b border-nxe-surface pt-[env(safe-area-inset-top)]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-white">NubiluXchange</h1>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-2 hover:bg-transparent hover:scale-105 shrink-0 transition-all duration-200 ease-in-out" 
                data-testid="button-camera"
                onClick={onCameraClick}
              >
                <Camera className="h-5 w-5 text-gray-300 hover:text-white transition-colors duration-200" />
              </Button>
              
              {/* WhatsApp-style Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2 hover:bg-transparent hover:scale-105 shrink-0 transition-all duration-200 ease-in-out" 
                    data-testid="button-menu"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-300 hover:text-white transition-colors duration-200" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-nxe-surface border border-gray-600 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 transition-colors duration-150">
                    <span className="text-white">Grup baru</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 transition-colors duration-150">
                    <span className="text-white">Komunitas baru</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 transition-colors duration-150">
                    <span className="text-white">Siaran baru</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-600" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 transition-colors duration-150">
                    <span className="text-white">Perangkat tertaut</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 transition-colors duration-150">
                    <span className="text-white">Berbintang</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 transition-colors duration-150">
                    <span className="text-white">Baca semua</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-600" />
                  <DropdownMenuItem onClick={onGoToSettings} className="cursor-pointer hover:bg-gray-700 transition-colors duration-150">
                    <span className="text-white">Pengaturan</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 transition-colors duration-150">
                    <span className="text-white">Ganti akun</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* WhatsApp-style Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Tanya AI atau Cari..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-700/80 border-0 rounded-full text-white placeholder-gray-400 focus:bg-gray-600 focus:ring-2 focus:ring-green-500/50 transition-all duration-200"
              data-testid="input-search-chats"
            />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto">
        {chatListLoading ? (
          <div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-800/50" data-testid={`chat-skeleton-${i}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-nxe-card rounded-full">
                    <Loading variant="pulse" className="w-full h-full rounded-full" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <LoadingSkeleton className="w-full" lines={2} />
                  </div>
                  <div className="w-12 text-right">
                    <LoadingSkeleton lines={1} className="w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Camera className="h-16 w-16 mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {searchQuery ? "Try a different search term" : "Start buying or selling to begin chatting"}
            </p>
          </div>
        ) : (
          chats.map((chat, index) => {
            const otherUserId = chat.isCurrentUserBuyer ? chat.sellerId : chat.buyerId;
            const isTypingActive = typingUsers[otherUserId] || false;
            
            return (
              <div
                key={chat.id}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-800/30 active:bg-gray-700/40 transition-colors border-b border-gray-800/50 last:border-b-0 animate-chat-list-item stagger-${(index % 10) + 1} ${
                  tappedChatId === chat.id ? 'animate-tap-highlight' : ''
                }`}
                onClick={() => handleChatClick(chat.id)}
                data-testid={`chat-item-${chat.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative z-0 flex-shrink-0">
                    {userHasActiveStatus(otherUserId) ? (
                      <div className={`relative p-[3px] rounded-full bg-gradient-to-r from-green-400 to-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse ${isTypingActive ? 'animate-avatar-shake' : ''}`}>
                        <div className="rounded-full bg-nxe-dark p-[2px]">
                          <Avatar className="w-[38px] h-[38px]">
                            <AvatarImage src={chat.otherUser?.profilePicture} alt={getDisplayName(chat)} />
                            <AvatarFallback className="bg-nxe-surface text-white">
                              {getAvatarFallback(chat)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    ) : (
                      <Avatar className={`w-[38px] h-[38px] ${isTypingActive ? 'animate-avatar-shake' : ''}`}>
                        <AvatarImage src={chat.otherUser?.profilePicture} alt={getDisplayName(chat)} />
                        <AvatarFallback className="bg-nxe-surface text-white">
                          {getAvatarFallback(chat)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {peerOnlineStatus[otherUserId] && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-nxe-dark shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-white text-sm font-medium truncate">{getDisplayName(chat)}</p>
                          {chat.productTitle && (
                            <span className="text-[11px] text-blue-400 truncate flex-shrink-0 max-w-[100px]">
                              {chat.productTitle.split(' ').slice(0, 2).join(' ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">
                        {chat.lastMessageTime ? formatTimeAgo(chat.lastMessageTime) : formatTimeAgo(chat.createdAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-gray-400 text-xs truncate flex-1">
                        {isTypingActive ? (
                          <span className="text-green-400 italic">sedang mengetik...</span>
                        ) : (
                          chat.lastMessage || "Tap to start chatting"
                        )}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge 
                          className="bg-nxe-primary text-white text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full flex-shrink-0"
                          data-testid={`unread-badge-${chat.id}`}
                        >
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
