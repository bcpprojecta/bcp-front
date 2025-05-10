import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import Sidebar from "@/components/Sidebar"; // No longer imported directly here
import MainLayoutClient from "@/components/MainLayoutClient"; // Import the new client layout wrapper

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BCP Forecast App",
  description: "Cash Flow Forecasting Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        {/* Replace direct Sidebar and main with MainLayoutClient */}
        <MainLayoutClient>{children}</MainLayoutClient>
      </body>
    </html>
  );
}
