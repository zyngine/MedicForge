import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MedicForge - Where First Responders Are Forged",
    template: "%s | MedicForge",
  },
  description:
    "MedicForge is a comprehensive Learning Management System designed for EMS education. Train EMRs, EMTs, AEMTs, and Paramedics with our modern, intuitive platform.",
  keywords: [
    "EMS education",
    "EMT training",
    "Paramedic course",
    "AEMT",
    "EMR",
    "medical education",
    "LMS",
    "learning management system",
    "first responder training",
    "NREMT",
  ],
  authors: [{ name: "MedicForge" }],
  creator: "MedicForge",
  publisher: "MedicForge",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "MedicForge - Where First Responders Are Forged",
    description:
      "MedicForge is a comprehensive Learning Management System designed for EMS education.",
    siteName: "MedicForge",
  },
  twitter: {
    card: "summary_large_image",
    title: "MedicForge - Where First Responders Are Forged",
    description:
      "MedicForge is a comprehensive Learning Management System designed for EMS education.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#C53030" },
    { media: "(prefers-color-scheme: dark)", color: "#E53E3E" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
