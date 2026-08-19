"use client";

// Lightweight i18n — EN/AR dictionaries with RTL support.
// Branding rule enforced: name is always "medAI"; approved Arabic copy only.
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Lang = "en" | "ar";

const dict = {
  en: {
    // Nav
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",
    startChat: "Start chat",
    tryGuest: "Try as guest",
    // Hero
    heroTitle: "medAI — Smart Mental Health Assistant",
    heroSubtitle: "AI-powered mental health decision support — based on USPSTF guidelines.",
    tagline: "Grounded. Verified. Evidence-backed.",
    heroDesc:
      "Ask about depression and suicide-risk screening. Every answer is grounded in USPSTF evidence with verbatim citations you can open at the exact page.",
    // Trust chips
    chipEvidence: "Evidence-backed",
    chipCrisis: "6-Language Crisis Detection",
    chipViewer: "PDF Source Viewer",
    chipLang: "EN/AR",
    // Features
    featuresTitle: "Why medAI?",
    f1Title: "Grounded Answers",
    f1Desc: "Every response comes strictly from USPSTF guideline documents — no fabrication.",
    f2Title: "Verbatim Citations",
    f2Desc: "Exact quotes with document names, so you can verify every claim.",
    f3Title: "Source Viewer",
    f3Desc: "Click any citation to open the original PDF at the exact cited page.",
    f4Title: "Safety Gates",
    f4Desc: "Crisis detection in 6 languages routes to 988 instantly — zero AI involvement.",
    f5Title: "Wellness Notes",
    f5Desc: "Supportive coping resources appended to every answer — clearly non-medical.",
    // How it works
    howTitle: "How it works",
    how1Title: "Ask",
    how1Desc: "Type your screening question in English or Arabic.",
    how2Title: "Retrieve",
    how2Desc: "Hybrid search finds the most relevant guideline passages.",
    how3Title: "Verify",
    how3Desc: "Citations are checked verbatim against source documents.",
    how4Title: "Answer",
    how4Desc: "A structured, evidence-backed answer with wellness support.",
    // Footer
    footerDisclaimer:
      "medAI provides decision support based on USPSTF guidance and is not a substitute for professional medical judgment.",
    footer988: "If you are in crisis, call or text 988 (US) or your local emergency number.",
    madeIn: "Made in Egypt",
    // Auth
    email: "Email",
    password: "Password",
    name: "Name",
    role: "I am a",
    patient: "Patient",
    doctor: "Doctor",
    signupTitle: "Create your account",
    signupCta: "Sign up",
    loginTitle: "Welcome back",
    loginCta: "Log in",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    demoCreds: "Demo credentials for judges",
    signupSuccess: "Account created! Signing you in…",
    // App tabs
    tabChat: "Chat",
    tabHistory: "History",
    tabEvidence: "Evidence Library",
    tabAbout: "About",
    tabAdmin: "Admin",
    // Chat
    chatPlaceholder: "e.g. Should pregnant women be screened for depression?",
    send: "Send",
    thinking: "Analyzing evidence…",
    pipelineTrace: "Pipeline trace",
    evidencePanel: "Retrieved evidence",
    citations: "Citations",
    confidence: "Confidence",
    model: "Model",
    latency: "Latency",
    wellnessTitle: "Wellness Notes 💚",
    wellnessDisclaimer: "This is supportive content, not medical advice.",
    // History
    historyTitle: "Your past queries",
    historyEmpty: "No queries yet. Start a chat to build your history.",
    searchHistory: "Search history…",
    deleteQuery: "Delete",
    reopen: "Reopen",
    // Status badges
    statusSuccess: "SUCCESS",
    statusCrisis: "CRISIS",
    statusRefusal: "REFUSAL",
    // Source viewer
    sourceViewer: "Source Viewer",
    openInNewTab: "Open in new tab",
    page: "Page",
    close: "Close",
    viewPdf: "View PDF",
    // Admin
    adminUsers: "All Users",
    adminQueries: "All Queries",
    // About
    aboutText:
      "medAI is an evidence-grounded assistant for mental health screening decision support. It answers questions about USPSTF depression and suicide-risk screening recommendations with verbatim citations, a built-in PDF source viewer, multilingual crisis safety gates, and supportive wellness notes.",
  },
  ar: {
    login: "تسجيل الدخول",
    signup: "إنشاء حساب",
    logout: "تسجيل الخروج",
    startChat: "ابدأ المحادثة",
    tryGuest: "جرّب كضيف",
    heroTitle: "مساعد medAI الذكي",
    heroSubtitle: "دعم قرارات الصحة النفسية بالذكاء الاصطناعي — وفق إرشادات USPSTF",
    tagline: "مدعوم بالأدلة. موثوق. دقيق.",
    heroDesc:
      "اسأل عن فحص الاكتئاب ومخاطر الانتحار. كل إجابة مستندة إلى أدلة USPSTF مع اقتباسات حرفية يمكنك فتحها في الصفحة المحددة.",
    chipEvidence: "مدعوم بالأدلة",
    chipCrisis: "كشف الأزمات بـ 6 لغات",
    chipViewer: "عارض المصادر PDF",
    chipLang: "عربي/إنجليزي",
    featuresTitle: "لماذا medAI؟",
    f1Title: "إجابات موثّقة",
    f1Desc: "كل إجابة مستمدة حصراً من وثائق إرشادات USPSTF — بلا اختلاق.",
    f2Title: "اقتباسات حرفية",
    f2Desc: "اقتباسات دقيقة مع أسماء الوثائق للتحقق من كل معلومة.",
    f3Title: "عارض المصادر",
    f3Desc: "اضغط على أي اقتباس لفتح ملف PDF الأصلي في الصفحة المحددة.",
    f4Title: "بوابات الأمان",
    f4Desc: "كشف الأزمات بـ 6 لغات يوجّه فوراً إلى 988 — دون تدخل الذكاء الاصطناعي.",
    f5Title: "ملاحظات العافية",
    f5Desc: "موارد دعم نفسي مرفقة مع كل إجابة — محتوى داعم غير طبي.",
    howTitle: "كيف يعمل",
    how1Title: "اسأل",
    how1Desc: "اكتب سؤالك بالعربية أو الإنجليزية.",
    how2Title: "استرجاع",
    how2Desc: "بحث هجين يعثر على أكثر المقاطع صلة من الإرشادات.",
    how3Title: "تحقق",
    how3Desc: "تُطابق الاقتباسات حرفياً مع الوثائق الأصلية.",
    how4Title: "إجابة",
    how4Desc: "إجابة منظمة مدعومة بالأدلة مع دعم للعافية.",
    footerDisclaimer:
      "يقدّم medAI دعماً للقرار وفق إرشادات USPSTF وليس بديلاً عن الرأي الطبي المتخصص.",
    footer988: "إذا كنت في أزمة، اتصل أو أرسل رسالة نصية إلى 988 (الولايات المتحدة) أو رقم الطوارئ المحلي.",
    madeIn: "صُنع في مصر",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    name: "الاسم",
    role: "أنا",
    patient: "مريض",
    doctor: "طبيب",
    signupTitle: "أنشئ حسابك",
    signupCta: "إنشاء حساب",
    loginTitle: "مرحباً بعودتك",
    loginCta: "تسجيل الدخول",
    haveAccount: "لديك حساب بالفعل؟",
    noAccount: "ليس لديك حساب؟",
    demoCreds: "بيانات تجريبية للمحكّمين",
    signupSuccess: "تم إنشاء الحساب! جارٍ تسجيل الدخول…",
    tabChat: "المحادثة",
    tabHistory: "السجل",
    tabEvidence: "مكتبة الأدلة",
    tabAbout: "حول",
    tabAdmin: "الإدارة",
    chatPlaceholder: "مثال: هل يجب فحص النساء الحوامل للاكتئاب؟",
    send: "إرسال",
    thinking: "جارٍ تحليل الأدلة…",
    pipelineTrace: "مسار المعالجة",
    evidencePanel: "الأدلة المسترجعة",
    citations: "الاقتباسات",
    confidence: "الثقة",
    model: "النموذج",
    latency: "زمن الاستجابة",
    wellnessTitle: "ملاحظات العافية 💚",
    wellnessDisclaimer: "هذا محتوى داعم وليس نصيحة طبية.",
    historyTitle: "استفساراتك السابقة",
    historyEmpty: "لا توجد استفسارات بعد. ابدأ محادثة لبناء سجلك.",
    searchHistory: "ابحث في السجل…",
    deleteQuery: "حذف",
    reopen: "فتح",
    statusSuccess: "نجاح",
    statusCrisis: "أزمة",
    statusRefusal: "رفض",
    sourceViewer: "عارض المصادر",
    openInNewTab: "فتح في تبويب جديد",
    page: "صفحة",
    close: "إغلاق",
    viewPdf: "عرض PDF",
    adminUsers: "جميع المستخدمين",
    adminQueries: "جميع الاستفسارات",
    aboutText:
      "medAI مساعد مدعوم بالأدلة لدعم قرارات فحص الصحة النفسية. يجيب عن أسئلة توصيات USPSTF لفحص الاكتئاب ومخاطر الانتحار مع اقتباسات حرفية، وعارض PDF مدمج، وبوابات أمان متعددة اللغات، وملاحظات عافية داعمة.",
  },
} as const;

export type DictKey = keyof (typeof dict)["en"];

interface I18nContextValue {
  lang: Lang;
  t: (key: DictKey) => string;
  setLang: (lang: Lang) => void;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  t: (key) => dict.en[key],
  setLang: () => {},
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("medai_lang") : null;
    if (saved === "ar" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("medai_lang", l);
  }, []);

  const t = useCallback((key: DictKey) => dict[lang][key] ?? dict.en[key], [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang, dir: lang === "ar" ? "rtl" : "ltr" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
