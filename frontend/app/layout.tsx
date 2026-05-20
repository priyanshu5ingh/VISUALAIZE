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

export const metadata: Metadata = {
  title: "VisualAIze",
  description:
    "AI-powered graph visualization platform for creating interactive diagrams from natural language.",
  applicationName: "VisualAIze",
  openGraph: {
    title: "VisualAIze",
    description: "AI-powered graph visualization platform for creating interactive diagrams from natural language.",
    type: "website",
    siteName: "VisualAIze",
  },
  twitter: {
    card: "summary_large_image",
    title: "VisualAIze",
    description: "AI-powered graph visualization platform for creating interactive diagrams from natural language.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
  
