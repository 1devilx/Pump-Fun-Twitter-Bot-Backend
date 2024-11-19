import { RawTweet, TwitterSearchResponse, SearchConfig, Tweet, TweetEntity, TwitterUser, TwitterSearchState } from './types';

export type { SearchConfig };
export class TwitterService {
  private apiKey: string;
  private searchStates: Map<string, TwitterSearchState>;
  private searchConfigs: SearchConfig[];

  constructor() {
    this.apiKey = process.env.SOCIALDATA_API_KEY || '';
    if (!this.apiKey) {
      console.error('SOCIALDATA_API_KEY is not set in environment variables');
    }
    this.searchStates = new Map();
    this.searchConfigs = [
      { 
        query: 'pump.fun/coin/', 
        type: 'pumpfun',
        urlPattern: 'pump.fun/coin/'
      },
      { 
        query: 'dexscreener.com/solana/', 
        type: 'dexscreener',
        urlPattern: 'dexscreener.com/solana/'
      }
    ];

    // Initialize search states
    this.searchConfigs.forEach(config => {
      this.searchStates.set(config.type, {
        lastTweetId: null,
        isFirstRequest: true
      });
    });
  }

  private getSearchState(type: string): TwitterSearchState {
    if (!this.searchStates.has(type)) {
      this.searchStates.set(type, {
        lastTweetId: null,
        isFirstRequest: true
      });
    }
    return this.searchStates.get(type)!;
  }

  private updateSearchState(type: string, tweets: RawTweet[]) {
    if (tweets.length > 0) {
      const state = this.getSearchState(type);
      // Twitter returns tweets in descending order, so first tweet has highest ID
      state.lastTweetId = tweets[0].id_str;
      state.isFirstRequest = false;
    }
  }

  private transformTweet(rawTweet: RawTweet): Tweet {
    return {
      id: rawTweet.id_str,
      text: rawTweet.full_text,
      created_at: rawTweet.tweet_created_at,
      user: {
        name: rawTweet.user.name,
        screen_name: rawTweet.user.screen_name,
        profile_image_url: rawTweet.user.profile_image_url_https,
        verified: rawTweet.user.verified,
        followers_count: rawTweet.user.followers_count
      },
      entities: {
        urls: rawTweet.entities.urls
      },
      retweet_count: rawTweet.retweet_count || 0,
      favorite_count: rawTweet.favorite_count || 0,
      views_count: rawTweet.views_count,
      bookmark_count: rawTweet.bookmark_count
    };
  }

  async searchTweets(query: string, type: string): Promise<RawTweet[]> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured');
      }

      const state = this.getSearchState(type);
      let searchQuery = query;

      // Add since_id parameter to only get new tweets
      if (!state.isFirstRequest && state.lastTweetId) {
        searchQuery = `${query} since_id:${state.lastTweetId}`;
      }

      // Always exclude retweets to avoid duplicates
      searchQuery = searchQuery.includes('-filter:retweets') ? searchQuery : `${searchQuery} -filter:retweets`;
      
      const encodedQuery = encodeURIComponent(searchQuery);
      const searchType = 'Latest';
      const baseUrl = 'https://api.socialdata.tools/twitter/search';
      const url = `${baseUrl}?query=${encodedQuery}&type=${searchType}`;

      console.log('Making Twitter API request:', {
        type,
        searchQuery,
        url,
        lastTweetId: state.lastTweetId
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Twitter API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Twitter API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Type guard to verify the response matches TwitterSearchResponse
      if (!data || typeof data !== 'object') {
        console.error('Invalid API response format:', data);
        throw new Error('Invalid API response format');
      }

      const responseData = data as { tweets?: unknown[] };
      
      if (!responseData.tweets || !Array.isArray(responseData.tweets)) {
        console.error('Invalid API response format: missing tweets array');
        throw new Error('Invalid API response format: missing tweets array');
      }

      // Verify each tweet has the required properties
      const validTweets = responseData.tweets.filter((tweet: unknown): tweet is RawTweet => {
        if (!tweet || typeof tweet !== 'object') return false;
        
        const tweetObj = tweet as Record<string, unknown>;
        return typeof tweetObj.id === 'number' &&
               typeof tweetObj.id_str === 'string' &&
               typeof tweetObj.full_text === 'string' &&
               typeof tweetObj.tweet_created_at === 'string';
      });

      // Update the last tweet ID for this query type
      this.updateSearchState(type, validTweets);

      return validTweets;
    } catch (error) {
      console.error('Error searching tweets:', error);
      throw error;
    }
  }
}
