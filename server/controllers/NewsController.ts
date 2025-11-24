import { Request, Response } from "express";
import { MediaRepository } from "../repositories/MediaRepository";
import { insertNewsSchema } from "@shared/schema";
import { logError, logInfo } from "../utils/logger";
import { handleError, ErrorHandlers } from "../utils/error-handler";

const mediaRepository = new MediaRepository();

export const newsController = {
  // Get all news (admin only - includes unpublished)
  async getAllNews(req: Request, res: Response) {
    try {
      const news = await mediaRepository.getAllNews();
      res.json(news);
    } catch (error) {
      handleError(res, error, 'fetch all news');
    }
  },

  // Get daily news (published only)
  async getDailyNews(req: Request, res: Response) {
    try {
      const news = await mediaRepository.getPublishedNews();
      res.json(news);
    } catch (error) {
      handleError(res, error, 'fetch daily news');
    }
  },

  // Get news by ID
  async getNewsById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ErrorHandlers.badRequest(res, "Invalid news ID");
      }

      const newsItem = await mediaRepository.getNewsById(id);
      if (!newsItem) {
        return ErrorHandlers.notFound(res, "news");
      }

      res.json(newsItem);
    } catch (error) {
      handleError(res, error, 'fetch news by ID');
    }
  },

  // Create news (admin only)
  async createNews(req: Request, res: Response) {
    try {
      const validation = insertNewsSchema.safeParse(req.body);
      if (!validation.success) {
        return handleError(res, validation.error, 'create news');
      }

      const newsItem = await mediaRepository.createNews(validation.data);
      logInfo("News created", { newsId: newsItem.id, userId: req.userId });
      
      res.status(201).json(newsItem);
    } catch (error) {
      handleError(res, error, 'create news');
    }
  },

  // Update news (admin only)
  async updateNews(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ErrorHandlers.badRequest(res, "Invalid news ID");
      }

      const validation = insertNewsSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return handleError(res, validation.error, 'update news');
      }

      const newsItem = await mediaRepository.updateNews(id, validation.data);
      if (!newsItem) {
        return ErrorHandlers.notFound(res, "news");
      }

      logInfo("News updated", { newsId: id, userId: req.userId });
      res.json(newsItem);
    } catch (error) {
      handleError(res, error, 'update news');
    }
  },

  // Delete news (admin only)
  async deleteNews(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ErrorHandlers.badRequest(res, "Invalid news ID");
      }

      const success = await mediaRepository.deleteNews(id);
      if (!success) {
        return ErrorHandlers.notFound(res, "news");
      }

      logInfo("News deleted", { newsId: id, userId: req.userId });
      res.json({ success: true });
    } catch (error) {
      handleError(res, error, 'delete news');
    }
  }
};