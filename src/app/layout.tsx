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
        <div
          aria-hidden="true"
          className="hidden"
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: In Concert makes each learner a distinct line in a shared rhythm and refuses the equal-card dashboard.
OWN-WORLD: Warm ivory, ink, coral, moss, and sky; fine measure lines; airy sans type; rectangular controls with restrained corners.
STORY: Begin focused work, see honest personal pacing, then feel quiet company and consistency.
FIRST VIEWPORT: Today opens on one spacious measure with the total and coral Start Study Session action dominant; weekly and social voices sit below.
FORM: Choral-score structure, grounded candidate 5, seed 553aff63.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`,
          }}
        />
        <PwaStatus />{children}
      </body>
    </html>
  );
}
