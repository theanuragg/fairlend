'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';
import Link from 'next/link';

export default function RepayPage() {
    const { publicKey } = useWallet();
    const { connection } = useConnection();
    const [loading, setLoading] = useState(false);
    const [txStatus, setTxStatus] = useState('');

    // Mock loan data - will be fetched from blockchain in production
    const loanData = {
        amount: 1000,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        interestRate: 10,
        fairscore: 650,
    };

    const calculateInterest = () => {
        const daysPassed = Math.floor((Date.now() - loanData.startDate.getTime()) / (1000 * 60 * 60 * 24));
        return (loanData.amount * loanData.interestRate * daysPassed) / (365 * 100);
    };

    const handleRepay = async () => {
        if (!publicKey) {
            alert('Please connect your wallet first');
            return;
        }

        setLoading(true);
        setTxStatus('Processing repayment...');

        try {
            // TODO: Implement actual Anchor program interaction
            const interest = calculateInterest();
            const total = loanData.amount + interest;

            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));

            setTxStatus(`Repayment successful! Paid ${total.toFixed(2)} USDC (${loanData.amount} principal + ${interest.toFixed(2)} interest)`);

        } catch (error: any) {
            console.error('Error repaying loan:', error);
            setTxStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const interest = calculateInterest();
    const totalDue = loanData.amount + interest;
    const daysPassed = Math.floor((Date.now() - loanData.startDate.getTime()) / (1000 * 60 * 60 * 24));

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

                    <h2 className="text-4xl font-bold text-white mb-8">Repay Loan</h2>

                    {!publicKey ? (
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                            <p className="text-white text-lg mb-4">
                                Connect your wallet to repay your loan
                            </p>
                            <WalletMultiButton />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Loan Details */}
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                <h3 className="text-2xl font-bold text-white mb-6">Active Loan</h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                        <span className="text-gray-300">Principal Amount:</span>
                                        <span className="text-white font-semibold text-xl">{loanData.amount} USDC</span>
                                    </div>

                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                        <span className="text-gray-300">Interest Rate:</span>
                                        <span className="text-white font-semibold">{loanData.interestRate}% APR</span>
                                    </div>

                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                        <span className="text-gray-300">Days Borrowed:</span>
                                        <span className="text-white font-semibold">{daysPassed} days</span>
                                    </div>

                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                        <span className="text-gray-300">Interest Accrued:</span>
                                        <span className="text-yellow-400 font-semibold">{interest.toFixed(2)} USDC</span>
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-gray-300 text-lg">Total Due:</span>
                                        <span className="text-green-400 font-bold text-2xl">{totalDue.toFixed(2)} USDC</span>
                                    </div>
                                </div>
                            </div>

                            {/* Repayment Action */}
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                <div className="bg-green-500/20 rounded-lg p-4 mb-6 border border-green-400/30">
                                    <p className="text-green-200 text-sm">
                                        💡 Tip: Repaying on time maintains your FairScore and enables future larger loans
                                    </p>
                                </div>

                                <button
                                    onClick={handleRepay}
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 rounded-lg transition-all disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Processing...' : `Repay ${totalDue.toFixed(2)} USDC`}
                                </button>

                                {txStatus && (
                                    <div className="mt-4 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
                                        <p className="text-blue-200 text-sm">{txStatus}</p>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                <h4 className="text-white font-bold mb-2">How interest works:</h4>
                                <ul className="text-purple-200 text-sm space-y-1">
                                    <li>• Interest = Principal × Rate × Days / 365</li>
                                    <li>• Your rate was determined by your FairScore at loan time</li>
                                    <li>• Early repayment saves you interest</li>
                                    <li>• On-time repayment improves your FairScore</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
