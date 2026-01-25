'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import Link from 'next/link';

export default function LoanPage() {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const { connection } = useConnection();
    const [amount, setAmount] = useState('');
    const [fairscore, setFairscore] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [txStatus, setTxStatus] = useState('');

    useEffect(() => {
        if (publicKey) {
            fetchFairScore();
        }
    }, [publicKey]);

    const fetchFairScore = async () => {
        if (!publicKey) return;

        try {
            const response = await fetch(`/api/getFairScore?wallet=${publicKey.toString()}`);
            const data = await response.json();
            if (data.fairscore) {
                setFairscore(data.fairscore);
            }
        } catch (error) {
            console.error('Error fetching FairScore:', error);
        }
    };

    const getTier = (score: number) => {
        if (score >= 800) return { name: 'Gold', color: 'text-yellow-400', multiplier: 2, apr: 5 };
        if (score >= 400) return { name: 'Silver', color: 'text-gray-300', multiplier: 1.5, apr: 10 };
        return { name: 'Bronze', color: 'text-orange-600', multiplier: 0, apr: 0 };
    };

    const handleRequestLoan = async () => {
        if (!publicKey || !signTransaction || !signAllTransactions || !fairscore) {
            alert('Please connect your wallet first');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (fairscore < 400) {
            alert('Your FairScore is too low. Minimum 400 required. Build your on-chain reputation!');
            return;
        }

        setLoading(true);
        setTxStatus('Preparing transaction...');

        try {
            // TODO: Implement actual Anchor program interaction
            // This is a placeholder for the demo
            const tier = getTier(fairscore);
            const adjustedAmount = parseFloat(amount) * tier.multiplier;

            setTxStatus(`Loan approved! You'll receive ${adjustedAmount} USDC at ${tier.apr}% APR`);

            // Simulate transaction delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            setTxStatus('Transaction successful! (Demo mode - connect to deployed program for real transactions)');

        } catch (error: any) {
            console.error('Error requesting loan:', error);
            setTxStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const tier = fairscore ? getTier(fairscore) : null;
    const adjustedAmount = amount && tier ? parseFloat(amount) * tier.multiplier : 0;

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent cursor-pointer">
                            FairLend
                        </h1>
                    </Link>
                    <WalletMultiButton />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-6 py-12">
                <div className="max-w-2xl mx-auto">
                    <Link href="/" className="text-purple-400 hover:text-purple-300 mb-6 inline-block">
                        ← Back to Dashboard
                    </Link>

                    <h2 className="text-4xl font-bold text-white mb-8">Request Loan</h2>

                    {!publicKey ? (
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                            <p className="text-white text-lg mb-4">
                                Connect your wallet to request a loan
                            </p>
                            <WalletMultiButton />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* FairScore Summary */}
                            {fairscore && tier && (
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-300">Your FairScore:</span>
                                        <span className={`text-3xl font-bold ${tier.color}`}>{fairscore}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-300">Tier:</span>
                                        <span className={`font-bold ${tier.color}`}>{tier.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-300">Terms:</span>
                                        <span className="text-white">{tier.multiplier}x amount @ {tier.apr}% APR</span>
                                    </div>
                                </div>
                            )}

                            {/* Loan Form */}
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                <label className="block text-white font-semibold mb-2">
                                    Loan Amount (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                />

                                {amount && tier && adjustedAmount > 0 && (
                                    <div className="mt-4 p-4 bg-purple-500/20 rounded-lg border border-purple-400/30">
                                        <div className="text-white text-sm space-y-1">
                                            <div>Requested: <span className="font-semibold">{amount} USDC</span></div>
                                            <div>You'll receive: <span className="font-semibold text-purple-300">{adjustedAmount} USDC</span></div>
                                            <div>Interest Rate: <span className="font-semibold">{tier.apr}% APR</span></div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleRequestLoan}
                                    disabled={loading || !amount || !fairscore}
                                    className="w-full mt-6 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 rounded-lg transition-all disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Processing...' : 'Request Loan'}
                                </button>

                                {txStatus && (
                                    <div className="mt-4 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
                                        <p className="text-blue-200 text-sm">{txStatus}</p>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                <h4 className="text-white font-bold mb-2">How FairScore affects your loan:</h4>
                                <ul className="text-purple-200 text-sm space-y-1">
                                    <li>• Score 800+: Borrow 2x your request at 5% APR</li>
                                    <li>• Score 400-800: Borrow 1.5x your request at 10% APR</li>
                                    <li>• Score &lt;400: Loan denied - improve your on-chain activity</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
