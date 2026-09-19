import { useState } from "react";
import { signup, login } from "../api/client";

interface Props {
  onAuth: (email: string) => void;
  onClose: () => void;
}

export default function AuthModal({ onAuth, onClose }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fn = isSignUp ? signup : login;
      const data = await fn(email, password);
      localStorage.setItem("token", data.access_token);
      onAuth(email);
    } catch {
      setError(isSignUp ? "Sign up failed. Email may already exist." : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-surface-light p-8 shadow-2xl shadow-brand-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <h2 className="mb-1 text-2xl font-bold text-white">{isSignUp ? "Create Account" : "Welcome Back"}</h2>
        <p className="mb-6 text-sm text-slate-400">
          {isSignUp ? "Join ShrinkLink to manage your links." : "Sign in to your ShrinkLink dashboard."}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-surface px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition-all hover:bg-brand-500 hover:shadow-lg hover:shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Please wait…" : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
            className="font-medium text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
