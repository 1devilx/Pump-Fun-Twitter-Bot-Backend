import express from 'express';
import { TwitterService } from './twitterService';

const router = express.Router();
const twitterService = new TwitterService();

router.get('/tweets', async (req, res) => {
  try {
    const type = req.query.type as string;
    
    if (!type) {
      return res.status(400).json({ error: 'Missing type parameter' });
    }

    if (type !== 'pumpfun' && type !== 'dexscreener') {
      return res.status(400).json({ error: 'Invalid type parameter' });
    }

    const searchQuery = type === 'pumpfun' ? 'pump.fun/coin/' : 'dexscreener.com/solana/';
    const tweets = await twitterService.searchTweets(searchQuery, type);
    
    res.json({ tweets });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

export default router;