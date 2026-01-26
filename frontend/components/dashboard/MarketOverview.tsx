'use client';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useState, useRef } from "react";
import { useLendingProgram } from "@/hooks/useLendingProgram";
import { useLendingData } from "@/hooks/useLendingData";
import { useLendingOperations } from "@/hooks/useLendingOperations";
import { SystemProgram, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import Link from "next/link";
import { useFairScore } from "@/hooks/useFairScore";
import { TierCard } from "./TierCard";
import { PYTH_ORACLES_DEVNET } from "../../constants/oracles";
import { toPng, toBlob } from 'html-to-image';

export const MarketOverview: FC = () => {
    const { publicKey } = useWallet();
    const { program } = useLendingProgram();
    const { fetchReserves } = useLendingData();
    const { initLendingMarket, initReserve } = useLendingOperations();
    const score = useFairScore();

    // Tier Card Ref
    const cardRef = useRef<HTMLDivElement>(null);
    const [shareStatus, setShareStatus] = useState<string>("");

    const handleDownloadImage = async () => {
        if (cardRef.current === null) {
            return;
        }

        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, });
            const link = document.createElement('a');
            link.download = `fairscale-tier-${score.tier.toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download image', err);
        }
    };

    const handleShareOnX = async () => {
        if (!cardRef.current) return;

        setShareStatus("Preparing image...");

        try {
            // 1. Try to copy to clipboard
            const blob = await toBlob(cardRef.current, { cacheBust: true });
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    setShareStatus("Image copied! Paste it in your tweet.");
                } catch (clipboardErr) {
                    console.warn("Clipboard write failed, downloading instead", clipboardErr);
                    // Fallback to download
                    handleDownloadImage();
                    setShareStatus("Image downloaded! Attach it to your tweet.");
                }
            }
        } catch (err) {
            console.error("Failed to process image for sharing", err);
            setShareStatus("Failed to process image.");
        }

        // 2. Open Twitter with text
        setTimeout(() => {
            const text = `I just checked my FairScore on FairLend! My score is ${score.score} and I'm a ${score.tier} Tier user. Verify your on-chain reputation now!`;
            const url = 'https://fairlend-nine.vercel.app/';
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(twitterUrl, '_blank');

            // Clear status after a delay
            setTimeout(() => setShareStatus(""), 5000);
        }, 1000); // Small delay to let the user see the status update
    };

    // UI State
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string>("");

    // Inputs
    const [marketPubKey, setMarketPubKey] = useState<string>("");
    const [reserveMint, setReserveMint] = useState<string>("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // Devnet USDC

    const handleInitMarket = async () => {
        setLoading(true);
        setStatus("Creating Lending Market...");
        try {
            const pubKey = await initLendingMarket();
            if (pubKey) {
                setMarketPubKey(pubKey.toString());
                setStatus(`Market Initialized: ${pubKey.toString()}`);
            }
        } catch (e: any) {
            console.error(e);
            setStatus("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInitReserve = async () => {
        if (!marketPubKey) {
            setStatus("Error: No Market Public Key");
            return;
        }
        setLoading(true);
        setStatus("Initializing Reserve...");
        try {
            const mint = new PublicKey(reserveMint);
            // Default Config
            const config = {
                optimalUtilizationRate: 80,
                loanToValueRatio: 60,
                liquidationBonus: 5,
                liquidationThreshold: 70,
                minBorrowRate: 0,
                optimalBorrowRate: 4,
                maxBorrowRate: 30,
                fees: {
                    borrowFeeWad: new BN(10_000_000_000_000), // 0.001% 
                    flashLoanFeeWad: new BN(30_000_000_000_000), // 0.003%
                    hostFeePercentage: 20
                }
            };

            await initReserve(
                new PublicKey(marketPubKey),
                100, // 100 USDC Initial Liquidity
                mint,
                PYTH_ORACLES_DEVNET.USDC.price,
                PYTH_ORACLES_DEVNET.USDC.product,
                config
            );
            setStatus("Reserve Initialized! Refreshing...");
            await fetchReserves();
        } catch (e: any) {
            console.error(e);
            setStatus("Error: " + e.message);
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
            </header>

            {/* Admin / Setup Panel */}
            <div className="glass-panel p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Protocol Setup (Admin)</h3>
                    {status && <span className="text-sm text-blue-300 bg-blue-900/40 px-3 py-1 rounded-lg border border-blue-500/20">{status}</span>}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-center">
                        <button
                            onClick={handleInitMarket}
                            disabled={loading}
                            className="px-4 py-2 bg-linear-to-r from-purple-600 to-indigo-600 rounded-lg text-white font-semibold hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-purple-900/20"
                        >
                            Initialize Lending Market
                        </button>
                        <input
                            type="text"
                            value={marketPubKey}
                            onChange={(e) => setMarketPubKey(e.target.value)}
                            placeholder="Market Public Key"
                            className="bg-slate-900/50 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-purple-500/50 outline-none text-sm flex-1 font-mono transition-colors"
                        />
                    </div>

                    <div className="flex gap-4 items-center border-t border-white/10 pt-4">
                        <button
                            onClick={handleInitReserve}
                            disabled={loading || !marketPubKey}
                            className="px-4 py-2 bg-linear-to-r from-emerald-600 to-teal-600 rounded-lg text-white font-semibold hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/20 whitespace-nowrap"
                        >
                            Initialize USDC Reserve
                        </button>
                        <input
                            type="text"
                            value={reserveMint}
                            onChange={(e) => setReserveMint(e.target.value)}
                            placeholder="Reserve Mint Address"
                            className="bg-slate-900/50 text-white px-3 py-2 rounded-lg border border-white/10 focus:border-emerald-500/50 outline-none text-sm flex-1 font-mono transition-colors"
                        />
                        <span className="text-xs text-gray-500 font-mono">Liquidity: 100 USDC</span>
                    </div>
                </div>
            </div>

            {/* Reputation Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-1 h-6 bg-linear-to-b from-cyan-400 to-blue-500 rounded-full"></span>
                        My Reputation
                    </h3>
                    {score.loading ? (
                        <div className="text-sm text-cyan-400 animate-pulse">Fetching FairScore...</div>
                    ) : score.error ? (
                        <div className="text-sm text-red-400">Error loading score</div>
                    ) : (
                        <div className="flex items-center space-x-3 glass-panel px-4 py-2 rounded-lg">
                            <span className="text-gray-400 text-sm">Your FairScore</span>
                            <span className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-white to-gray-400 font-mono">{score.score}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${score.tier === 'Gold' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' :
                                score.tier === 'Silver' ? 'bg-slate-500/10 text-slate-300 border-slate-500/20' :
                                    'bg-orange-500/10 text-orange-300 border-orange-500/20'}`}>
                                {score.tier}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center md:items-start">
                    <div className="w-full max-w-xl" ref={cardRef}>
                        <TierCard
                            tier={score.tier}
                            isActive={true}
                            userScore={score.score}
                            globalRank={score.score > 0 ? "Top 15% Solana User" : "Unranked"}
                        /* twitterHandle is optional, not passing it for now */
                        />
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button
                            onClick={handleDownloadImage}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium text-white transition-all cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Image
                        </button>
                        <button
                            onClick={handleShareOnX}
                            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-black/80 border border-white/10 rounded-lg text-sm font-medium text-white transition-all cursor-pointer"
                        >
                            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            Share on X
                        </button>
                    </div>
                    {shareStatus && (
                        <div className="mt-2 text-sm text-cyan-400 animate-pulse font-medium">
                            {shareStatus}
                        </div>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* HUD Cards */}
                <div className="p-6 glass-card rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-green-500/10 transition-colors" />
                    <div className="text-sm text-gray-400 mb-1 relative">Total Supplied</div>
                    <div className="text-3xl font-bold text-white relative font-mono">$0.00</div>
                    <div className="text-xs text-green-400 mt-2 relative flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        +0% APY
                    </div>
                </div>
                <div className="p-6 glass-card rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-colors" />
                    <div className="text-sm text-gray-400 mb-1 relative">Total Borrowed</div>
                    <div className="text-3xl font-bold text-white relative font-mono">$0.00</div>
                    <div className="text-xs text-orange-400 mt-2 relative flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                        -0% APY
                    </div>
                </div>
                <div className="p-6 glass-card rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors" />
                    <div className="text-sm text-gray-400 mb-1 relative">Net APY</div>
                    <div className="text-3xl font-bold text-white relative font-mono">0.00%</div>
                    <div className="text-xs text-gray-500 mt-2 relative">Based on current rates</div>
                </div>
            </div>

            {/* Quick Actions */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/lender" className="group relative block p-8 glass-card rounded-2xl overflow-hidden border-l-4 border-l-purple-500">
                    <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-2xl font-bold text-white mb-2 relative">Lend & Earn</h3>
                    <p className="text-gray-400 mb-4 relative">Supply assets to the protocol and earn yield based on market utilization.</p>
                    <span className="text-purple-400 font-semibold group-hover:text-purple-300 flex items-center relative gap-2">
                        Start Lending <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                </Link>

                <Link href="/loan" className="group relative block p-8 glass-card rounded-2xl overflow-hidden border-l-4 border-l-cyan-500">
                    <div className="absolute inset-0 bg-linear-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <h3 className="text-2xl font-bold text-white mb-2 relative">Borrow Assets</h3>
                    <p className="text-gray-400 mb-4 relative">Borrow against your collateral. Rates are determined by your FairScore reputation.</p>
                    <span className="text-cyan-400 font-semibold group-hover:text-cyan-300 flex items-center relative gap-2">
                        Request Loan <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                </Link>
            </section>

            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-linear-to-b from-purple-400 to-pink-500 rounded-full"></span>
                    Active Reserves
                </h3>
                {/* Placeholder for list of reserves */}
                <div className="rounded-2xl border border-white/5 overflow-hidden">
                    <div className="bg-white/5 p-12 text-center text-gray-500 border border-white/5 border-dashed rounded-xl">
                        No active reserves found. Initialize a market and add reserves to get started.
                    </div>
                </div>
            </section>
        </div>
    );
};

