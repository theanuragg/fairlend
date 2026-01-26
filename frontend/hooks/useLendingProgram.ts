'use client';

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, Idl, setProvider } from "@coral-xyz/anchor";
import { useMemo } from "react";
import idl from "../idl/lending_anchor.json";

const PROGRAM_ID = idl.address;

export const useLendingProgram = () => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();

    const program = useMemo(() => {
        if (!wallet) return null;

        const provider = new AnchorProvider(connection, wallet, {
            preflightCommitment: "processed",
        });
        setProvider(provider);

        // Cast idl to unknown then Idl to avoid type instantiation issues if JSON is strict
        return new Program(idl as unknown as Idl, provider);
    }, [connection, wallet]);

    return { program, programId: PROGRAM_ID };
};
