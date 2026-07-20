import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronicle · Your journey, understood",
  description:
    "An AI digital identity system. Chronicle reads your certificates, projects, and letters, connects them into one graph, and hands any of it back the moment you ask.",
};

/** Applied before paint so a dark-mode reload never flashes white. */
const THEME_BOOT = `(function(){try{var s=localStorage.getItem("chronicle.theme");var d=s==="dark"||(!s&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:ital,wght@0,400..700;1,400..600&family=Fraunces:ital,opsz,wght@1,9..144,300..500&family=Hanken+Grotesk:wght@300..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
