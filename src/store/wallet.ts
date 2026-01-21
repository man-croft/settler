import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WalletState {
  // Ethereum
  ethAddress: string | null
  isEthConnected: boolean
  
  // Stacks
  stacksAddress: string | null
  isStacksConnected: boolean
  
  // Actions
  setEthWallet: (address: string | null) => void
  setStacksWallet: (address: string | null) => void
  disconnectEth: () => void
  disconnectStacks: () => void
  disconnectAll: () => void
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      // Initial state
      ethAddress: null,
      isEthConnected: false,
      stacksAddress: null,
      isStacksConnected: false,
      
      // Actions
      setEthWallet: (address) => set({ 
        ethAddress: address, 
        isEthConnected: !!address 
      }),
      
      setStacksWallet: (address) => set({ 
        stacksAddress: address, 
        isStacksConnected: !!address 
      }),
      
      disconnectEth: () => set({ 
        ethAddress: null, 
        isEthConnected: false 
      }),
      
      disconnectStacks: () => set({ 
        stacksAddress: null, 
        isStacksConnected: false 
      }),
      
      disconnectAll: () => set({ 
        ethAddress: null, 
        isEthConnected: false,
        stacksAddress: null, 
        isStacksConnected: false 
      }),
    }),
    {
      name: 'settler-wallet-storage',
    }
  )
)
