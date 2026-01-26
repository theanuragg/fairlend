'use client';

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback } from "react";

export type Tier = 'Gold' | 'Silver' | 'Bronze';

export interface FairScoreData {
    score: number;
    tier: Tier;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useFairScore = (): FairScoreData => {
    const { publicKey } = useWallet();
    const [score, setScore] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const getTier = (score: number): Tier => {
        if (score >= 800) return 'Gold';
        if (score >= 400) return 'Silver';
        return 'Bronze';
    };

    const fetchScore = useCallback(async () => {
        if (!publicKey) {
            setScore(0);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`/api/getFairScore?wallet=${publicKey.toBase58()}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch score');
            }

            const data = await response.json();
            setScore(data.fair_score);
        } catch (err: any) {
            console.error("Error fetching FairScore:", err);
            setError(err.message || "Failed to load reputation score");
            // Default to 0 on error so they fall into Bronze
            setScore(0);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);

    useEffect(() => {
        fetchScore();
    }, [fetchScore]);

    return {
        score,
        tier: getTier(score),
        loading,
        error,
        refetch: fetchScore
    };
};
