"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { signInClient } from "@/lib/auth-client";
import { Info } from "lucide-react";

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signInClient(email, password);
    if (result.success) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError(result.error || "Invalid credentials");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-12 w-full max-w-md px-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">{t("loginTitle")}</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-cta py-3 text-sm font-semibold text-white transition hover:bg-cta-dark disabled:opacity-60"
          >
            {loading ? "…" : t("loginCta")}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-semibold text-teal hover:underline">
            {t("signup")}
          </Link>
        </p>
      </div>

      {/* Demo credentials hint card for judges */}
      <div className="mt-4 rounded-2xl border border-teal/20 bg-teal-light p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-teal-dark">
          <Info className="h-4 w-4" /> {t("demoCreds")}
        </div>
        <ul className="mt-2 space-y-1 font-mono text-xs text-gray-700" dir="ltr">
          <li>admin@medai.ai / medAI2026 (admin)</li>
          <li>doctor@medai.ai / medAI2026 (doctor/admin)</li>
          <li>patient@medai.ai / medAI2026 (patient)</li>
        </ul>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-mint">
      <Navbar />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
