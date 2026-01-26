'use client';

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", path: "/" },
        { name: "Markets", path: "/markets" },
        { name: "Portfolio", path: "/portfolio" },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                            FairLend
                        </Link>
                    </div>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.path}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${pathname === item.path
                                            ? "text-white bg-white/10"
                                            : "text-gray-300 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div>
                        <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !rounded-xl !font-bold transition-all transform hover:scale-105" />
                    </div>
                </div>
            </div>
        </nav>
    );
}
