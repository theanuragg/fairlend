'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FairScoreData {
  fairscore?: number;
  error?: string;
}

export default function Home() {
  const { publicKey, connected } = useWallet();
  const [scoreData, setScoreData] = useState<FairScoreData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      fetchFairScore();
    } else {
      setScoreData(null);
    }
  }, [connected, publicKey]);

  const fetchFairScore = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/getFairScore?wallet=${publicKey.toString()}`);
      const data = await response.json();
      setScoreData(data);
    } catch (error) {
      console.error('Error fetching FairScore:', error);
      setScoreData({ error: 'Failed to fetch score' });
    } finally {
      setLoading(false);
    }
  };

  const getTier = (score?: number) => {
    if (!score) return { name: 'Unknown', color: 'text-gray-400', multiplier: '1x', apr: 'N/A' };
    if (score >= 800) return { name: 'Gold', color: 'text-yellow-400', multiplier: '2x', apr: '5%' };
    if (score >= 400) return { name: 'Silver', color: 'text-gray-300', multiplier: '1.5x', apr: '10%' };
    return { name: 'Bronze', color: 'text-orange-600', multiplier: 'N/A', apr: 'Denied' };
  };

  const tier = getTier(scoreData?.fairscore)

    ;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            FairLend
          </h1>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">
              Reputation-Gated P2P Lending
            </h2>
            <p className="text-xl text-purple-200">
              Get better loan terms based on your on-chain reputation
            </p>
            <p className="text-sm text-purple-300 mt-2">
              Powered by FairScale on Solana Devnet
            </p>
          </div>

          {!connected ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
              <p className="text-white text-lg mb-4">
                Connect your wallet to get started
              </p>
              <WalletMultiButton />
            </div>
          ) : (
            <div className="space-y-6">
              {/* FairScore Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-4">Your FairScore</h3>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent"></div>
                  </div>
                ) : scoreData?.error ? (
                  <div className="text-red-400 text-center py-4">
                    {scoreData.error}
                    <p className="text-sm text-gray-400 mt-2">
                      Make sure you have a FairScale API key configured
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${tier.color}`}>
                        {scoreData?.fairscore || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-400 mt-2">Score</div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Tier:</span>
                        <span className={`font-bold ${tier.color}`}>{tier.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Loan Multiplier:</span>
                        <span className="text-white font-semibold">{tier.multiplier}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Interest Rate:</span>
                        <span className="text-white font-semibold">{tier.apr} APR</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/loan">
                  <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 transition-all rounded-xl p-6 border border-purple-400/30 cursor-pointer">
                    <h4 className="text-xl font-bold text-white mb-2">Request Loan</h4>
                    <p className="text-purple-200 text-sm">Borrow USDC with your FairScore</p>
                  </div>
                </Link>

                <Link href="/repay">
                  <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 hover:from-green-500/30 hover:to-teal-500/30 transition-all rounded-xl p-6 border border-green-400/30 cursor-pointer">
                    <h4 className="text-xl font-bold text-white mb-2">Repay Loan</h4>
                    <p className="text-green-200 text-sm">Pay back with interest</p>
                  </div>
                </Link>

                <Link href="/lender">
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all rounded-xl p-6 border border-yellow-400/30 cursor-pointer">
                    <h4 className="text-xl font-bold text-white mb-2">Lend & Earn</h4>
                    <p className="text-yellow-200 text-sm">Deposit to pool and earn yield</p>
                  </div>
                </Link>
              </div>

              {/* Info Section */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h4 className="text-lg font-bold text-white mb-3">How it works</h4>
                <ul className="space-y-2 text-purple-200 text-sm">
                  <li>✓ <strong>Gold Tier (800+):</strong> 2x loan amount, 5% APR - Best for active traders with social verification</li>
                  <li>✓ <strong>Silver Tier (400-800):</strong> 1.5x loan amount, 10% APR - Standard for established wallets</li>
                  <li>✗ <strong>Bronze Tier (&lt;400):</strong> Loans denied - Build your on-chain reputation first</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 py-6">
        <div className="container mx-auto px-6 text-center text-purple-300 text-sm">
          Built for FairScale Challenge • Powered by Solana Devnet
        </div>
      </footer>
    </div>
  );
}
