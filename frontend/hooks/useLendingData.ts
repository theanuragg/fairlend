'use client';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useLendingProgram } from "./useLendingProgram";
import { useEffect, useState, useCallback } from "react";
import { BN } from "@coral-xyz/anchor";

export interface ReserveData {
    pubkey: PublicKey;
    lendingMarket: PublicKey;
    liquidity: {
        mintPubKey: PublicKey;
        mintDecimals: number;
        supplyPubKey: PublicKey;
        feeReceiver: PublicKey;
        oraclePubKey: PublicKey;
        availableAmount: BN;
        borrowedAmountWads: BN;
        cumulativeBorrowRateWads: BN;
        marketPrice: BN;
    };
    collateral: {
        mintPubKey: PublicKey;
        mintTotalSupply: BN;
        supplyPubKey: PublicKey;
    };
    config: {
        optimalUtilizationRate: number;
        loanToValueRatio: number;
        liquidationBonus: number;
        liquidationThreshold: number;
        minBorrowRate: number;
        optimalBorrowRate: number;
        maxBorrowRate: number;
    };
}

export interface ObligationData {
    pubkey: PublicKey;
    lendingMarket: PublicKey;
    owner: PublicKey;
    depositedValue: BN; // wads
    borrowedValue: BN; // wads
    allowedBorrowValue: BN; // wads
    unhealthyBorrowValue: BN; // wads
    deposits: any[]; // refine later
    borrows: any[]; // refine later
}

// Helper to convert Anchor BN or similar to our BN if needed, though Anchor returns BN usually
// We use BN from @coral-xyz/anchor

export const useLendingData = () => {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const { program } = useLendingProgram();

    const [reserves, setReserves] = useState<ReserveData[]>([]);
    const [obligation, setObligation] = useState<ObligationData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchReserves = useCallback(async () => {
        if (!program) return;

        try {
            setLoading(true);
            // Accessing 'reserve' account namespace. Standard Anchor camelCase for 'Reserve'.
            const reserveAccounts = await (program as any).account.reserve.all();

            const parsedReserves: ReserveData[] = reserveAccounts.map((account: any) => {
                const data = account.account;
                return {
                    pubkey: account.publicKey,
                    lendingMarket: data.lendingMarket,
                    liquidity: {
                        mintPubKey: data.liquidity.mintPubkey,
                        mintDecimals: data.liquidity.mintDecimals,
                        supplyPubKey: data.liquidity.supplyPubkey,
                        feeReceiver: data.liquidity.feeReceiver,
                        oraclePubKey: data.liquidity.oraclePubkey,
                        availableAmount: data.liquidity.availableAmount, // BN
                        borrowedAmountWads: data.liquidity.borrowedAmountWads, // u128 -> BN
                        cumulativeBorrowRateWads: data.liquidity.cumulativeBorrowRateWads, // u128 -> BN
                        marketPrice: data.liquidity.marketPrice, // u128 -> BN
                    },
                    collateral: {
                        mintPubKey: data.collateral.mintPubkey,
                        mintTotalSupply: data.collateral.mintTotalSupply,
                        supplyPubKey: data.collateral.supplyPubkey,
                    },
                    config: {
                        optimalUtilizationRate: data.config.optimalUtilizationRate,
                        loanToValueRatio: data.config.loanToValueRatio,
                        liquidationBonus: data.config.liquidationBonus,
                        liquidationThreshold: data.config.liquidationThreshold,
                        minBorrowRate: data.config.minBorrowRate,
                        optimalBorrowRate: data.config.optimalBorrowRate,
                        maxBorrowRate: data.config.maxBorrowRate,
                    }
                } as ReserveData;
            });

            setReserves(parsedReserves);
        } catch (err) {
            console.error("Error fetching reserves:", err);
        } finally {
            setLoading(false);
        }
    }, [program]);

    const fetchObligation = useCallback(async () => {
        if (!program || !publicKey) return;

        try {
            // Find obligation by owner
            // Assuming one obligation per user per market for simplicity or filter by owner
            // program.account.obligation.all([{ memcmp: { offset: ..., bytes: ... } }])
            // Or if we know the address or just fetch all and filter (inefficient but works for devnet small scale)

            // For efficiency, usually we derive address or filter. 
            // IDL `init_obligation` doesn't seem to use PDA with seeds based on owner in a standard way?
            // accounts: obligation, lending_market, obligation_owner...
            // It seems `obligation` is a Keypair generated by client.
            // So we must find it by filtering.

            // Obligation layout:
            // version (u8)
            // last_update (struct)
            // lending_market (pubkey)
            // owner (pubkey) -> This is what we filter on.

            // We need offset of 'owner'.
            // version(1) + last_update(8+8=16? No, LastUpdate is slot(u64)+stale(u8)=9 bytes + padding potentially).
            // Let's rely on filter by bytes at offset. 
            // Struct: {version:u8, last_update:LastUpdate, lending_market:Pubkey, owner:Pubkey...}
            // version: 1 byte
            // last_update: slot(8) + stale(1) = 9 bytes? Anchor might align.
            // lending_market: 32 bytes
            // owner: 32 bytes.

            // Filter is safer if we just fetch all for now in devnet.

            setLoading(true);
            // Accessing 'obligation' account namespace. Standard Anchor camelCase.
            // Cast program to any to bypass IDL type limitation
            const obligations = await (program as any).account.obligation.all([
                {
                    memcmp: {
                        offset: 8 + 1 + 9 + 32, // Discriminator(8) + Version(1) + LastUpdate(9ish) + LendingMarket(32)? This is risky guessing.
                        // Better to match the owner property if Anchor supports it cleanly.
                        // Actually, waiting.
                        // Let's just fetch all and filter in JS for prototype speed, unless list is huge.
                        bytes: publicKey.toBase58()
                    }
                }
            ]);

            // If memcmp fails, we'll try JS filter
            // Actually let's try JS filter to be safe against offset errors
        } catch (err) {
            // Fallback or error
        }

        // JS Filter approach for safety
        try {
            const allObligations = await program.account.obligation.all();
            const myObligation = allObligations.find((o: any) =>
                o.account.owner.toBase58() === publicKey.toBase58()
            );

            if (myObligation) {
                const data = myObligation.account;
                setObligation({
                    pubkey: myObligation.publicKey,
                    lendingMarket: data.lendingMarket,
                    owner: data.owner,
                    depositedValue: data.depositedValue,
                    borrowedValue: data.borrowedValue,
                    allowedBorrowValue: data.allowedBorrowValue,
                    unhealthyBorrowValue: data.unhealthyBorrowValue,
                    deposits: data.deposits,
                    borrows: data.borrows,
                });
            } else {
                setObligation(null);
            }

        } catch (e) {
            console.error("Error fetching obligation:", e);
        }
    }, [program, publicKey]);

    useEffect(() => {
        fetchReserves();
    }, [fetchReserves]);

    useEffect(() => {
        if (publicKey) {
            fetchObligation();
        } else {
            setObligation(null);
        }
    }, [fetchObligation, publicKey]);

    return {
        reserves,
        obligation,
        loading,
        fetchReserves,
        fetchObligation
    };
};
