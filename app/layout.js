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

export const metadata = {
  title: "WATCH - 생활습관 루틴",
  description: "WATCH 생활습관 루틴 앱 - 수면, 학습, 독서, 놀이, 성찰",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WATCH",
  },
  icons: {
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white">{children}</body>
    </html>
  );
}
