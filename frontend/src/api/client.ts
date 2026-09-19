import axios from "axios";
import type { AuthTokens, ShortenedUrl, ClickAnalytics } from "../types";

const api = axios.create({ baseURL: "/" });

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ────────────────────────────────────────────────────────────

export async function signup(email: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>("/api/auth/signup", { email, password });
  return data;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>("/api/auth/login", { email, password });
  return data;
}

// ── URLs ────────────────────────────────────────────────────────────

export async function shortenUrl(url: string): Promise<ShortenedUrl> {
  const { data } = await api.post<ShortenedUrl>("/api/urls/shorten", { url });
  return data;
}

// ── Analytics ───────────────────────────────────────────────────────

export async function getAnalytics(shortCode: string): Promise<ClickAnalytics> {
  const { data } = await api.get<ClickAnalytics>(`/api/analytics/analytics/${shortCode}`);
  return data;
}
