import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PwaStatus } from "@/components/pwa/pwa-status";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {default:"StudyWithMe",template:"%s · StudyWithMe"},
  description: "A calm place to focus, track study time, and make progress.",
  applicationName:"StudyWithMe",manifest:"/manifest.webmanifest",
  appleWebApp:{capable:true,statusBarStyle:"default",title:"StudyWithMe"},
  icons:{icon:"/app-icon-192.png",apple:"/apple-touch-icon.png"},
};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#FBF8F1"};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="en" id="top">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaStatus />{children}
      </body>
    </html>
  );
}
