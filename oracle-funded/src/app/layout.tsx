import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

// Unified sans across the whole app — body + display.
// next/font auto-generates a "Plus Jakarta Sans Fallback" metric-matched
// fallback face to suppress CLS during the swap window.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Loaded as a real web font (not just CSS-level fallback) so the
// "IBM Plex Sans" + "IBM Plex Sans Fallback" entries in the stack are
// served from /_next, not the system. Same CLS-suppression mechanic.
const ibmPlex = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
        className={`${jakarta.variable} ${ibmPlex.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
