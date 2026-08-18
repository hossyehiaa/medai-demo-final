import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "medAI — Clinical Decision Support",
  description: "AI-powered clinical decision support for USPSTF depression and suicide risk screening guidelines.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
