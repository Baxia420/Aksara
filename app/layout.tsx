import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  IBM_Plex_Mono,
  Manrope,
} from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

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
  title: "Aksara — Academic OS",
  description:
    "A refined academic planning dashboard for schedules, coursework, and deadlines.",
  applicationName: "Aksara",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aksara",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#83103e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displaySerif.variable} ${bodySans.variable} ${uiMono.variable} h-full`}
    >
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aksara-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
