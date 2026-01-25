use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("5A3q18mkFPkm4LCcgj6YRHp7CkE8v4aCqvQzzFH67rV8");

#[program]
pub mod fairlend {
    use super::*;

    /// Initialize the lending pool (one-time setup)
    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.bump = ctx.bumps.pool;
        pool.total_deposited = 0;
        pool.total_loaned = 0;

        msg!("Pool initialized by authority: {}", pool.authority);
        Ok(())
    }

    /// Lenders deposit USDC to the pool
    pub fn deposit_to_pool(ctx: Context<DepositToPool>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer tokens from lender to pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.lender_token_account.to_account_info(),
            to: ctx.accounts.pool_token_account.to_account_info(),
            authority: ctx.accounts.lender.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update pool state
        let pool = &mut ctx.accounts.pool;
        pool.total_deposited = pool.total_deposited.checked_add(amount).unwrap();

        msg!(
            "Deposited {} tokens to pool. Total: {}",
            amount,
            pool.total_deposited
        );
        Ok(())
    }

    /// Borrowers request loans with FairScore validation
    pub fn request_loan(ctx: Context<RequestLoan>, amount: u64, fairscore: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // FairScore gating: Minimum score of 400 required
        require!(fairscore >= 400, ErrorCode::LowFairScore);

        // Calculate tier-based multiplier and interest rate
        let (multiplier, interest_rate) = if fairscore >= 800 {
            // Gold tier: 2x amount, 5% APR
            (200, 5) // 200 = 2.00x (basis points)
        } else if fairscore >= 400 {
            // Silver tier: 1.5x amount, 10% APR
            (150, 10)
        } else {
            // This should never execute due to require! above
            return Err(ErrorCode::LowFairScore.into());
        };

        // Calculate adjusted loan amount based on FairScore
        let adjusted_amount = amount
            .checked_mul(multiplier)
            .unwrap()
            .checked_div(100)
            .unwrap();

        // Check pool has sufficient funds
        let pool = &ctx.accounts.pool;
        let available = pool.total_deposited.checked_sub(pool.total_loaned).unwrap();
        require!(
            available >= adjusted_amount,
            ErrorCode::InsufficientPoolFunds
        );

        // Transfer from pool to borrower using PDA signer
        let authority_seeds = &[b"pool".as_ref(), &[ctx.accounts.pool.bump]];
        let signer = &[&authority_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_token_account.to_account_info(),
            to: ctx.accounts.borrower_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, adjusted_amount)?;

        // Initialize loan account
        let loan = &mut ctx.accounts.loan;
        loan.borrower = ctx.accounts.borrower.key();
        loan.amount = adjusted_amount;
        loan.start_time = Clock::get()?.unix_timestamp;
        loan.interest_rate = interest_rate;
        loan.fairscore = fairscore;
        loan.is_repaid = false;
        loan.bump = ctx.bumps.loan;

        // Update pool state
        let pool = &mut ctx.accounts.pool;
        pool.total_loaned = pool.total_loaned.checked_add(adjusted_amount).unwrap();

        msg!(
            "Loan approved: {} tokens at {}% APR (FairScore: {}, Tier: {})",
            adjusted_amount,
            interest_rate,
            fairscore,
            if fairscore >= 800 { "Gold" } else { "Silver" }
        );

        Ok(())
    }

    /// Borrowers repay loans with interest
    pub fn repay_loan(ctx: Context<RepayLoan>) -> Result<()> {
        let loan = &ctx.accounts.loan;
        require!(!loan.is_repaid, ErrorCode::LoanAlreadyRepaid);

        // Calculate interest: amount * rate * days / 365
        let current_time = Clock::get()?.unix_timestamp;
        let elapsed_days = (current_time - loan.start_time) / 86400; // seconds per day

        let interest = loan
            .amount
            .checked_mul(loan.interest_rate as u64)
            .unwrap()
            .checked_mul(elapsed_days as u64)
            .unwrap()
            .checked_div(365)
            .unwrap()
            .checked_div(100)
            .unwrap(); // Divide by 100 for percentage

        let total_repayment = loan.amount.checked_add(interest).unwrap();

        // Transfer repayment from borrower to pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.borrower_token_account.to_account_info(),
            to: ctx.accounts.pool_token_account.to_account_info(),
            authority: ctx.accounts.borrower.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, total_repayment)?;

        // Update loan state
        let loan = &mut ctx.accounts.loan;
        loan.is_repaid = true;

        // Update pool state
        let pool = &mut ctx.accounts.pool;
        pool.total_loaned = pool.total_loaned.checked_sub(loan.amount).unwrap();

        msg!(
            "Loan repaid: {} principal + {} interest = {} total",
            loan.amount,
            interest,
            total_repayment
        );

        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToPool<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(mut)]
    pub lender_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RequestLoan<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        init,
        payer = borrower,
        space = 8 + Loan::INIT_SPACE,
        seeds = [b"loan", borrower.key().as_ref()],
        bump
    )]
    pub loan: Account<'info, Loan>,

    #[account(mut)]
    pub borrower_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RepayLoan<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(
        mut,
        seeds = [b"loan", borrower.key().as_ref()],
        bump = loan.bump,
    )]
    pub loan: Account<'info, Loan>,

    #[account(mut)]
    pub borrower_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ============================================================================
// State Accounts
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub authority: Pubkey,
    pub bump: u8,
    pub total_deposited: u64,
    pub total_loaned: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Loan {
    pub borrower: Pubkey,
    pub amount: u64,
    pub start_time: i64,
    pub interest_rate: u8, // APR as percentage (5, 10, etc.)
    pub fairscore: u64,
    pub is_repaid: bool,
    pub bump: u8,
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("FairScore too low. Minimum score of 400 required.")]
    LowFairScore,

    #[msg("Pool does not have sufficient funds for this loan.")]
    InsufficientPoolFunds,

    #[msg("Loan has already been repaid.")]
    LoanAlreadyRepaid,

    #[msg("Invalid amount. Must be greater than 0.")]
    InvalidAmount,
}
