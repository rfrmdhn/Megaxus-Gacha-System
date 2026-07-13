import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/organisms/NavBar";
import { ConfirmProvider } from "@/components/molecules/ConfirmDialog";
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
  title: "Gacha Admin",
  description: "Admin dashboard for the gacha event system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full md:flex">
        <ConfirmProvider>
          <NavBar />
          <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        </ConfirmProvider>
      </body>
    </html>
  );
}
