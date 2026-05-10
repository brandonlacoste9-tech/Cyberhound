import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "CyberHound | Colony OS",
  description:
    "Autonomous revenue agent — sniffs opportunities, builds infrastructure, generates MRR.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "CyberHound | Colony OS",
    description: "Autonomous revenue agent — sniffs opportunities, builds infrastructure, generates MRR.",
    images: [{ url: "/cyberhound-mascot.png", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CyberHound | Colony OS",
    description: "Autonomous revenue agent — sniffs opportunities, builds infrastructure, generates MRR.",
    images: ["/cyberhound-mascot.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
