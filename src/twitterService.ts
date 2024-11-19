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
        profile_image_url: rawTweet.user.profile_image_url_https
      }
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

      const data: TwitterSearchResponse = await response.json();
      const tweets = data.tweets || [];

      // Update the last tweet ID for this query type
      this.updateSearchState(type, tweets);

      return tweets;
    } catch (error) {
      console.error('Error searching tweets:', error);
      throw error;
    }
  }
}
