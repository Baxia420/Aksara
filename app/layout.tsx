import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  IBM_Plex_Mono,
  Manrope,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const displaySerif = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const bodySans = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const uiMono = IBM_Plex_Mono({
  variable: "--font-ui-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Aksara Academic OS",
  description:
    "A refined academic planning dashboard for schedules, coursework, and deadlines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displaySerif.variable} ${bodySans.variable} ${uiMono.variable} h-full`}
    >
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
