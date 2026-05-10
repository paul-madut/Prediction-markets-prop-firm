import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OracleFunded - Prediction Market Prop Firm",
  description: "Trade prediction markets and get funded with OracleFunded",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
