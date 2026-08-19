"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import { signInClient } from "@/lib/auth-client";
import { CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          role: role === "doctor" ? "doctor" : "user",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Auto-login then redirect to /app
      const login = await signInClient(email, password);
      if (login.success) {
        router.push("/app");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-mint">
      <Navbar />
      <div className="mx-auto mt-12 w-full max-w-md px-4 pb-16">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{t("signupTitle")}</h1>

          {success ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-teal-light p-4 text-teal-dark">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <p className="text-sm font-medium">{t("signupSuccess")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("name")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              </div>
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("role")}</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["patient", "doctor"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                        role === r
                          ? "border-teal bg-teal-light text-teal-dark"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {r === "patient" ? t("patient") : t("doctor")}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-cta py-3 text-sm font-semibold text-white transition hover:bg-cta-dark disabled:opacity-60"
              >
                {loading ? "…" : t("signupCta")}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-gray-500">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-semibold text-teal hover:underline">
              {t("login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
