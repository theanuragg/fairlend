'use client';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useState } from "react";
import { useLendingProgram } from "@/hooks/useLendingProgram";
import { SystemProgram, Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import Link from "next/link";

export const MarketOverview: FC = () => {
    const { publicKey } = useWallet();
    const { program } = useLendingProgram();
    const [loading, setLoading] = useState(false);

    const initMarket = async () => {
        if (!program || !publicKey) return;

        try {
            setLoading(true);
            const lendingMarket = Keypair.generate();
            const quoteCurrency = Array(32).fill(0); // Placeholder for USD/USDC

            // Example instruction call - adjust arguments based on actual IDL
            // init_lending_market account expects: owner, lending_market, system_program, token_program, oracle
            // The IDL shows: owner, lending_market, system_program, token_program, oracle.
            // Wait, looking at IDL:
            // accounts: owner, lending_market, system_program, token_program, oracle
            // args: quote_currency

            // We need a proper oracle account (Pyth). For devnet/testing we might need a dummy or existing one.
            // For now, I'll just log what I would do, or try to init if I had an oracle.

            console.log("Initializing market...", lendingMarket.publicKey.toBase58());

            // This is a placeholder action until we have real oracle addresses
            alert("This feature requires a valid Oracle address input. Implementation coming soon.");

        } catch (error) {
            console.error("Error creating market:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!publicKey) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                <div className="p-8 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome to FairLend</h2>
                    <p className="text-gray-400 mb-6">Connect your wallet to access the decentralized lending market.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Market Overview</h1>
                    <p className="text-gray-400">Manage your assets and liabilities across the Solana ecosystem.</p>
                </div>
                <button
                    onClick={initMarket}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating..." : "Create Lending Market"}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* HUD Cards */}
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div className="text-sm text-gray-400 mb-1">Total Supplied</div>
                    <div className="text-3xl font-bold text-white">$0.00</div>
                    <div className="text-xs text-green-400 mt-2">+0% APY</div>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div className="text-sm text-gray-400 mb-1">Total Borrowed</div>
                    <div className="text-3xl font-bold text-white">$0.00</div>
                    <div className="text-xs text-orange-400 mt-2">-0% APY</div>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div className="text-sm text-gray-400 mb-1">Net APY</div>
                    <div className="text-3xl font-bold text-white">0.00%</div>
                    <div className="text-xs text-gray-500 mt-2">Based on current rates</div>
                </div>
            </div>

            {/* Quick Actions */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/lender" className="group relative block p-8 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl border border-white/10 overflow-hidden hover:border-purple-500/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-2xl font-bold text-white mb-2">Lend & Earn</h3>
                    <p className="text-gray-400 mb-4">Supply assets to the protocol and earn yield based on market utilization.</p>
                    <span className="text-purple-400 font-semibold group-hover:text-purple-300 flex items-center">
                        Start Lending <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                </Link>

                <Link href="/loan" className="group relative block p-8 bg-gradient-to-br from-indigo-900/50 to-blue-900/50 rounded-2xl border border-white/10 overflow-hidden hover:border-blue-500/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-2xl font-bold text-white mb-2">Borrow Assets</h3>
                    <p className="text-gray-400 mb-4">Borrow against your collateral. Rates are determined by your FairScore reputation.</p>
                    <span className="text-blue-400 font-semibold group-hover:text-blue-300 flex items-center">
                        Request Loan <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                </Link>
            </section>

            <section>
                <h3 className="text-xl font-bold text-white mb-4">Active Reserves</h3>
                {/* Placeholder for list of reserves */}
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <div className="bg-white/5 p-8 text-center text-gray-400">
                        No active reserves found. Initialize a market and add reserves to get started.
                    </div>
                </div>
            </section>
        </div>
    );
};
