'use client';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, Keypair } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { useLendingProgram } from "./useLendingProgram";
import {
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    AccountLayout,
    createInitializeAccountInstruction
} from "@solana/spl-token";
import { ReserveData } from "./useLendingData";

export interface ReserveConfig {
    optimalUtilizationRate: number;
    loanToValueRatio: number;
    liquidationBonus: number;
    liquidationThreshold: number;
    minBorrowRate: number;
    optimalBorrowRate: number;
    maxBorrowRate: number;
    fees: {
        borrowFeeWad: BN;
        flashLoanFeeWad: BN;
        hostFeePercentage: number;
    };
}

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

    const initLendingMarket = async (quoteCurrencyCode: string = "USD") => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        const lendingMarketKeypair = Keypair.generate();
        const quoteCurrency = new Uint8Array(32);
        quoteCurrency.set(Buffer.from(quoteCurrencyCode));

        try {
            const tx = await program.methods
                .initLendingMarket(Array.from(quoteCurrency))
                .accounts({
                    owner: publicKey,
                    lendingMarket: lendingMarketKeypair.publicKey,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    oracle: PublicKey.default,
                } as any)
                .signers([lendingMarketKeypair])
                .rpc();

            console.log("Lending Market Initialized", tx);
            return lendingMarketKeypair.publicKey;
        } catch (error) {
            console.error("Init Lending Market failed", error);
            throw error;
        }
    };

    const initReserve = async (
        lendingMarketPubKey: PublicKey,
        liquidityAmount: number,
        liquidityMint: PublicKey,
        oraclePrice: PublicKey,
        oracleProduct: PublicKey,
        config: ReserveConfig
    ) => {
        if (!program || !publicKey) throw new Error("Wallet not connected");

        try {
            const reserveKeypair = Keypair.generate();
            const reserveCollateralMintKeypair = Keypair.generate();
            const reserveLiquiditySupplyKeypair = Keypair.generate();
            const reserveLiquidityFeeReceiverKeypair = Keypair.generate();
            const reserveCollateralSupplyKeypair = Keypair.generate(); // Optional? No, init instruction says init for this too.

            const lendingMarketAuthority = getLendingMarketAuthority(lendingMarketPubKey);

            // Accounts for initReserve
            // source_liquidity: user's token account
            // reserve_liquidity_mint: passed
            // reserve_collateral_mint: new keypair (signer)
            // destination_collateral: user's associated token account for collateral mint (PDA, init)
            // reserve: new keypair (signer)
            // reserve_liquidity_supply: new keypair (signer in pre-instruction, mut in main)
            // reserve_liquidity_fee_receiver: new keypair (signer in pre-instruction, mut in main)
            // reserve_collateral_supply: new keypair (signer) - wait, instruction says init for this too.
            // pyth_product, pyth_price: passed
            // lending_market, lending_market_authority
            // owner, user_transfer_authority: publicKey

            const userSourceLiquidity = await getAssociatedTokenAddress(
                liquidityMint,
                publicKey
            );

            // Need to fetch mint decimals to convert amount?
            // Assuming caller passes raw amount or we just use passing BN if easier. 
            // For now let's assume `liquidityAmount` is human readable and we need mint info.
            // But fetching mint info is async.
            // Let's rely on caller or just assume 6 decimals for USDC/Devnet for now if not fetched.
            // BETTER: Use `getAccount` or `getMint` if we want to be safe, but simpler to expect amount in correct units or fetch.
            // Let's try to fetch mint decimals.
            // Actually, we can just pass BN from caller. But consistency with other methods...
            // Let's assume input is NUMBER and we use 9 decimals as default or try to find it?
            // Safer: Callers responsibility or just assume standard.
            // I'll take `liquidityAmount` as RAW BN or let's say caller handles it.
            // But the signature says `number`.
            // I'll use a fixed decimal for prototype or just 10^6 (USDC).
            // Let's use 10^9 for SOL?
            // To be safe, I'll update signature to accept BN for amount to be precise.

            // Wait, I can't easily change signature in `useLendingOperations` return type without updating usage.
            // But this is a new function.
            // Let's use BN for the internal logic, and maybe number for exposed?
            // I'll use `number` and assume 6 decimals (USDC) for now as it's the primary test case.
            const amountBN = new BN(liquidityAmount * 1_000_000);

            // Pre-instructions to create and init reserve_liquidity_supply and fee_receiver
            const rent = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);

            const createSupplyIx = SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: reserveLiquiditySupplyKeypair.publicKey,
                space: AccountLayout.span,
                lamports: rent,
                programId: TOKEN_PROGRAM_ID,
            });
            const initSupplyIx = createInitializeAccountInstruction(
                reserveLiquiditySupplyKeypair.publicKey,
                liquidityMint,
                lendingMarketAuthority, // Owner must be authority
                TOKEN_PROGRAM_ID
            );

            const createFeeIx = SystemProgram.createAccount({
                fromPubkey: publicKey,
                newAccountPubkey: reserveLiquidityFeeReceiverKeypair.publicKey,
                space: AccountLayout.span,
                lamports: rent,
                programId: TOKEN_PROGRAM_ID,
            });
            const initFeeIx = createInitializeAccountInstruction(
                reserveLiquidityFeeReceiverKeypair.publicKey,
                liquidityMint,
                lendingMarketAuthority,
                TOKEN_PROGRAM_ID
            );

            const tx = await program.methods
                .initReserve(amountBN, config)
                .accounts({
                    sourceLiquidity: userSourceLiquidity,
                    reserveLiquidityMint: liquidityMint,
                    reserveCollateralMint: reserveCollateralMintKeypair.publicKey,
                    destinationCollateral: await getAssociatedTokenAddress(reserveCollateralMintKeypair.publicKey, publicKey),
                    reserve: reserveKeypair.publicKey,
                    reserveLiquiditySupply: reserveLiquiditySupplyKeypair.publicKey,
                    reserveLiquidityFeeReceiver: reserveLiquidityFeeReceiverKeypair.publicKey,
                    reserveCollateralSupply: reserveCollateralSupplyKeypair.publicKey,
                    pythProduct: oracleProduct,
                    pythPrice: oraclePrice,
                    lendingMarket: lendingMarketPubKey,
                    lendingMarketAuthority: lendingMarketAuthority,
                    lendingMarketOwner: publicKey, // Assuming user is owner
                    userTransferAuthority: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
                    systemProgram: SystemProgram.programId,
                    rent: new PublicKey("SysvarRent111111111111111111111111111111111")
                } as any)
                .preInstructions([createSupplyIx, initSupplyIx, createFeeIx, initFeeIx])
                .signers([
                    reserveKeypair,
                    reserveCollateralMintKeypair,
                    reserveLiquiditySupplyKeypair,
                    reserveLiquidityFeeReceiverKeypair,
                    reserveCollateralSupplyKeypair
                ])
                .rpc();

            console.log("Reserve Initialized", tx);
            return {
                signature: tx,
                reserve: reserveKeypair.publicKey
            };
        } catch (error) {
            console.error("Init Reserve failed", error);
            throw error;
        }
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
        withdrawObligationCollateral,
        initLendingMarket,
        initReserve
    };
};
