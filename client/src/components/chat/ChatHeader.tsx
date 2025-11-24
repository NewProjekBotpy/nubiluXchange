import { ArrowLeft, Phone, Video, MoreVertical, Search, Bell, Timer, Lock, Star, UserMinus, Flag, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TypingIndicator } from "@/components/TypingIndicator";
import type { ChatDetails } from "@/types/chat";
import type { ChatSettings } from "@/hooks/chat/useChatSettings";

interface ChatHeaderProps {
  chatDetails: ChatDetails | undefined;
  isTyping: boolean;
  typingUsers: Record<number, boolean>;
  onlineStatus: Record<number, boolean>;
  currentUserId: number | null;
  chatSettings: ChatSettings;
  onBack: () => void;
  onSearch: () => void;
  onViewProfile: () => void;
  onCall: () => void;
  onVideoCall: () => void;
  toggleNotifications: () => void;
  toggleTemporaryMessages: () => void;
  toggleChatLock: () => void;
  toggleFavorite: () => void;
  toggleBlocked: () => void;
  onGoToSettings: () => void;
}

export function ChatHeader({
  chatDetails,
  isTyping,
  typingUsers,
  onlineStatus,
  currentUserId,
  chatSettings,
  onBack,
  onSearch,
  onViewProfile,
  onCall,
  onVideoCall,
  toggleNotifications,
  toggleTemporaryMessages,
  toggleChatLock,
  toggleFavorite,
  toggleBlocked,
  onGoToSettings
}: ChatHeaderProps) {

  // Get other user info
  const getOtherUserInfo = () => {
    if (!chatDetails || !currentUserId) return {
      displayName: 'User',
      profilePicture: '',
      userId: 0,
      isOnline: false
    };

    const isCurrentUserBuyer = currentUserId === chatDetails.buyerId;
    const otherUserId = isCurrentUserBuyer ? chatDetails.sellerId : chatDetails.buyerId;
    
    return {
      displayName: isCurrentUserBuyer
        ? (chatDetails.sellerDisplayName || chatDetails.sellerUsername || 'Seller')
        : (chatDetails.buyerDisplayName || chatDetails.buyerUsername || 'Buyer'),
      profilePicture: isCurrentUserBuyer
        ? chatDetails.sellerProfilePicture
        : chatDetails.buyerProfilePicture,
      userId: otherUserId,
      isOnline: onlineStatus[otherUserId] || false
    };
  };

  const otherUser = getOtherUserInfo();
  const isOtherUserTyping = typingUsers[otherUser.userId] || false;

  return (
    <div className="sticky top-0 z-30 bg-nxe-dark/95 backdrop-blur-md border-b border-nxe-surface pt-[env(safe-area-inset-top)]">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left Section: Back Button & User Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 hover:bg-transparent hover:scale-105 flex-shrink-0"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex items-center space-x-3 min-w-0 flex-1 hover:bg-gray-800/30 rounded-lg p-2 transition-colors cursor-pointer"
                data-testid="button-profile"
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={otherUser.profilePicture || undefined} alt={otherUser.displayName} />
                    <AvatarFallback className="bg-nxe-surface text-white">
                      {otherUser.displayName[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {otherUser.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-nxe-dark" />
                  )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className="text-white font-medium text-sm truncate">
                    {otherUser.displayName}
                  </p>
                  <div className="text-xs text-gray-400">
                    {isOtherUserTyping ? (
                      <span className="text-green-400">sedang mengetik...</span>
                    ) : otherUser.isOnline ? (
                      <span className="text-green-400">online</span>
                    ) : (
                      <span>terakhir dilihat baru saja</span>
                    )}
                  </div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-nxe-surface border-gray-600">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={otherUser.profilePicture || undefined} alt={otherUser.displayName} />
                    <AvatarFallback className="bg-nxe-dark text-white text-xl">
                      {otherUser.displayName[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium">{otherUser.displayName}</p>
                    <p className="text-sm text-gray-400">
                      {otherUser.isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={onViewProfile}
                  variant="outline"
                  className="w-full"
                  data-testid="button-view-profile"
                >
                  Lihat Profil
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onVideoCall}
            className="p-2 hover:bg-transparent hover:scale-105"
            data-testid="button-video"
          >
            <Video className="h-5 w-5 text-gray-300 hover:text-white transition-colors" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onCall}
            className="p-2 hover:bg-transparent hover:scale-105"
            data-testid="button-call"
          >
            <Phone className="h-5 w-5 text-gray-300 hover:text-white transition-colors" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSearch}
            className="p-2 hover:bg-transparent hover:scale-105"
            data-testid="button-search"
          >
            <Search className="h-5 w-5 text-gray-300 hover:text-white transition-colors" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-transparent hover:scale-105"
                data-testid="button-options"
              >
                <MoreVertical className="h-5 w-5 text-gray-300 hover:text-white transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-nxe-surface border-gray-600">
              <DropdownMenuItem onClick={onViewProfile} className="cursor-pointer hover:bg-gray-700">
                <span className="text-white">Info kontak</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleNotifications} className="cursor-pointer hover:bg-gray-700">
                <Bell className="mr-2 h-4 w-4" />
                <span className="text-white">
                  {chatSettings.notifications ? 'Matikan notifikasi' : 'Nyalakan notifikasi'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTemporaryMessages} className="cursor-pointer hover:bg-gray-700">
                <Timer className="mr-2 h-4 w-4" />
                <span className="text-white">
                  {chatSettings.temporaryMessages ? 'Matikan pesan sementara' : 'Pesan sementara'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleChatLock} className="cursor-pointer hover:bg-gray-700">
                <Lock className="mr-2 h-4 w-4" />
                <span className="text-white">
                  {chatSettings.chatLock ? 'Buka kunci chat' : 'Kunci chat'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-600" />
              <DropdownMenuItem onClick={toggleFavorite} className="cursor-pointer hover:bg-gray-700">
                <Star className={`mr-2 h-4 w-4 ${chatSettings.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                <span className="text-white">
                  {chatSettings.isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleBlocked} className="cursor-pointer hover:bg-gray-700 text-red-400">
                <UserMinus className="mr-2 h-4 w-4" />
                <span>{chatSettings.isBlocked ? 'Buka blokir' : 'Blokir'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 text-red-400">
                <Flag className="mr-2 h-4 w-4" />
                <span>Laporkan</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-600" />
              <DropdownMenuItem className="cursor-pointer hover:bg-gray-700 text-red-400">
                <span>Hapus chat</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
