import type { EscrowTransaction } from "@shared/schema";

/**
 * Chat list item with user and product information
 */
export interface ChatListItem {
  id: number;
  productId?: number;
  buyerId: number;
  sellerId: number;
  status: string;
  createdAt: string;
  // Product info
  productTitle?: string;
  productThumbnail?: string;
  productPrice?: string;
  productCategory?: string;
  // Other participant info
  otherUser?: {
    username: string;
    displayName?: string;
    profilePicture?: string;
    isVerified: boolean;
  };
  isCurrentUserBuyer: boolean;
  // Message info
  lastMessage?: string;
  lastMessageType?: string;
  lastMessageTime?: string;
  lastMessageSenderId?: number;
  unreadCount: number;
  // Escrow transaction info
  escrowTransaction?: EscrowTransaction | null;
}

/**
 * Detailed chat information with full buyer/seller data
 */
export interface ChatDetails {
  id: number;
  productId?: number;
  buyerId: number;
  sellerId: number;
  status: string;
  createdAt: string;
  // Product info
  productTitle?: string;
  productThumbnail?: string;
  productPrice?: string;
  productCategory?: string;
  // Buyer info
  buyerUsername?: string;
  buyerDisplayName?: string;
  buyerProfilePicture?: string;
  buyerIsVerified?: boolean;
  // Seller info
  sellerUsername?: string;
  sellerDisplayName?: string;
  sellerProfilePicture?: string;
  sellerIsVerified?: boolean;
  // Message info
  lastMessage?: string;
  lastMessageType?: string;
  lastMessageTime?: string;
  lastMessageSenderId?: number;
  unreadCount: number;
  // Escrow transaction info
  escrowTransaction?: EscrowTransaction | null;
}
