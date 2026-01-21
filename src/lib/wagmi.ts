import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http, fallback } from 'wagmi'
import { sepolia } from 'wagmi/chains'

// Get WalletConnect project ID from environment (required for production)
// Get a free project ID at: https://cloud.walletconnect.com/
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// RPC URLs - use multiple for fallback reliability
const rpcUrl = import.meta.env.VITE_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'
const publicRpc = 'https://ethereum-sepolia-rpc.publicnode.com'

export const wagmiConfig = getDefaultConfig({
  appName: 'Settler',
  projectId: projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: fallback([
      http(rpcUrl, {
        timeout: 30_000,
        retryCount: 2,
        retryDelay: 1000,
      }),
      http(publicRpc, {
        timeout: 30_000,
        retryCount: 2,
        retryDelay: 1000,
      }),
    ]),
  },
  ssr: false,
})
