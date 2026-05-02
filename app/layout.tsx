import type { Metadata } from "next";
import { Bebas_Neue, Geist_Mono, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Genetrify | AI Fashion Model Photography & TikTok Video",
    template: "%s | Genetrify",
  },
  description:
    "Generate photorealistic AI fashion model photography from your product images and turn them into TikTok-ready videos in minutes.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Genetrify | AI Fashion Model Photography & TikTok Video",
    description:
      "Generate photorealistic AI fashion model photography from your product images and turn them into TikTok-ready videos in minutes.",
    url: SITE_URL,
    siteName: "Genetrify",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Genetrify | AI Fashion Model Photography & TikTok Video",
    description:
      "Generate photorealistic AI fashion model photography from your product images and turn them into TikTok-ready videos in minutes.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${bebasNeue.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
