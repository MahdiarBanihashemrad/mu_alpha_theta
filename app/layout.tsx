import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Austin High Mu Alpha Theta Tutoring",
  description:
    "Request free, student-led math tutoring from Austin High Mu Alpha Theta.",
  icons: {
    icon: "/mu-alpha-theta-logo.png",
    shortcut: "/mu-alpha-theta-logo.png",
  },
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
