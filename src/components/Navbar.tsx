"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useSession, signOutClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      {/* Text-based medAI logo placeholder (user logo goes to /public/logo.png) */}
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal text-white font-bold text-lg shadow-sm">
        m
      </span>
      <span className="text-xl font-bold tracking-tight">
        <span className="text-gray-900">med</span>
        <span className="text-teal">AI</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const session = useSession();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-teal hover:text-teal"
            aria-label="Toggle language"
          >
            <Languages className="h-4 w-4" />
            {lang === "en" ? "عربي" : "EN"}
          </button>

          {session.isAuthenticated ? (
            <>
              <Link
                href="/app"
                className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-dark"
              >
                {t("startChat")}
              </Link>
              <button
                onClick={async () => {
                  await signOutClient();
                  router.push("/");
                  router.refresh();
                }}
                className="rounded-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-cta px-4 py-2 text-sm font-semibold text-white transition hover:bg-cta-dark"
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
