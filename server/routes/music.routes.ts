import { Router, Request, Response } from 'express';
import { logError } from '../utils/logger';

const router = Router();

// Music API - Deezer proxy for music search
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Proxy request to Deezer API
    const deezerUrl = `https://api.deezer.com/search/track?q=${encodeURIComponent(query)}&limit=20`;
    const response = await fetch(deezerUrl);
    
    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    logError(error as Error, 'Music search error:');
    res.status(500).json({ error: 'Failed to search music' });
  }
});

export default router;
