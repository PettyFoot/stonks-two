import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trade Voyager - Professional Trading Analytics Platform",
  description: "Professional trading analytics and performance tracking for serious traders. Track P&L, analyze performance, and improve your trading with comprehensive analytics.",
  keywords: "trading analytics, trade tracking, P&L analysis, trading performance, stock trading, forex trading",
  authors: [{ name: "Trade Voyager" }],
  creator: "Trade Voyager",
  publisher: "Trade Voyager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
