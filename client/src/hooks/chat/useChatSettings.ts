import { useState, useCallback } from "react";

export interface ChatSettings {
  notifications: boolean;
  mediaVisibility: boolean;
  encryption: boolean;
  temporaryMessages: boolean;
  chatLock: boolean;
  isFavorite: boolean;
  isBlocked: boolean;
}

export interface UseChatSettingsReturn {
  chatSettings: ChatSettings;
  attachmentSheetOpen: boolean;
  stickerPickerOpen: boolean;
  searchDrawerOpen: boolean;
  setAttachmentSheetOpen: (open: boolean) => void;
  setStickerPickerOpen: (open: boolean) => void;
  setSearchDrawerOpen: (open: boolean) => void;
  toggleNotifications: () => void;
  toggleTemporaryMessages: () => void;
  toggleChatLock: () => void;
  toggleFavorite: () => void;
  toggleBlocked: () => void;
}

export function useChatSettings(): UseChatSettingsReturn {
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    notifications: true,
    mediaVisibility: true,
    encryption: true,
    temporaryMessages: false,
    chatLock: false,
    isFavorite: false,
    isBlocked: false
  });
  
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  
  // Memoized handlers to prevent infinite loop in DropdownMenu
  const toggleNotifications = useCallback(() => {
    setChatSettings(prev => ({ ...prev, notifications: !prev.notifications }));
  }, []);
  
  const toggleTemporaryMessages = useCallback(() => {
    setChatSettings(prev => ({ ...prev, temporaryMessages: !prev.temporaryMessages }));
  }, []);
  
  const toggleChatLock = useCallback(() => {
    setChatSettings(prev => ({ ...prev, chatLock: !prev.chatLock }));
  }, []);
  
  const toggleFavorite = useCallback(() => {
    setChatSettings(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
  }, []);
  
  const toggleBlocked = useCallback(() => {
    setChatSettings(prev => ({ ...prev, isBlocked: !prev.isBlocked }));
  }, []);

  return {
    chatSettings,
    attachmentSheetOpen,
    stickerPickerOpen,
    searchDrawerOpen,
    setAttachmentSheetOpen,
    setStickerPickerOpen,
    setSearchDrawerOpen,
    toggleNotifications,
    toggleTemporaryMessages,
    toggleChatLock,
    toggleFavorite,
    toggleBlocked
  };
}
