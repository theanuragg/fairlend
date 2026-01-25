'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import Link from 'next/link';

export default function LenderPage() {
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const [depositAmount, setDepositAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [txStatus, setTxStatus] = useState('');

    // Mock pool data - will be fetched from blockchain in production
    const poolStats = {
        totalDeposited: 50000,
        totalLoaned: 35000,
        estimatedAPY: 8.5,
        yourDeposit: 5000,
        yourEarnings: 125.5,
    };

    const handleDeposit = async () => {
        if (!publicKey) {
            alert('Please connect your wallet first');
            return;
        }

        if (!depositAmount || parseFloat(depositAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setTxStatus('Processing deposit...');

        try {
            // TODO: Implement actual Anchor program interaction
            await new Promise(resolve => setTimeout(resolve, 2000));

            setTxStatus(`Successfully deposited ${depositAmount} USDC to the lending pool!`);
            setDepositAmount('');

        } catch (error: any) {
            console.error('Error depositing:', error);
            setTxStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const available = poolStats.totalDeposited - poolStats.totalLoaned;
    const utilization = ((poolStats.totalLoaned / poolStats.totalDeposited) * 100).toFixed(1);

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
                <div className="max-w-4xl mx-auto">
                    <Link href="/" className="text-purple-400 hover:text-purple-300 mb-6 inline-block">
                        ← Back to Dashboard
                    </Link>

                    <h2 className="text-4xl font-bold text-white mb-8">Lend & Earn</h2>

                    {!publicKey ? (
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                            <p className="text-white text-lg mb-4">
                                Connect your wallet to start earning
                            </p>
                            <WalletMultiButton />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Pool Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                                    <div className="text-gray-300 text-sm mb-1">Total Pool Size</div>
                                    <div className="text-white text-2xl font-bold">${poolStats.totalDeposited.toLocaleString()}</div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                                    <div className="text-gray-300 text-sm mb-1">Utilization Rate</div>
                                    <div className="text-yellow-400 text-2xl font-bold">{utilization}%</div>
                                </div>

                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                                    <div className="text-gray-300 text-sm mb-1">Estimated APY</div>
                                    <div className="text-green-400 text-2xl font-bold">{poolStats.estimatedAPY}%</div>
                                </div>
                            </div>

                            {/* Your Position */}
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                <h3 className="text-2xl font-bold text-white mb-6">Your Position</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="text-gray-300 mb-2">Deposited</div>
                                        <div className="text-white text-3xl font-bold">${poolStats.yourDeposit.toLocaleString()}</div>
                                    </div>

                                    <div>
                                        <div className="text-gray-300 mb-2">Total Earnings</div>
                                        <div className="text-green-400 text-3xl font-bold">${poolStats.yourEarnings.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Deposit Form */}
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                <h3 className="text-xl font-bold text-white mb-4">Deposit to Pool</h3>

                                <label className="block text-white font-semibold mb-2">
                                    Amount (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="Enter amount to deposit"
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                />

                                {depositAmount && parseFloat(depositAmount) > 0 && (
                                    <div className="mt-4 p-4 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
                                        <div className="text-white text-sm space-y-1">
                                            <div>Estimated annual earnings: <span className="font-semibold text-yellow-300">${(parseFloat(depositAmount) * poolStats.estimatedAPY / 100).toFixed(2)}</span></div>
                                            <div className="text-xs text-gray-300">Based on current {poolStats.estimatedAPY}% APY</div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleDeposit}
                                    disabled={loading || !depositAmount}
                                    className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 rounded-lg transition-all disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Processing...' : 'Deposit to Pool'}
                                </button>

                                {txStatus && (
                                    <div className="mt-4 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
                                        <p className="text-blue-200 text-sm">{txStatus}</p>
                                    </div>
                                )}
                            </div>

                            {/* How it Works */}
                            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                <h4 className="text-white font-bold mb-3">How lending works:</h4>
                                <ul className="text-purple-200 text-sm space-y-2">
                                    <li>✓ <strong>Earn Passive Income:</strong> Your USDC earns interest from borrower repayments</li>
                                    <li>✓ <strong>FairScore Protection:</strong> Only qualified borrowers (FairScore 400+) can access funds</li>
                                    <li>✓ <strong>Transparent APY:</strong> Rates adjust based on pool utilization</li>
                                    <li>✓ <strong>Withdraw Anytime:</strong> Pull your funds when available liquidity permits</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
