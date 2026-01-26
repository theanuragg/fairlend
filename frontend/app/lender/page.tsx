'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLendingData, ReserveData } from '@/hooks/useLendingData';
import { useLendingOperations } from '@/hooks/useLendingOperations';
import { PublicKey } from '@solana/web3.js';

export default function LenderPage() {
    const { publicKey } = useWallet();
    const { reserves, loading: dataLoading } = useLendingData();
    const { depositReserveLiquidity, redeemReserveCollateral } = useLendingOperations();

    const [amount, setAmount] = useState('');
    const [isDepositing, setIsDepositing] = useState(true); // Toggle between Deposit and Withdraw
    const [txStatus, setTxStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedReserve, setSelectedReserve] = useState<ReserveData | null>(null);

    // Auto-select first reserve if available and none selected
    useMemo(() => {
        if (reserves.length > 0 && !selectedReserve) {
            setSelectedReserve(reserves[0]);
        }
    }, [reserves, selectedReserve]);

    const activeReserve = selectedReserve || reserves[0];

    const handleAction = async () => {
        if (!publicKey) {
            alert('Please connect your wallet first');
            return;
        }
        if (!activeReserve) {
            alert('No active market found');
            return;
        }

        setLoading(true);
        setTxStatus(isDepositing ? 'Processing deposit...' : 'Processing withdrawal...');

        try {
            const val = parseFloat(amount);
            if (isNaN(val) || val <= 0) throw new Error("Invalid amount");

            let sig;
            if (isDepositing) {
                sig = await depositReserveLiquidity(activeReserve, val);
                setTxStatus(`Deposit successful! Sig: ${sig.slice(0, 8)}...`);
            } else {
                sig = await redeemReserveCollateral(activeReserve, val); // val is cTokens amount? Or liquidity? 
                // Hook expects cToken amount.
                // For simplified UI, let's assume 1:1 or user inputs cTokens to burn.
                // In reality, we should show exchange rate.
                setTxStatus(`Withdrawal successful! Sig: ${sig.slice(0, 8)}...`);
            }
            setAmount('');
        } catch (error: any) {
            console.error('Error:', error);
            setTxStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full animate-in fade-in duration-700">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="text-purple-400 hover:text-purple-300 mb-6 inline-block transition-colors">
                    ← Back to Dashboard
                </Link>

                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-4xl font-bold text-white">Lend & Earn</h2>
                    <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                        <span className="text-gray-300 text-sm">Active Market: </span>
                        <span className="text-purple-300 font-mono text-sm">
                            {activeReserve ? activeReserve.pubkey.toBase58().slice(0, 6) + '...' : 'Loading...'}
                        </span>
                    </div>
                </div>

                {!publicKey ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 border border-white/20 text-center">
                        <h3 className="text-2xl font-bold text-white mb-4">Connect Wallet to Start Earning</h3>
                        <p className="text-gray-300 mb-8 max-w-md mx-auto">
                            Supply assets to the FairLend protocol and earn interest from borrowers.
                        </p>
                        <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !rounded-xl" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Stats Panel */}
                        <div className="space-y-6">
                            {/* Pool Stats */}
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                                <h3 className="text-xl font-bold text-white mb-6">Pool Statistics</h3>
                                {dataLoading || !activeReserve ? (
                                    <p className="text-gray-400">Loading market data...</p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Total Supplied</span>
                                            <span className="text-white font-mono">
                                                {activeReserve.liquidity.availableAmount.toString()} (Raw)
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Total Borrowed</span>
                                            <span className="text-white font-mono">
                                                {activeReserve.liquidity.borrowedAmountWads.toString().slice(0, 10)}...
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-300">Utilization Rate</span>
                                            <span className="text-green-400 font-bold">
                                                {activeReserve.config.optimalUtilizationRate}% (Target)
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-white/10">
                                            <span className="text-gray-300">Net APY</span>
                                            <span className="text-transparent bg-clip-text bg-linear-to-r from-green-400 to-teal-400 font-bold text-xl">
                                                Dynamic
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Your Position */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                <h3 className="text-white font-bold mb-4">Your Position</h3>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Deposited Balance</span>
                                    <span className="text-white font-mono text-lg">0.00 USDC</span> {/* TODO: Fetch user balance */}
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-gray-400">Inteest Earned</span>
                                    <span className="text-green-400 font-mono">+0.00 USDC</span>
                                </div>
                            </div>

                            {/* How it Works */}
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                <h4 className="text-white font-bold mb-3">How lending works:</h4>
                                <ul className="text-purple-200 text-sm space-y-2">
                                    <li>✓ <strong>Earn Passive Income:</strong> Your USDC earns interest from borrower repayments</li>
                                    <li>✓ <strong>FairScore Protection:</strong> Only qualified borrowers (FairScore 400+) can access funds</li>
                                    <li>✓ <strong>Transparent APY:</strong> Rates adjust based on pool utilization</li>
                                    <li>✓ <strong>Withdraw Anytime:</strong> Pull your funds when available liquidity permits</li>
                                </ul>
                            </div>
                        </div>

                        {/* Action Panel */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 h-fit">
                            <div className="flex space-x-2 mb-6 bg-black/20 p-1 rounded-lg">
                                <button
                                    onClick={() => setIsDepositing(true)}
                                    className={`flex-1 py-2 rounded-md font-medium transition-all ${isDepositing ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Supply
                                </button>
                                <button
                                    onClick={() => setIsDepositing(false)}
                                    className={`flex-1 py-2 rounded-md font-medium transition-all ${!isDepositing ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    Withdraw
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-gray-300 text-sm mb-2">
                                    Amount to {isDepositing ? 'Supply' : 'Withdraw'}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-4 pr-16 text-white text-lg focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                        USDC
                                    </span>
                                </div>
                                <div className="flex justify-end mt-2">
                                    <span className="text-xs text-gray-400 cursor-pointer hover:text-white transition-colors">
                                        Balance: 0.00 USDC
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleAction}
                                disabled={loading || !activeReserve}
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-95"
                            >
                                {loading ? 'Processing...' : (isDepositing ? 'Confirm Supply' : 'Confirm Withdraw')}
                            </button>

                            {txStatus && (
                                <div className={`mt-4 p-4 rounded-lg border ${txStatus.includes('Error')
                                        ? 'bg-red-500/20 border-red-400/30 text-red-200'
                                        : 'bg-green-500/20 border-green-400/30 text-green-200'
                                    }`}>
                                    <p className="text-sm break-all">{txStatus}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
