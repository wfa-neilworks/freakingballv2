import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreakingBall — Pickleball Club Management",
  description: "Manage pickleball club members, open plays, tournaments, and player stats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
