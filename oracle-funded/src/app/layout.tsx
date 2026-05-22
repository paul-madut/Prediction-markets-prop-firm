import type { Metadata } from "next";
import { Inter_Tight, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

// Body sans — Inter Tight is the font Blueberry Funded uses on the live site
// for body copy. It is freely available via Google Fonts.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

// Display / heading face — the live site uses Creato Display, which is
// proprietary. Plus Jakarta Sans is a close open-source geometric sans that
// reads similarly at large sizes; it ships with next/font.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blueberry Funded — Broker Backed Prop Trading",
  description:
    "Get funded, trade live markets, and keep up to 80% of profits. Broker-backed prop trading with no time limit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${interTight.variable} ${jakarta.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
