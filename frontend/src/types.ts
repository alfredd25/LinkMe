// ── Auth ────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  user_id: string;
  email: string;
}

// ── URLs ────────────────────────────────────────────────────────────

export interface ShortenedUrl {
  short_code: string;
  short_url: string;
}

export interface UrlRow {
  id: string;
  short_code: string;
  long_url: string;
  created_at: string;
  total_clicks: number;
}

// ── Analytics ───────────────────────────────────────────────────────

export interface ClickAnalytics {
  short_code: string;
  long_url: string;
  total_clicks: number;
  device_breakdown: Record<string, number>;
  referrer_counts: Record<string, number>;
}

export interface ClickTimePoint {
  date: string;
  clicks: number;
}
