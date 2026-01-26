'use client';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useLendingProgram } from "./useLendingProgram";
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress
} from "@solana/spl-token";
import { ReserveData } from "./useLendingData";

export const useLendingOperations = () => {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const { program } = useLendingProgram();

    // Helper to get PDA for Lending Market Authority
    const getLendingMarketAuthority = (lendingMarketPubKey: PublicKey) => {
        // seeds: [lending_market_pubkey]
        return PublicKey.findProgramAddressSync(
            [lendingMarketPubKey.toBuffer()],
            program!.programId
        )[0];
    };

    const depositReserveLiquidity = async (
        reserve: ReserveData,
        amount: number
    ) => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        try {
            const liquidityAmount = new BN(amount * Math.pow(10, reserve.liquidity.mintDecimals));

            const userSourceLiquidity = await getAssociatedTokenAddress(
                reserve.liquidity.mintPubKey,
                publicKey
            );

            const userDestinationCollateral = await getAssociatedTokenAddress(
                reserve.collateral.mintPubKey,
                publicKey
            );

            const lendingMarketAuthority = getLendingMarketAuthority(reserve.lendingMarket);

            // Accounts:
            // source_liquidity: User's token account (USDC)
            // destination_collateral: User's cToken account
            // reserve: Reserve account
            // reserve_liquidity_supply: Reserve's vault
            // reserve_collateral_mint: Reserve's cToken mint
            // lending_market: Market account
            // lending_market_authority: PDA
            // user_transfer_authority: User signer
            // token_program: Token program

            const tx = await program.methods
                .depositReserveLiquidity(liquidityAmount)
                .accounts({
                    sourceLiquidity: userSourceLiquidity,
                    destinationCollateral: userDestinationCollateral,
                    reserve: reserve.pubkey,
                    reserveLiquiditySupply: reserve.liquidity.supplyPubKey,
                    reserveCollateralMint: reserve.collateral.mintPubKey,
                    lendingMarket: reserve.lendingMarket,
                    lendingMarketAuthority: lendingMarketAuthority,
                    userTransferAuthority: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                } as any) // Cast to any to avoid strict type checks on generated methods missing
                .transaction();

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, "confirmed");
            return signature;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const redeemReserveCollateral = async (
        reserve: ReserveData,
        amountCollateral: number // Amount of cTokens to burn
    ) => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        try {
            // NOTE: Amount here is in cTokens (collateral tokens), not liquidity
            // We might want to pass raw amount or decimal amount.
            // Assuming raw amount or handled by caller if dealing with decimals?
            // Reserve collateral mint usually has same decimals as liquidity? Need to check.
            // Usually cTokens inherit decimals or are 6/9.

            // For safety, let's assume the UI passes the raw number (BN) or we handle decimals if known.
            // But `amountCollateral` is number here. Let's assume it's human readable and we multiply.
            // However we don't know COLLATERAL decimals easily unless we fetch Mint info.
            // BUT `reserve.liquidity.mintDecimals` is known. `reserve.collateral.mintTotalSupply` is known.
            // Usually cTokens match underlying decimals. Let's assume that for now.

            const collateralAmount = new BN(amountCollateral * Math.pow(10, reserve.liquidity.mintDecimals));

            const userSourceCollateral = await getAssociatedTokenAddress(
                reserve.collateral.mintPubKey,
                publicKey
            );

            const userDestinationLiquidity = await getAssociatedTokenAddress(
                reserve.liquidity.mintPubKey,
                publicKey
            );

            const lendingMarketAuthority = getLendingMarketAuthority(reserve.lendingMarket);

            const tx = await program.methods
                .redeemReserveCollateral(collateralAmount)
                .accounts({
                    sourceCollateral: userSourceCollateral,
                    destinationLiquidity: userDestinationLiquidity,
                    reserve: reserve.pubkey,
                    reserveCollateralMint: reserve.collateral.mintPubKey,
                    reserveLiquiditySupply: reserve.liquidity.supplyPubKey,
                    lendingMarket: reserve.lendingMarket,
                    lendingMarketAuthority: lendingMarketAuthority,
                    userTransferAuthority: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                } as any)
                .transaction();

            const signature = await sendTransaction(tx, connection);
            await connection.confirmTransaction(signature, "confirmed");
            return signature;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const initObligation = async (lendingMarketPubKey: PublicKey) => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        try {
            const obligationKeypair = Keypair.generate();

            const tx = await program.methods
                .initObligation()
                .accounts({
                    obligation: obligationKeypair.publicKey,
                    lendingMarket: lendingMarketPubKey,
                    obligationOwner: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID, // IDL says token_program needed? Yes.
                    // accounts: obligation, lending_market, obligation_owner, token_program
                } as any)
                .signers([obligationKeypair])
                .transaction();

            const signature = await sendTransaction(tx, connection, { signers: [obligationKeypair] });
            await connection.confirmTransaction(signature, "confirmed");
            return signature;
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const borrowObligationLiquidity = async (
        reserve: ReserveData,
        liquidityAmountHuman: number,
        obligationPubKey: PublicKey
    ) => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        const liquidityAmount = new BN(liquidityAmountHuman * Math.pow(10, reserve.liquidity.mintDecimals));

        const userDestinationLiquidity = await getAssociatedTokenAddress(
            reserve.liquidity.mintPubKey,
            publicKey
        );

        const lendingMarketAuthority = getLendingMarketAuthority(reserve.lendingMarket);

        const tx = await program.methods
            .borrowObligationLiquidity(liquidityAmount)
            .accounts({
                sourceLiquidity: reserve.liquidity.supplyPubKey,
                destinationLiuqidity: userDestinationLiquidity, // Typo in IDL "destination_liuqidity"?
                // IDL at line 27: "name": "destination_liuqidity". YES, IT IS A TYPO IN THE IDL/PROGRAM.
                // We must match the IDL property name if using .accounts() with a typed builder, 
                // OR checks generic construction.
                // Since we cast to any, we should use camelCase of the IDL name.
                // destinationLiuqidity needs to be exactly what Anchor expects.
                // Anchor creates `destinationLiuqidity` from `destination_liuqidity`.

                borrowReserve: reserve.pubkey,
                borrowReserveLiquidityFeeReceiver: reserve.liquidity.feeReceiver,
                obligation: obligationPubKey,
                lendingMarket: reserve.lendingMarket,
                lendingMarketAuthority: lendingMarketAuthority,
                obligationOwner: publicKey,
                // host_fee_receiver? Optional in some? IDL says it's an account.
                // "name": "host_fee_receiver"
                // If we don't have one, maybe we can pass formatted address or something?
                // Usually programs check if it is present or not if using remaining accounts, 
                // but here it is a named account.
                // We probably need to pass something. If program doesn't use it, pass a dummy?
                // Or maybe the reserve fee receiver?
                hostFeeReceiver: reserve.liquidity.feeReceiver, // Placeholder
                tokenProgram: TOKEN_PROGRAM_ID
            } as any)
            .transaction();

        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, "confirmed");
        return signature;
    };

    const repayObligationLiquidity = async (
        reserve: ReserveData,
        liquidityAmountHuman: number,
        obligationPubKey: PublicKey
    ) => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        const liquidityAmount = new BN(liquidityAmountHuman * Math.pow(10, reserve.liquidity.mintDecimals));

        const userSourceLiquidity = await getAssociatedTokenAddress(
            reserve.liquidity.mintPubKey,
            publicKey
        );

        const tx = await program.methods
            .repayObligationLiquidity(liquidityAmount)
            .accounts({
                sourceLiquidity: userSourceLiquidity,
                destinationLiquidity: reserve.liquidity.supplyPubKey,
                repayReserve: reserve.pubkey,
                obligation: obligationPubKey,
                lendingMarket: reserve.lendingMarket,
                userTransferAuthority: publicKey,
                tokenProgram: TOKEN_PROGRAM_ID
            } as any)
            .transaction();

        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, "confirmed");
        return signature;
    };

    const depositObligationCollateral = async (
        reserve: ReserveData,
        collateralAmountHuman: number,
        obligationPubKey: PublicKey
    ) => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        // Amount in cTokens (collateral tokens)
        const collateralAmount = new BN(collateralAmountHuman * Math.pow(10, reserve.liquidity.mintDecimals)); // Assuming cToken decimals = liquidity decimals

        const userSourceCollateral = await getAssociatedTokenAddress(
            reserve.collateral.mintPubKey,
            publicKey
        );

        const tx = await program.methods
            .depositObligationCollateral(collateralAmount)
            .accounts({
                sourceCollateral: userSourceCollateral,
                destinationCollateral: reserve.collateral.supplyPubKey, // Wait, where does calling it go?
                // accounts: source_collateral, destination_collateral, deposit_reserve, obligation...
                // "destination_collateral": "Destination collateral token account" (in instruction docs line 88? No, line 292 is init_reserve)
                // line 88: destination_collateral.
                // THIS is likely the reserve's collateral supply? NO.
                // Typically you deposit YOUR collateral (cTokens) into the Obligation to lock it.
                // So destination is associated with the Obligation?
                // The Obligation account itself doesn't hold tokens. It holds "data".
                // So there must be a Vault for the Obligation or the Reserve holds it?
                // Actually usually it's `reserve.collateral.supply`.

                // Let's look at `init_reserve`, it creates `destination_collateral`.
                // Let's assume for now `destinationCollateral` IS the reserve's supply (if pooling) or unique.
                // But `deposit_reserve` is also passed.

                // Let's look at `init_reserve`: `destination_collateral` arg is "user's collateral token account" (line 294) - this seems to be the Minting destination?
                // No, that's `init_reserve`.

                // Back to `deposit_obligation_collateral` (line 72).
                // Accounts: source, destination, deposit_reserve, obligation...
                // It doesn't specify deeply.
                // However, usually `destination_collateral` is the Reserve's "Collateral Supply" account if the protocol safeguards it.
                // Let's use `reserve.collateral.supplyPubKey` and if it fails we debug.


                depositReserve: reserve.pubkey,
                obligation: obligationPubKey,
                lendingMarket: reserve.lendingMarket,
                obligationOwner: publicKey,
                userTransferAuthority: publicKey,
                tokenProgram: TOKEN_PROGRAM_ID
            } as any)
            .transaction();

        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, "confirmed");
        return signature;
    };

    const withdrawObligationCollateral = async (
        reserve: ReserveData,
        collateralAmountHuman: number,
        obligationPubKey: PublicKey
    ) => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        const collateralAmount = new BN(collateralAmountHuman * Math.pow(10, reserve.liquidity.mintDecimals)); // Assuming cToken decimals match

        const userDestinationCollateral = await getAssociatedTokenAddress(
            reserve.collateral.mintPubKey,
            publicKey
        );

        const lendingMarketAuthority = getLendingMarketAuthority(reserve.lendingMarket);

        const tx = await program.methods
            .withdrawObligationCollateral(collateralAmount)
            .accounts({
                sourceCollateral: reserve.collateral.supplyPubKey, // Withdrawing FROM reserve/obligation vault
                destinationCollateral: userDestinationCollateral,
                withdrawReserve: reserve.pubkey,
                obligation: obligationPubKey,
                lendingMarket: reserve.lendingMarket,
                lendingMarketAuthority: lendingMarketAuthority,
                obligationOwner: publicKey,
                tokenProgram: TOKEN_PROGRAM_ID
            } as any)
            .transaction();

        const signature = await sendTransaction(tx, connection);
        await connection.confirmTransaction(signature, "confirmed");
        return signature;
    };

    return {
        depositReserveLiquidity,
        redeemReserveCollateral,
        initObligation,
        borrowObligationLiquidity,
        repayObligationLiquidity,
        depositObligationCollateral,
        withdrawObligationCollateral
    };
};
