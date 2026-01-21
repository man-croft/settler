import { TESTNET } from './constants'
import { isBnsName, isEnsName } from './utils'
import { normalize } from 'viem/ens'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

/**
 * Resolve BNS (.btc) name to Stacks address
 */
export async function resolveBnsName(bnsName: string): Promise<string | null> {
  try {
    const response = await fetch(`${TESTNET.stacks.apiUrl}/v1/names/${bnsName}`)
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data.address || null
  } catch (error) {
    console.error('BNS resolution error:', error)
    return null
  }
}

/**
 * Resolve ENS (.eth) name to Ethereum address
 * Note: ENS resolution always happens on mainnet regardless of target network
 */
export async function resolveEnsName(ensName: string): Promise<string | null> {
  try {
    // Create mainnet client for ENS resolution
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })
    
    const address = await publicClient.getEnsAddress({
      name: normalize(ensName),
    })
    
    return address || null
  } catch (error) {
    console.error('ENS resolution error:', error)
    return null
  }
}

/**
 * Resolve any name (BNS or ENS) to address
 */
export async function resolveName(name: string): Promise<string | null> {
  if (isBnsName(name)) {
    return resolveBnsName(name)
  }
  
  if (isEnsName(name)) {
    return resolveEnsName(name)
  }
  
  // Not a recognized name format
  return null
}

/**
 * Resolve recipient input to address
 * Returns the input if it's already an address, or resolves if it's a name
 */
export async function resolveRecipient(
  input: string,
  expectedType: 'stacks' | 'ethereum'
): Promise<{ address: string | null; error?: string }> {
  const trimmed = input.trim()
  
  // Check if it's a name that needs resolution
  if (isBnsName(trimmed)) {
    if (expectedType !== 'stacks') {
      return { 
        address: null, 
        error: 'BNS names (.btc) can only be used for Stacks recipients' 
      }
    }
    
    const address = await resolveBnsName(trimmed)
    if (!address) {
      return { 
        address: null, 
        error: `Could not resolve BNS name: ${trimmed}` 
      }
    }
    
    return { address }
  }
  
  if (isEnsName(trimmed)) {
    if (expectedType !== 'ethereum') {
      return { 
        address: null, 
        error: 'ENS names (.eth) can only be used for Ethereum recipients' 
      }
    }
    
    const address = await resolveEnsName(trimmed)
    if (!address) {
      return { 
        address: null, 
        error: `Could not resolve ENS name: ${trimmed}` 
      }
    }
    
    return { address }
  }
  
  // Already an address, return as-is
  return { address: trimmed }
}
