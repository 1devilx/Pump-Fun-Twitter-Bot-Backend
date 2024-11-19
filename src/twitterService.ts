export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  user: {
    name: string;
    screen_name: string;
    profile_image_url: string;
  };
}

interface TweetEntity {
  urls: Array<{
    display_url: string;
    expanded_url: string;
    indices: number[];
    url: string;
  }>;
  hashtags: any[];
  symbols: any[];
  timestamps: any[];
  user_mentions: any[];
}

interface TwitterUser {
  id: number;
  id_str: string;
  name: string;
  screen_name: string;
  location: string | null;
  url: string | null;
  description: string;
  protected: boolean;
  verified: boolean;
  followers_count: number;
  friends_count: number;
  listed_count: number;
  favourites_count: number;
  statuses_count: number;
  created_at: string;
  profile_banner_url: string | null;
  profile_image_url_https: string;
  can_dm: boolean;
}

interface RawTweet {
  tweet_created_at: string;
  id: number;
  id_str: string;
  text: string | null;
  full_text: string;
  source: string;
  truncated: boolean;
  in_reply_to_status_id: number | null;
  in_reply_to_status_id_str: string | null;
  in_reply_to_user_id: number | null;
  in_reply_to_user_id_str: string | null;
  in_reply_to_screen_name: string | null;
  user: TwitterUser;
  quoted_status_id: number | null;
  quoted_status_id_str: string | null;
  is_quote_status: boolean;
  quoted_status: any | null;
  retweeted_status: any | null;
  quote_count: number;
  reply_count: number;
  retweet_count: number;
  favorite_count: number;
  views_count: number | null;
  bookmark_count: number;
  lang: string;
  entities: TweetEntity;
  is_pinned: boolean;
}

interface TwitterSearchResponse {
  tweets: RawTweet[];
  next_cursor: string;
}

export interface SearchConfig {
  query: string;
  type: 'pumpfun' | 'dexscreener';
  urlPattern: string;
}

interface TwitterSearchState {
  lastTweetId: string | null;
  isFirstRequest: boolean;
}

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

  async searchTweets(query: string, type: string): Promise<RawTweet[]> {
    try {
      if (!this.apiKey) {
        throw new Error('API key not configured');
      }

      const searchQuery = query.includes('-filter:retweets') ? query : `${query} -filter:retweets`;
      const encodedQuery = encodeURIComponent(searchQuery);
      const searchType = 'Latest';
      const baseUrl = 'https://api.socialdata.tools/twitter/search';
      const url = `${baseUrl}?query=${encodedQuery}&type=${searchType}`;

      console.log('Making Twitter API request:', {
        type,
        searchQuery,
        url
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
      return data.tweets || [];
    } catch (error) {
      console.error('Error searching tweets:', error);
      throw error;
    }
  }
}
