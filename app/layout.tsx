import type { Metadata } from "next";
import { Bebas_Neue, Geist_Mono, Poppins } from "next/font/google";
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
  metadataBase: new URL("https://genetrify.com"),
  title: {
    default: "Genetrify | AI Affiliate Video Generator",
    template: "%s | Genetrify",
  },
  description: "Generate TikTok-style affiliate videos in under 2 minutes.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Genetrify | AI Affiliate Video Generator",
    description: "Generate TikTok-style affiliate videos in under 2 minutes.",
    url: "https://genetrify.com",
    siteName: "Genetrify",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Genetrify | AI Affiliate Video Generator",
    description: "Generate TikTok-style affiliate videos in under 2 minutes.",
  },
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
