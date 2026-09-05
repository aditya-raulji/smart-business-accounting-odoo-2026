// Root layout for Urban Furniture Accounting System.
// What: Sets up global fonts (Playfair Display + Inter), SEO metadata, and session provider.
// Why: The root layout wraps every page; loading fonts here ensures they are available
//      globally via CSS custom properties without importing them in every component.
// Why not: Loading fonts per-page would cause FOUC (flash of unstyled content) and duplicate
//          network requests; next/font deduplicates and preloads automatically at the root.
// Used by: Every page in the application.

import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

// Playfair Display: editorial serif used for all H1/H2 headings (italic, brand aesthetic).
// Loaded with the italic axis and weights 600-700 per the design spec §3.2.
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["600", "700"],
  display: "swap",
});

// Inter: clean sans-serif for all body text, labels, numbers, buttons.
// Variable font loaded for maximum flexibility across weight range.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Urban Furniture — Accounting System",
    template: "%s | Urban Furniture",
  },
  description:
    "Internal accounting system for Urban Furniture — manage contacts, products, purchase/sales transactions, and financial reports.",
  keywords: ["accounting", "furniture", "invoices", "purchase", "sales"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full" style={{ fontFamily: "var(--font-inter)" }}>
        {/* SessionProvider makes Auth.js session available to client components */}
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
