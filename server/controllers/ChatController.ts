import { Router, Request, Response } from "express";
import { ChatService } from "../services/ChatService";
import { requireAuth } from "../middleware/auth";
import { validate, sanitizeInput, preventDuplicateMessages, validateFileUpload } from "../middleware/validation";
import { upload } from "../utils/file-upload";
import { handleError, ErrorHandlers } from "../utils/error-handler";
import { chatIdParamSchema, messageIdParamSchema, messageCreateSchema, fileUploadSchema, chatFilterQuerySchema, insertChatSchema, messageSearchSchema } from "@shared/schema";
import { ChatRepository } from "../repositories/ChatRepository";
import { SystemRepository } from "../repositories/SystemRepository";
import fs from "fs";
import path from "path";
import { logError, logWarning, logInfo, logDebug } from "../utils/logger";

const chatRepository = new ChatRepository();
const systemRepository = new SystemRepository();

export const chatController = Router();

// Get all user chats
chatController.get('/', 
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const chats = await ChatService.getUserChats(req.userId!);
      res.json(chats);
    } catch (error: any) {
      handleError(res, error, 'Get user chats');
    }
  }
);

// Get unread chats count
chatController.get('/unread', requireAuth, async (req: Request, res: Response) => {
  try {
    const unreadCount = await ChatService.getUnreadChatsCount(req.userId!);
    res.json(unreadCount);
  } catch (error: any) {
    handleError(res, error, 'Get unread chats count');
  }
});

// Create new chat
chatController.post('/', 
  requireAuth,
  sanitizeInput(),
  validate({ body: insertChatSchema }),
  async (req: Request, res: Response) => {
    try {
      const chatData = req.validatedData!.body;
      const newChat = await ChatService.createChat(chatData, req.userId!, req);
      res.status(201).json({
        message: 'Chat created successfully',
        chat: newChat
      });
    } catch (error: any) {
      handleError(res, error, 'Create chat');
    }
  }
);

// Get chat by ID
chatController.get('/:id', 
  requireAuth,
  validate({ params: chatIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { id: chatId } = req.validatedData!.params;
      const chat = await ChatService.getChatById(chatId, req.userId!);
      res.json(chat);
    } catch (error: any) {
      handleError(res, error, 'Get chat');
    }
  }
);

// Get chat messages
chatController.get('/:id/messages', 
  requireAuth,
  validate({ params: chatIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { id: chatId } = req.validatedData!.params;
      const before = req.query.before ? parseInt(req.query.before as string) : undefined;
      
      // FIX BUG #9: Add mandatory default limit with proper NaN handling and maximum cap
      const parsedLimit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      // Handle NaN, negative, and invalid values - default to 50
      const requestedLimit = (!parsedLimit || parsedLimit < 1 || isNaN(parsedLimit)) ? 50 : parsedLimit;
      const limit = Math.min(requestedLimit, 100); // Cap at 100 messages per request
      
      const messages = await ChatService.getChatMessages(chatId, req.userId!, { before, limit });
      res.json(messages);
    } catch (error: any) {
      handleError(res, error, 'Get chat messages');
    }
  }
);

// Search messages across all user's chats
chatController.get('/search/messages',
  requireAuth,
  validate({ query: messageSearchSchema }),
  async (req: Request, res: Response) => {
    try {
      const searchParams = req.validatedData!.query;
      const results = await chatRepository.searchMessages({
        ...searchParams,
        userId: req.userId!
      });
      res.json(results);
    } catch (error: any) {
      handleError(res, error, 'Search messages');
    }
  }
);

// Send message with deduplication
chatController.post('/:id/messages', 
  requireAuth,
  sanitizeInput(),
  validate({ params: chatIdParamSchema, body: messageCreateSchema }),
  preventDuplicateMessages(),
  async (req: Request, res: Response) => {
    try {
      const { id: chatId } = req.validatedData!.params;
      const messageData = req.validatedData!.body;
      
      const newMessage = await ChatService.sendMessage(messageData, chatId, req.userId!, req);
      res.status(201).json({
        message: 'Message sent successfully',
        data: newMessage
      });
    } catch (error: any) {
      handleError(res, error, 'Send message');
    }
  }
);

// Upload file to chat with security validation
chatController.post('/:id/upload', 
  requireAuth,
  upload.single('file'),
  validate({ params: chatIdParamSchema, body: fileUploadSchema }),
  validateFileUpload({ required: true, maxSize: 10 * 1024 * 1024 }), // 10MB limit
  async (req: Request, res: Response) => {
    try {
      const { id: chatId } = req.validatedData!.params;
      const { content } = req.validatedData!.body;
      
      if (!req.file) {
        return ErrorHandlers.badRequest(res, 'No file uploaded');
      }
      
      // Verify user has access to this chat
      const chat = await ChatService.getChatById(chatId, req.userId!);
      
      // Create the file URL
      const fileUrl = `/uploads/chat-files/${req.file.filename}`;
      
      // Create record in uploadedFiles table for tracking
      await systemRepository.createUploadedFile({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedBy: req.userId!,
        url: fileUrl,
        category: 'chat'
      });
      
      // Create message with file
      const messageData = {
        content: content || 'File uploaded',
        messageType: 'file' as const,
        metadata: {
          fileUrl: fileUrl,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype
        }
      };
      
      const newMessage = await ChatService.sendMessage(messageData, chatId, req.userId!, req);
      
      res.status(201).json({
        message: 'File uploaded successfully',
        data: newMessage,
        fileUrl: fileUrl
      });
    } catch (error: any) {
      // Clean up uploaded file if there was an error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          logWarning('Failed to clean up uploaded file after error', { error: cleanupError, operation: 'chat_file_upload_cleanup', userId: req.userId });
        }
      }
      
      handleError(res, error, 'Upload file to chat');
    }
  }
);

// Mark message as delivered
chatController.post('/messages/:messageId/delivered', 
  requireAuth,
  validate({ params: messageIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.validatedData!.params;
      const result = await ChatService.markMessageAsDelivered(messageId, req.userId!, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, 'Mark message as delivered');
    }
  }
);

// Mark message as read
chatController.post('/messages/:messageId/read', 
  requireAuth,
  validate({ params: messageIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.validatedData!.params;
      const result = await ChatService.markMessageAsRead(messageId, req.userId!, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, 'Mark message as read');
    }
  }
);

// Add reaction to message
chatController.post('/messages/:messageId/reactions', 
  requireAuth,
  validate({ params: messageIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.validatedData!.params;
      const { emoji } = req.body;
      
      // FIX BUG #13: Validate emoji input to prevent XSS
      if (!emoji || typeof emoji !== 'string') {
        return res.status(400).json({ error: 'Emoji is required and must be a string' });
      }
      
      // Validate emoji: must be 1-10 characters and only contain valid emoji/unicode characters
      const emojiRegex = /^[\p{Emoji}\u{200D}\u{FE0F}\u{20E3}]+$/u;
      if (emoji.length > 10 || !emojiRegex.test(emoji)) {
        return res.status(400).json({ error: 'Invalid emoji format. Must be a valid emoji (max 10 characters)' });
      }
      
      const reaction = await ChatService.addReaction(messageId, req.userId!, emoji, req);
      res.status(201).json({
        message: 'Reaction added successfully',
        data: reaction
      });
    } catch (error: any) {
      handleError(res, error, 'Add reaction');
    }
  }
);

// Remove reaction from message
chatController.delete('/messages/:messageId/reactions', 
  requireAuth,
  validate({ params: messageIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.validatedData!.params;
      const result = await ChatService.removeReaction(messageId, req.userId!, req);
      res.json(result);
    } catch (error: any) {
      handleError(res, error, 'Remove reaction');
    }
  }
);

// Get message reactions
chatController.get('/messages/:messageId/reactions', 
  requireAuth,
  validate({ params: messageIdParamSchema }),
  async (req: Request, res: Response) => {
    try {
      const { messageId } = req.validatedData!.params;
      const reactions = await ChatService.getMessageReactions(messageId, req.userId!);
      res.json(reactions);
    } catch (error: any) {
      handleError(res, error, 'Get message reactions');
    }
  }
);