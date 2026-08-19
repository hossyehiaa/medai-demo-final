"use client";

// Landing page — doctronic-inspired aesthetic (soft mint, teal, rounded cards)
// with medAI branding and content.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/lib/i18n";
import {
  ShieldCheck,
  Quote,
  FileText,
  AlertTriangle,
  HeartHandshake,
  MessageCircle,
  Search,
  BadgeCheck,
  Sparkles,
  Github,
} from "lucide-react";

export default function LandingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleGuest() {
    setGuestLoading(true);
    try {
      const res = await fetch("/api/guest", { method: "POST" });
      const { email, password } = await res.json();
      const { signInClient } = await import("@/lib/auth-client");
      const result = await signInClient(email, password);
      if (result.success) {
        router.push("/app");
        return;
      }
    } catch {
      // fall through
    }
    setGuestLoading(false);
    router.push("/login");
  }

  const features = [
    { icon: ShieldCheck, title: t("f1Title"), desc: t("f1Desc") },
    { icon: Quote, title: t("f2Title"), desc: t("f2Desc") },
    { icon: FileText, title: t("f3Title"), desc: t("f3Desc") },
    { icon: AlertTriangle, title: t("f4Title"), desc: t("f4Desc") },
    { icon: HeartHandshake, title: t("f5Title"), desc: t("f5Desc") },
  ];

  const steps = [
    { icon: MessageCircle, title: t("how1Title"), desc: t("how1Desc") },
    { icon: Search, title: t("how2Title"), desc: t("how2Desc") },
    { icon: BadgeCheck, title: t("how3Title"), desc: t("how3Desc") },
    { icon: Sparkles, title: t("how4Title"), desc: t("how4Desc") },
  ];

  const chips = [t("chipEvidence"), t("chipCrisis"), t("chipViewer"), t("chipLang")];

  return (
    <div className="min-h-screen bg-mint">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:pt-24">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-light px-4 py-1.5 text-sm font-medium text-teal-dark">
          <Sparkles className="h-4 w-4" />
          {t("tagline")}
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-teal-dark">
          {t("heroSubtitle")}
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600">{t("heroDesc")}</p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/app"
            className="w-full rounded-full bg-cta px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-cta/25 transition hover:bg-cta-dark sm:w-auto"
          >
            {t("startChat")}
          </Link>
          <button
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full rounded-full border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition hover:border-teal hover:text-teal disabled:opacity-60 sm:w-auto"
          >
            {guestLoading ? "…" : t("tryGuest")}
          </button>
        </div>

        {/* Trust chips */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600"
            >
              ✓ {chip}
            </span>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-bold text-gray-900">{t("featuresTitle")}</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light text-teal">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-bold text-gray-900">{t("howTitle")}</h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal text-white">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="mb-1 text-xs font-bold uppercase tracking-wider text-teal">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/signup"
            className="inline-block rounded-full bg-teal px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal/25 transition hover:bg-teal-dark"
          >
            {t("signup")} →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center">
          <p className="mx-auto max-w-2xl text-sm text-gray-500">{t("footerDisclaimer")}</p>
          <p className="mt-3 text-sm font-semibold text-red-500">⚠️ {t("footer988")}</p>
          <div className="mt-5 flex items-center justify-center gap-4 text-sm text-gray-400">
            <span>🇪🇬 {t("madeIn")}</span>
            <a
              href="https://github.com/hossyehiaa/MEDAI"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-gray-600"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-300">
            med<span className="text-teal">AI</span> © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
