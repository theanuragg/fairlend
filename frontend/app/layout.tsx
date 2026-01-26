import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { NavBar } from "@/components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FairLend - Reputation-Gated P2P Lending",
  description: "Undercollateralized lending on Solana powered by FairScale reputation scores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 min-h-screen`}
      >
        <WalletContextProvider>
          <div className="flex flex-col min-h-screen">
            <NavBar />
            <main className="flex-grow pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
              {children}
            </main>
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
