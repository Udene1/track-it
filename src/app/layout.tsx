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

import MUIProvider from "@/components/MUIProvider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Tax1 Inventory Tracker",
  description: "Advanced inventory management for Nigerian businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MUIProvider>
          {children}
          <Toaster position="top-right" />
        </MUIProvider>
      </body>
    </html>
  );
}
