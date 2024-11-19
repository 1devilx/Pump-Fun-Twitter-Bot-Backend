import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { TwitterService, SearchConfig } from './twitterService';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const twitterService = new TwitterService();

// Store connected clients
const clients = new Set<WebSocket>();

// Default queries to fetch
const defaultQueries = [
  { query: 'pump.fun/coin/', type: 'pumpfun' },
  { query: 'dexscreener.com/solana/', type: 'dexscreener' }
];

// Cache for latest tweets
let tweetCache = new Map<string, any>();

// Function to fetch tweets and broadcast to all clients
async function fetchAndBroadcastTweets() {
  try {
    for (const { query, type } of defaultQueries) {
      const tweets = await twitterService.searchTweets(query, type);
      const cacheKey = `${type}:${query}`;
      
      // Check if tweets are different from cache
      const cachedTweets = tweetCache.get(cacheKey);
      const hasNewTweets = !cachedTweets || 
        JSON.stringify(tweets[0]?.id_str) !== JSON.stringify(cachedTweets[0]?.id_str);

      if (hasNewTweets) {
        console.log(`New tweets found for ${type}`);
        tweetCache.set(cacheKey, tweets);
        
        // Broadcast to all connected clients
        const message = JSON.stringify({
          type: 'tweets',
          queryType: type,
          data: tweets
        });

        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error fetching tweets:', error);
  }
}

// Start periodic tweet fetching (every 10 seconds)
setInterval(fetchAndBroadcastTweets, 10000);

// Fetch initial tweets on server start
fetchAndBroadcastTweets();

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket client connected');
  clients.add(ws);

  // Send cached tweets immediately on connection
  tweetCache.forEach((tweets, cacheKey) => {
    const [type] = cacheKey.split(':');
    ws.send(JSON.stringify({
      type: 'tweets',
      queryType: type,
      data: tweets
    }));
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

// REST API endpoint (now serves cached data)
app.get('/api/tweets', async (req, res) => {
  try {
    const { type } = req.query;
    if (!type) {
      return res.status(400).json({ error: 'Missing type parameter' });
    }

    const query = type === 'pumpfun' ? 'pump.fun/coin/' : 'dexscreener.com/solana/';
    const cacheKey = `${type}:${query}`;
    
    // Return cached tweets if available
    if (tweetCache.has(cacheKey)) {
      return res.json({ tweets: tweetCache.get(cacheKey) });
    }

    // If not in cache, fetch new tweets
    const tweets = await twitterService.searchTweets(query, type.toString());
    tweetCache.set(cacheKey, tweets);
    res.json({ tweets });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    connectedClients: clients.size,
    cacheStatus: Array.from(tweetCache.keys())
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
