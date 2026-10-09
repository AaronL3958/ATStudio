import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATStudio — Sound in motion",
  description: "Create reactive music visuals, save projects, and export high-quality MP4 videos.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
