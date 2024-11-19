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

export interface TweetEntity {
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

export interface TwitterUser {
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

export interface RawTweet {
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

export interface TwitterSearchResponse {
    tweets: RawTweet[];
    next_cursor?: string;
}

export interface SearchConfig {
    query: string;
    type: 'pumpfun' | 'dexscreener';
    urlPattern: string;
}

export interface TwitterSearchState {
    lastTweetId: string | null;
    isFirstRequest: boolean;
}
