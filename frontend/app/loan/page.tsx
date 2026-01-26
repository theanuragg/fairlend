'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLendingData, ReserveData } from '@/hooks/useLendingData';
import { useLendingOperations } from '@/hooks/useLendingOperations';

export default function LoanPage() {
    const { publicKey } = useWallet();
    const { obligation, reserves, fetchObligation, loading: dataLoading } = useLendingData();
    const { initObligation, depositObligationCollateral, borrowObligationLiquidity } = useLendingOperations();

    const [amount, setAmount] = useState('');
    const [fairscore, setFairscore] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [txStatus, setTxStatus] = useState('');
    const [collateralAmount, setCollateralAmount] = useState('');

    // Select USDC reserve for borrowing/collateral
    const activeReserve = useMemo(() => reserves[0], [reserves]); // Simplified

    useEffect(() => {
        if (publicKey) {
            fetchFairScore();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicKey?.toBase58()]);

    const fetchFairScore = async () => {
        if (!publicKey) return;
        try {
            const response = await fetch(`/api/getFairScore?wallet=${publicKey.toString()}`);
            const data = await response.json();
            if (data.fairscore) setFairscore(data.fairscore);
        } catch (error) {
            console.error('Error fetching FairScore:', error);
        }
    };

    const getTier = (score: number) => {
        if (score >= 800) return { name: 'Gold', color: 'text-yellow-400', multiplier: 2, apr: 5 };
        if (score >= 400) return { name: 'Silver', color: 'text-gray-300', multiplier: 1.5, apr: 10 };
        return { name: 'Bronze', color: 'text-orange-600', multiplier: 0, apr: 0 };
    };

    const handleInitObligation = async () => {
        if (!activeReserve) return;
        setLoading(true);
        setTxStatus('Initializing Loan Account...');
        try {
            await initObligation(activeReserve.lendingMarket);
            setTxStatus('Loan Account Initialized!');
            await fetchObligation(); // Refresh to show next steps
        } catch (e: any) {
            console.error(e);
            setTxStatus('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDepositCollateral = async () => {
        if (!activeReserve || !obligation) return;
        setLoading(true);
        setTxStatus('Depositing Collateral...');
        try {
            await depositObligationCollateral(activeReserve, parseFloat(collateralAmount), obligation.pubkey);
            setTxStatus('Collateral Deposited!');
            await fetchObligation();
            setCollateralAmount('');
        } catch (e: any) {
            console.error(e);
            setTxStatus('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    const handleBorrow = async () => {
        if (!activeReserve || !obligation) return;
        setLoading(true);
        setTxStatus('Processing Loan...');
        try {
            const val = parseFloat(amount);
            await borrowObligationLiquidity(activeReserve, val, obligation.pubkey);
            setTxStatus(`Successfully borrowed ${val} USDC!`);
            setAmount('');
            await fetchObligation();
        } catch (e: any) {
            console.error(e);
            setTxStatus('Error: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const tier = fairscore ? getTier(fairscore) : null;
    const adjustedAmount = amount && tier ? parseFloat(amount) * tier.multiplier : 0; // Legacy logic, might need adjustment for real math

    return (
        <div className="w-full animate-in fade-in duration-700">
            <div className="max-w-3xl mx-auto">
                <Link href="/" className="text-purple-400 hover:text-purple-300 mb-6 inline-block transition-colors">
                    ← Back to Dashboard
                </Link>

                <h2 className="text-4xl font-bold text-white mb-8">Borrow Assets</h2>

                {!publicKey ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
                        <p className="text-white text-lg mb-4">Connect wallet to borrow</p>
                        <WalletMultiButton className="bg-indigo-600! hover:bg-indigo-700! rounded-xl!" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* FairScore Display */}
                        {fairscore && tier && (
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 flex justify-between items-center">
                                <div>
                                    <div className="text-gray-300 text-sm">Your FairScore</div>
                                    <div className={`text-3xl font-bold ${tier.color}`}>{fairscore}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold ${tier.color} text-xl`}>{tier.name} Tier</div>
                                    <div className="text-gray-400 text-sm">{tier.apr}% APR Strategy</div>
                                </div>
                            </div>
                        )}

                        {!obligation ? (
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
                                <h3 className="text-xl text-white font-bold mb-4">Start by creating a Loan Account</h3>
                                <p className="text-gray-400 mb-6">You need an Obligation account to manage collateral and loans.</p>
                                <button
                                    onClick={handleInitObligation}
                                    disabled={loading || !activeReserve}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg"
                                >
                                    {loading ? 'Initializing...' : 'Initialize Loan Account'}
                                </button>
                                {txStatus && <p className="mt-4 text-gray-300">{txStatus}</p>}
                            </div>
                        ) : (
                            <>
                                {/* Collateral Section */}
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                    <h3 className="text-xl text-white font-bold mb-4">1. Add Collateral</h3>
                                    <div className="flex space-x-4 mb-4">
                                        <input
                                            type="number"
                                            value={collateralAmount}
                                            onChange={(e) => setCollateralAmount(e.target.value)}
                                            placeholder="Amount to deposit"
                                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleDepositCollateral}
                                            disabled={loading}
                                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl whitespace-nowrap"
                                        >
                                            Deposit Collateral
                                        </button>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Current Deposited Value: {obligation.depositedValue?.toString() || '0'} (wads)
                                    </div>
                                </div>

                                {/* Borrow Section */}
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
                                    <h3 className="text-xl text-white font-bold mb-4">2. Borrow Cash</h3>
                                    <div className="mb-4">
                                        <label className="text-gray-300 text-sm block mb-2">Loan Amount</label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleBorrow}
                                        disabled={loading}
                                        className="w-full py-4 bg-linear-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold rounded-xl transition-all shadow-lg"
                                    >
                                        {loading ? 'Processing...' : 'Request Loan'}
                                    </button>
                                </div>

                                {txStatus && (
                                    <div className={`p-4 rounded-lg border ${txStatus.includes('Error') ? 'bg-red-500/20 border-red-400/30 text-red-200' : 'bg-green-500/20 border-green-400/30 text-green-200'
                                        }`}>
                                        <p>{txStatus}</p>
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
