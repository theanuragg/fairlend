# FairLend: Reputation-Gated P2P Lending on Solana

![FairLend Banner](https://img.shields.io/badge/Solana-Devnet-blueviolet) ![Built with Anchor](https://img.shields.io/badge/Anchor-v0.32-orange) ![Next.js](https://img.shields.io/badge/Next.js-16-black)

> **Undercollateralized lending powered by FairScale reputation scores** 

FairLend is a trust-based P2P lending protocol on Solana that uses FairScale's on-chain reputation scoring to dynamically adjust lending terms. Higher FairScores unlock better loan amounts and lower interest rates, reducing default risk while rewarding active, trustworthy participants in the Solana ecosystem.

**Built for the FairScale Challenge** | [Demo Video](#) | [Live App](#)

---

## 🎯 Core Innovation: FairScore Integration

FairLend meaningfully integrates FairScale's reputation API as the **primary risk primitive**:

### Tier-Based Lending System

| Tier | FairScore Range | Loan Multiplier | Interest Rate | Status |
|------|----------------|-----------------|---------------|--------|
| 🥇 **Gold** | 800+ | **2x** | **5% APR** | ✅ Approved |
| 🥈 **Silver** | 400-800 | **1.5x** | **10% APR** | ✅ Approved |
| 🥉 **Bronze** | < 400 | N/A | N/A | ❌ Denied |

### How It Works

1. **Wallet Connection**: User connects Phantom/Solflare wallet
2. **FairScore Fetch**: Backend API proxies FairScale API to retrieve score
3. **Dynamic Terms**: UI displays tier, multiplier, and interest rate
4. **On-Chain Enforcement**: Anchor program validates score >= 400, applies multipliers
5. **Loan Execution**: USDC transferred from pool to borrower with PDA-based escrow
6. **Repayment**: Interest calculated on-chain (amount × rate × days / 365)

**Key Differentiator**: FairScore isn't just UI decoration—it's enforced **on-chain** in the smart contract, preventing low-score loans at the protocol level.

---

## 🏗️ Architecture

```
┌─────────────────┐
│   User Wallet   │ (Phantom, Solflare)
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         v                  v
┌────────────────┐  ┌─────────────────────┐
│  Next.js App   │  │  FairScale API      │
│  (Frontend)    │◄─┤  (Reputation Score) │
└───────┬────────┘  └─────────────────────┘
        │
        │ RPC Calls
        v
┌─────────────────────────────┐
│   Solana Blockchain         │
│  (Devnet)                   │
│                             │
│  ┌────────────────────┐     │
│  │ FairLend Program   │     │
│  │  - Pool PDA        │     │
│  │  - Loan PDAs       │     │
│  │  - FairScore Logic │     │
│  └──────────┬─────────┘     │
│             │               │
│             v               │
│  ┌────────────────────┐     │
│  │ SPL Token Program  │     │
│  │  (USDC Transfers)  │     │
│  └────────────────────┘     │
└─────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Rust 1.93+ and Cargo
- Solana CLI 1.18+
- Anchor CLI 0.32+
- Phantom or Solflare wallet (with Devnet SOL)
- FairScale API key (get it [here](https://forms.gle/heG1hfnjao4VShUS8))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/fairlend-prototype.git
cd fairlend-prototype

# Install Anchor program dependencies
cd program/fairlend
anchor build

# Install frontend dependencies
cd ../../frontend
npm install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local and add your FairScale API key
```

### Configuration

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=<your_deployed_program_id>
FAIRSCALE_API_KEY=<your_fairscale_api_key>
```

### Deploy Smart Contract

```bash
cd program/fairlend

# Set Solana to devnet
solana config set --url devnet

# Airdrop SOL for deployment (if needed)
solana airdrop 2

# Build and deploy
anchor build
anchor deploy

# Copy the program ID and update .env.local
```

### Run Frontend

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` and connect your wallet!

---

## 📁 Project Structure

```
fairlend-prototype/
├── program/
│   └── fairlend/
│       ├── programs/fairlend/src/
│       │   └── lib.rs              # Anchor smart contract
│       ├── tests/                   # Anchor tests
│       ├── Anchor.toml              # Anchor config (devnet)
│       └── Cargo.toml
│
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── getFairScore/route.ts    # FairScale API proxy
│   │   │   └── getWalletScore/route.ts  # Detailed signals
│   │   ├── loan/page.tsx                 # Loan request page
│   │   ├── repay/page.tsx                # Loan repayment page
│   │   ├── lender/page.tsx               # Lender deposit page
│   │   ├── layout.tsx                    # Root layout with wallet provider
│   │   └── page.tsx                      # Dashboard
│   ├── components/
│   │   └── WalletContextProvider.tsx # Solana wallet adapter
│   ├── .env.local                    # Environment config
│   └── package.json
│
└── README.md
```

---

## 🔧 Smart Contract Details

### Program Instructions

#### `initialize_pool`
- **Purpose**: One-time setup of lending pool
- **Accounts**: Pool PDA, authority
- **Logic**: Creates pool account with bump seed

#### `deposit_to_pool`
- **Purpose**: Lenders deposit USDC to earn yield
- **Accounts**: Pool, lender token account, pool token account
- **Logic**: Transfers USDC to pool, updates total_deposited

#### `request_loan`
- **Purpose**: Borrowers request loans with FairScore validation
- **Accounts**: Pool, borrower, loan PDA, token accounts
- **Parameters**: `amount` (requested), `fairscore` (from API)
- **Logic**:
  1. Validate `fairscore >= 400` (on-chain check)
  2. Calculate multiplier: 2x (score >= 800) or 1.5x (score >= 400)
  3. Calculate interest rate: 5% (Gold) or 10% (Silver)
  4. Check pool liquidity
  5. Transfer adjusted amount using PDA signer
  6. Create Loan account to track state

#### `repay_loan`
- **Purpose**: Borrowers repay principal + interest
- **Accounts**: Pool, borrower, loan PDA, token accounts
- **Logic**:
  1. Calculate interest: `amount × rate × days / 365`
  2. Transfer total_repayment to pool
  3. Mark loan as repaid
  4. Update pool state

### Account Structures

```rust
#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub bump: u8,
    pub total_deposited: u64,
    pub total_loaned: u64,
}

#[account]
pub struct Loan {
    pub borrower: Pubkey,
    pub amount: u64,
    pub start_time: i64,
    pub interest_rate: u8,  // 5 or 10
    pub fairscore: u64,
    pub is_repaid: bool,
    pub bump: u8,
}
```

### Error Codes

- `LowFairScore`: Score below 400 minimum
- `InsufficientPoolFunds`: Not enough liquidity
- `LoanAlreadyRepaid`: Duplicate repayment attempt
- `InvalidAmount`: Amount <= 0

---

## 🎨 Frontend Features

### Dashboard (`/`)
- Wallet connection via Solana Wallet Adapter
- Real-time FairScore display with tier badge
- Dynamic color-coding (Gold/Silver/Bronze)
- Navigation cards to loan/repay/lender panels
- Glassmorphism UI with gradient backgrounds

### Loan Request (`/loan`)
- FairScore-based term preview
- Live calculation of adjusted amount
- Tier benefits explanation
- Transaction status tracking
- Solana Explorer links (coming soon)

### Repayment (`/repay`)
- Active loan details
- Real-time interest accrual calculation
- Days borrowed counter
- One-click repayment
- Educational tooltips

### Lender Panel (`/lender`)
- Pool statistics (size, utilization, APY)
- User position tracking
- Estimated earnings calculator
- Deposit interface
- Yield breakdown

### API Routes

**`/api/getFairScore?wallet=<address>`**
- Proxies FairScale main score API
- Hides API key from client
- Returns: `{ fairscore: number }`

**`/api/getWalletScore?wallet=<address>`**
- Fetches detailed wallet signals
- Used for badge explanations
- Returns: Activity breakdown (trades, socials, etc.)

---

## 🧪 Testing

### Anchor Tests (Smart Contract)

```bash
cd program/fairlend
anchor test
```

**Test Coverage**:
- ✅ Pool initialization
- ✅ Lender deposits
- ✅ Loan requests with various FairScores (>800, 400-800, <400)
- ✅ Multiplier calculations
- ✅ Interest rate assignments
- ✅ Repayment with interest
- ✅ Error cases (low score, insufficient funds)

### Manual Testing Checklist

1. **Wallet Connection**
   - [ ] Connect Phantom wallet on devnet
   - [ ] View FairScore on dashboard
   - [ ] See correct tier badge (Gold/Silver/Bronze)

2. **Loan Flow**
   - [ ] Navigate to `/loan`
   - [ ] Enter loan amount
   - [ ] See adjusted amount based on tier
   - [ ] Submit transaction (demo mode shows success)
   - [ ] Verify transaction on Solana Explorer

3. **Repayment Flow**
   - [ ] Navigate to `/repay`
   - [ ] View active loan details
   - [ ] See interest calculation
   - [ ] Complete repayment

4. **Lender Flow**
   - [ ] Navigate to `/lender`
   - [ ] View pool statistics
   - [ ] Deposit USDC to pool
   - [ ] See updated position

---

## 🔐 Security Considerations

### Current Implementation (Prototype)
- ✅ FairScore validated on-chain (prevents tampering)
- ✅ PDA-based escrow (no authority risks)
- ✅ API key hidden from client (Next.js API routes)
- ✅ Checked arithmetic (no overflows)
- ⚠️ **Demo mode**: No real USDC transfers yet (requires token setup)

### Production Recommendations
- 🔒 Implement oracle for real-time FairScore updates
- 🔒 Add multisig for pool authority
- 🔒 Conduct full smart contract audit
- 🔒 Implement liquidation mechanism for score drops
- 🔒 Add rate limiting to API routes (10 req/min per IP)
- 🔒 Use verifiable FairScore proofs (if FairScale supports)

---

## 🎯 FairScale Challenge Submission

### How FairScale is Integrated

1. **Risk Primitive**: FairScore is the **core** risk assessment tool, replacing traditional collateral requirements
2. **Dynamic Terms**: Loan amounts and interest rates automatically adjust based on score
3. **On-Chain Enforcement**: Smart contract validates scores, not just UI display
4. **User Education**: UI explains how on-chain activity (trades, social links) affects terms
5. **Continuous Impact**: Repaying loans on time improves FairScore for future larger loans

### Real-World Value

- **Borrowers**: Access capital without locking up assets, better terms for good behavior
- **Lenders**: Lower default risk via reputation gating, transparent APY
- **Ecosystem**: Incentivizes positive on-chain activity, builds trust on Solana

### Metrics for Success

- FairScore distribution of borrowers
- Default rates by tier (expect Gold < Silver < Bronze denial)
- Avg loan size increase for repeat borrowers with improving scores
- Pool utilization vs. interest rate correlation

---

## 📊 Future Enhancements

### Phase 2: Production MVP
- [ ] Deploy to mainnet
- [ ] Integrate with Marginfi or Solend for real liquidity
- [ ] Add liquidation triggers for score drops
- [ ] Implement governance token (FAIR)

### Phase 3: Advanced Features
- [ ] Multi-token support (SOL, USDT, RAY)
- [ ] Credit limits based on historical repayment
- [ ] Referral system (lenders refer borrowers)
- [ ] Mobile app (React Native)

### Phase 4: Ecosystem Integration
- [ ] NFT collateral boost (Tensor/Magic Eden)
- [ ] DeFi reputation aggregation (FairScale + other protocols)
- [ ] Cross-chain bridges (Wormhole)

---

## 🛠️ Troubleshooting

### Common Issues

**Anchor build fails with `edition2024` error**
```bash
# Solution: Update Rust to latest nightly
rustup update nightly
rustup override set nightly
anchor build
```

**Wallet won't connect**
- Ensure you're on Solana devnet
- Check wallet has devnet SOL (use faucet)
- Clear browser cache

**FairScore shows "Failed to fetch"**
- Verify `FAIRSCALE_API_KEY` in `.env.local`
- Check API key is valid (test in Postman)
- Ensure Next.js dev server is running

**Transaction fails**
- Currently in demo mode—connect to deployed program for real txs
- Check wallet has sufficient SOL for gas
- Verify program is deployed to devnet

---

## 👥 Contributing

This is a prototype for the FairScale Challenge. For production use:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - feel free to use this as a template for your own reputation-based lending protocols!

---

## 🙏 Acknowledgments

- **FairScale** for the reputation API and challenge inspiration
- **Solana Foundation** for the blazing-fast blockchain
- **Anchor** for making Solana development accessible
- **Phantom & Solflare** for seamless wallet experiences

---

## 📞 Contact

Built by [Your Name]
- Twitter: [@yourhandle](#)
- Discord: yourhandle#1234
- Email: your.email@example.com

**Submission Date**: January 2026
**Challenge**: FairScale Developer Challenge

---

*FairLend: Where reputation meets opportunity* 🚀
