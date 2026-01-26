'use client';

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const NavBar = () => {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b-0 border-b-white/5 h-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-12">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <span className="text-2xl font-bold font-heading text-white tracking-tight group-hover:text-primary transition-colors">
                                FairLend
                            </span>
                        </Link>

                        {/* Navigation Links */}
                        <div className="hidden md:flex items-center space-x-8">
                            {[
                                { name: 'Dashboard', path: '/' },
                                { name: 'Lend', path: '/lender' },
                                { name: 'Borrow', path: '/loan' },
                            ].map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`relative px-3 py-2 text-sm font-medium transition-colors hover:text-white group ${isActive(item.path) ? 'text-white' : 'text-gray-400'
                                        }`}
                                >
                                    {item.name}
                                    {isActive(item.path) && (
                                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-linear-to-r from-cyan-400 to-purple-500 rounded-full" />
                                    )}
                                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white/20 transition-all duration-300 group-hover:w-full" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Wallet Connection */}
                    <div className="flex items-center gap-4">
                        <WalletMultiButton className="bg-primary/20! hover:bg-primary/30! border! border-primary/50! rounded-xl! h-10! px-6! text-sm! font-semibold! transition-all! duration-300! hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]!" />
                    </div>
                </div>
            </div>
        </nav>
    );
};
