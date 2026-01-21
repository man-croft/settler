# Settler

> **Get paid in USDC on Ethereum. Settle in USDCx on Stacks. Earn Bitcoin-secured yield instantly.**

Settler is a decentralized cross-chain invoicing and treasury platform that bridges the gap between the Ethereum economy (where the liquidity is) and the Bitcoin/Stacks economy (where the security is).

![Settler Banner](./docs/banner.png)

## Features

### Serverless Smart Invoices
Create invoices encoded directly into shareable URLs. No centralized database, no signup friction. Just generate and share.

### Cross-Chain Bridge (Circle xReserve)
Leverages Circle's CCTP (Cross-Chain Transfer Protocol) to programmatically bridge USDC from Ethereum to USDCx on Stacks - and vice versa.

### Bi-Directional Identity
Full support for **BNS (.btc)** and **ENS (.eth)** name resolution. Never copy-paste a hex address again.

### Native Yield Integration
One-click deployment of settled USDCx into Stacks DeFi protocols (Zest Protocol, Bitflow, StackSwap) to earn Bitcoin-backed yield.

### Real-Time Tracking
Monitor your cross-chain transfers with live status updates from deposit to settlement.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui + Glassmorphism Design
- **Ethereum:** wagmi v2 + viem
- **Stacks:** @stacks/connect + @stacks/transactions
- **State:** Zustand with persistence
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask wallet (for Ethereum)
- Leather or Xverse wallet (for Stacks)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/settler.git
cd settler

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Optional: Custom RPC URL for Ethereum Sepolia
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Build for Production

```bash
npm run build
npm run preview
```

## Usage

### 1. Create an Invoice

1. Navigate to `/create`
2. Select bridge direction (ETH → STX or STX → ETH)
3. Enter amount and recipient address (or BNS/ENS name)
4. Add optional memo
5. Generate shareable invoice link

### 2. Pay an Invoice

1. Open the invoice link
2. Connect your wallet
3. Approve USDC spending (if needed)
4. Click "Pay Invoice"
5. Wait for bridge confirmation

### 3. Track Your Transfer

1. After payment, you're redirected to the tracking page
2. Monitor progress: Deposit → Bridging → Settled
3. View transaction hashes on block explorers

### 4. Manage Treasury

1. Navigate to `/treasury`
2. View cross-chain balances
3. Explore yield opportunities
4. Deploy USDCx into DeFi strategies

## Network Configuration

Settler operates on **testnets** for the hackathon:

| Network | Chain |
|---------|-------|
| Ethereum | Sepolia (Chain ID: 11155111) |
| Stacks | Testnet |

### Getting Testnet Tokens

- **Sepolia ETH:** [Google Cloud Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
- **Sepolia USDC:** [Circle Faucet](https://faucet.circle.com/)
- **Stacks Testnet STX:** [Hiro Faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│  Ethereum       │         │  Stacks         │
│  (USDC)         │         │  (USDCx)        │
│                 │         │                 │
└────────┬────────┘         └────────▲────────┘
         │                           │
         │    ┌─────────────────┐    │
         └───►│                 │────┘
              │  Circle xReserve│
              │  (CCTP Bridge)  │
              │                 │
              └─────────────────┘
```

### Invoice URL Schema

Invoices are Base64-encoded JSON in the URL:

```json
{
  "direction": "ETH_TO_STX",
  "amount": "100.00",
  "recipient": "ST1PQHQ...",
  "memo": "Q1 Design Work"
}
```

## Project Structure

```
settler/
├── src/
│   ├── components/
│   │   ├── layout/        # Layout components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/
│   │   ├── bridge/        # Bridge deposit logic
│   │   ├── constants.ts   # Network config
│   │   ├── identity.ts    # BNS/ENS resolution
│   │   ├── invoice.ts     # Invoice encoding
│   │   ├── utils.ts       # Helper functions
│   │   └── wagmi.ts       # Wagmi config
│   ├── pages/
│   │   ├── Home.tsx       # Landing page
│   │   ├── Create.tsx     # Invoice creation
│   │   ├── Pay.tsx        # Payment gateway
│   │   ├── Track.tsx      # Bridge tracking
│   │   └── Treasury.tsx   # Balance & yield
│   ├── store/
│   │   └── wallet.ts      # Zustand store
│   └── styles/
│       └── globals.css    # Global styles
├── public/
└── package.json
```

## Key Contracts

| Contract | Network | Address |
|----------|---------|---------|
| USDC | Sepolia | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| TokenMessenger | Sepolia | `0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5` |
| USDCx | Stacks Testnet | `ST1K3TQJ7K50MKB7EMP37R2XAEVBYZ3GCXPY8RKPV.usdcx` |

## Demo

[Live Demo](https://settler.vercel.app) *(Update with actual URL)*

### Screenshots

<details>
<summary>Click to expand screenshots</summary>

#### Home Page
![Home](./docs/screenshots/home.png)

#### Create Invoice
![Create](./docs/screenshots/create.png)

#### Pay Invoice
![Pay](./docs/screenshots/pay.png)

#### Track Transfer
![Track](./docs/screenshots/track.png)

#### Treasury
![Treasury](./docs/screenshots/treasury.png)

</details>

## Hackathon Submission

**Track:** Bitcoin DeFi / Cross-Chain Infrastructure

**Problem Solved:**
- Freelancers on Stacks struggle to get paid by clients holding Ethereum USDC
- Bridges are scary infrastructure tools, not consumer products
- Idle stablecoins on Stacks miss yield opportunities

**Innovation:**
- First "Stripe-like" invoicing for Bitcoin L2
- Abstracts bridge complexity into a simple payment link
- Integrates yield strategies for settled funds

## Roadmap

- [ ] Mainnet deployment
- [ ] Real DeFi integrations (Zest, Bitflow, ALEX)
- [ ] Invoice templates and recurring payments
- [ ] Multi-token support
- [ ] Mobile app

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [Circle](https://circle.com) - CCTP/xReserve infrastructure
- [Stacks](https://stacks.co) - Bitcoin L2
- [Hiro](https://hiro.so) - Developer tools
- [shadcn/ui](https://ui.shadcn.com) - UI components

---

**Built with love for the Bitcoin economy.**
