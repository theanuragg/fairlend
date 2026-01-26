import { PublicKey } from "@solana/web3.js";

export interface OracleMapping {
    price: PublicKey;
    product: PublicKey;
}

/**
 * Pyth Oracle constants for Solana Devnet.
 * Addresses for Mainnet and other assets can be found at: 
 * https://pyth.network/developers/price-feed-ids#solana-devnet
 */
export const PYTH_ORACLES_DEVNET: Record<string, OracleMapping> = {
    SOL: {
        price: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"), // SOL/USD Devnet
        product: new PublicKey("ALP8SdU9oARYVLgLR7LrqMNCYBnhtnQz1cj6bwgwQmgj"), // SOL Product
    },
    USDC: {
        price: new PublicKey("5SSkXsEKQepHHAewytPVwdwJq4dLHMWhXD8DsaryypaG"), // USDC/USD Devnet
        product: new PublicKey("8GWTTbNiXdmyZREXbjsZBmCRuzdPrW55dnZGDkTRjWvb"), // USDC Product
    },
    BTC: {
        price: new PublicKey("HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"), // BTC/USD Devnet
        product: new PublicKey("4aDoSXJ5o3AuvL7QFeR6h44jALQfTmUUCTVGDD6aoJTM"), // BTC Product
    },
    ETH: {
        price: new PublicKey("EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw"), // ETH/USD Devnet
        product: new PublicKey("EMkxjGC1CQ7JLiutDbfYb7UKb3zm9SJcUmr1YicBsdpZ"), // ETH Product
    }
};

/**
 * Helper to get oracle mapping by symbol.
 */
export const getOracleBySymbol = (symbol: string): OracleMapping | undefined => {
    return PYTH_ORACLES_DEVNET[symbol.toUpperCase()];
};