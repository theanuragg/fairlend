import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google"; // Premium fonts
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { NavBar } from "@/components/NavBar";

import BackgroundLayer from "@/components/BackgroundLayer";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "FairLend - Premium P2P Lending",
  description: "Next-gen undercollateralized lending on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${inter.variable} font-sans antialiased min-h-screen bg-[#030712] text-white selection:bg-purple-500/30`}
      >
        <BackgroundLayer />
        <WalletContextProvider>
          <div className="flex flex-col min-h-screen relative z-10">
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
