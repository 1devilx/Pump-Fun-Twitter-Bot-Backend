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

// WebSocket connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket client connected');

  ws.on('message', async (message: string) => {
    try {
      const { query, type } = JSON.parse(message.toString());
      console.log('WebSocket request:', { query, type });

      const tweets = await twitterService.searchTweets(query, type);
      ws.send(JSON.stringify({ type: 'tweets', data: tweets }));
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Error processing request' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// REST API endpoint
app.get('/api/tweets', async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query || !type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const tweets = await twitterService.searchTweets(query.toString(), type.toString());
    res.json({ tweets });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
