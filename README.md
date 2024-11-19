# Twitter API Proxy Service

This service acts as a proxy for Twitter API calls, providing both WebSocket and REST API endpoints for tweet fetching. It's designed to be deployed on Railway.app to centralize API calls and reduce costs.

## Features

- WebSocket support for real-time tweet updates
- REST API endpoint for traditional HTTP requests
- Environment variable configuration
- Railway.app deployment ready

## Environment Variables

Create a `.env` file with the following variables:

```env
SOCIALDATA_API_KEY=your_api_key_here
PORT=3000 # Optional, defaults to 3000
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

## API Endpoints

### REST API

- `GET /api/tweets?query=your_query&type=your_type`
- `GET /health` - Health check endpoint

### WebSocket

Connect to `ws://your-domain/` and send messages in the format:
```json
{
  "query": "your_query",
  "type": "your_type"
}
```

## Railway Deployment

1. Push your code to GitHub
2. Create a new project on Railway.app
3. Connect your GitHub repository
4. Add environment variables in Railway dashboard
5. Deploy!
