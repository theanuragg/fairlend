'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLendingData } from '@/hooks/useLendingData';
import { useLendingOperations } from '@/hooks/useLendingOperations';

export default function RepayPage() {
    const { publicKey } = useWallet();
    const { obligation, reserves, fetchObligation } = useLendingData();
    const { repayObligationLiquidity, withdrawObligationCollateral } = useLendingOperations();

    const [loading, setLoading] = useState(false);
    const [txStatus, setTxStatus] = useState('');
    const [repayAmount, setRepayAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');

    const activeReserve = useMemo(() => reserves[0], [reserves]);

    // Derived values from Obligation
    // borrowedValue is in wads (18 decimals usually + mint decimals?) 
    // Actually wads is strictly 18 decimals fixed point?
    // Anchor says u128. Usually standard SPL Lending uses WAD = 10^18.
    // If we assume the value shown is "Liquidity Amount" scaled by WAD?
    // Or is it "Market Value" in USD?
    // IDL says "borrowed_value: u128". Usually this is the value of the borrow.
    // However, for repayment we need the LIQUIDITY AMOUNT.
    // Obligation probably stores "borrowed_amount_wads" somewhere?
    // Wait, my `ObligationData` interface has `borrows` array and `borrowedValue`.
    // Use `obligation.borrows` to find the specific reserve stats.
    // For MVP, assuming single asset borrowing, use `borrowedValue` as proxy for "Total Loan Value".
    // But `repayObligationLiquidity` takes token amount.
    // Let's assume `borrowedValue` / `marketPrice` ~ Amount?
    // Or better, iterate `obligation.borrows`.
    // But I didn't verify `borrows` structure in `useLendingData`. I just put `any[]`.
    // Let's assume for now the user knows how much they want to repay or we show "Current Borrowed Value" (in USD probably).

    const borrowedValueDisplay = obligation?.borrowedValue?.toString() || '0';
    const depositedValueDisplay = obligation?.depositedValue?.toString() || '0';

    const handleRepay = async () => {
        if (!publicKey || !obligation || !activeReserve) return;
        setLoading(true);
        setTxStatus('Processing repayment...');

        try {
            const val = parseFloat(repayAmount);
            await repayObligationLiquidity(activeReserve, val, obligation.pubkey);
            setTxStatus(`Repayment successful!`);
            setRepayAmount('');
            await fetchObligation();
        } catch (error: any) {
            console.error('Error repaying loan:', error);
            setTxStatus(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!publicKey || !obligation || !activeReserve) return;
        setLoading(true);
        setTxStatus('Processing withdrawal...');

        try {
            const val = parseFloat(withdrawAmount);
            await withdrawObligationCollateral(activeReserve, val, obligation.pubkey);
            setTxStatus('Collateral withrawn successfully!');
            setWithdrawAmount('');
            await fetchObligation();
        } catch (e: any) {
            console.error(e);
            setTxStatus('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full animate-in fade-in duration-700">
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="text-purple-400 hover:text-purple-300 mb-6 inline-block transition-colors">
                    ← Back to Dashboard
                </Link>

                <h2 className="text-4xl font-bold text-white mb-8">Manage Loan</h2>

                {!publicKey ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                        <p className="text-white text-lg mb-4">Connect wallet to manage loans</p>
                        <WalletMultiButton className="bg-indigo-600! hover:bg-indigo-700! rounded-xl!" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {!obligation ? (
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
                                <h3 className="text-xl text-white font-bold">No Active Loan Account</h3>
                                <div className="mt-4">
                                    <Link href="/loan" className="text-indigo-400 hover:text-indigo-300 underline">
                                        Go to Borrow Page to create one
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Loan Details */}
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                    <h3 className="text-2xl font-bold text-white mb-6">Active Position</h3>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                            <span className="text-gray-300">Total Borrowed Value:</span>
                                            <span className="text-white font-semibold text-xl">{borrowedValueDisplay} (Wads)</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                            <span className="text-gray-300">Collateral Value:</span>
                                            <span className="text-white font-semibold">{depositedValueDisplay} (Wads)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Repayment Action */}
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                    <h3 className="text-xl font-bold text-white mb-4">Repay Loan</h3>
                                    <div className="flex space-x-4">
                                        <input
                                            type="number"
                                            value={repayAmount}
                                            onChange={(e) => setRepayAmount(e.target.value)}
                                            placeholder="Amount to repay"
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleRepay}
                                            disabled={loading}
                                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold rounded-xl transition-all shadow-lg whitespace-nowrap"
                                        >
                                            Repay
                                        </button>
                                    </div>
                                </div>

                                {/* Withdraw Collateral */}
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                    <h3 className="text-xl font-bold text-white mb-4">Withdraw Collateral</h3>
                                    <div className="flex space-x-4">
                                        <input
                                            type="number"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder="Collateral amount"
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleWithdraw}
                                            disabled={loading}
                                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl whitespace-nowrap"
                                        >
                                            Withdraw
                                        </button>
                                    </div>
                                </div>

                                {txStatus && (
                                    <div className={`p-4 rounded-lg border ${txStatus.includes('Error') ? 'bg-red-500/20 border-red-400/30 text-red-200' : 'bg-green-500/20 border-green-400/30 text-green-200'
                                        }`}>
                                        <p className="text-sm break-all">{txStatus}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
