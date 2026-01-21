/**
 * ETH → STX: Deposit USDC to mint USDCx
 * Uses Circle xReserve depositToRemote function
 */
import { parseUnits, type PublicClient } from 'viem'
import { sepolia } from 'viem/chains'
import { TESTNET, X_RESERVE_ABI, ERC20_ABI } from '../constants'
import { stacksAddressToBytes32 } from './helpers'

export interface DepositParams {
  amount: string          // USDC amount (human readable, e.g. "10.00")
  stacksRecipient: string // Stacks address to receive USDCx
  walletClient: any       // Viem WalletClient
  publicClient: PublicClient
}

export interface DepositResult {
  approveTxHash?: `0x${string}`
  depositTxHash: `0x${string}`
  hookData: `0x${string}` // Unique identifier for tracking mint on Stacks
}

/**
 * Generate a unique hookData identifier for tracking the deposit
 * Format: 0x + timestamp (8 hex chars) + random (24 hex chars) = 32 bytes
 */
export function generateHookData(): `0x${string}` {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0')
  const randomBytes = new Uint8Array(12)
  crypto.getRandomValues(randomBytes)
  const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `0x${timestamp}${randomHex}` as `0x${string}`
}

/**
 * Check USDC balance on Ethereum
 */
export async function getUsdcBalance(
  publicClient: PublicClient,
  address: `0x${string}`
): Promise<bigint> {
  return publicClient.readContract({
    address: TESTNET.ethereum.usdc,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  }) as Promise<bigint>
}

/**
 * Check current USDC allowance for xReserve
 */
export async function getUsdcAllowance(
  publicClient: PublicClient,
  owner: `0x${string}`
): Promise<bigint> {
  return publicClient.readContract({
    address: TESTNET.ethereum.usdc,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, TESTNET.ethereum.xReserve],
  }) as Promise<bigint>
}

/**
 * Approve xReserve to spend USDC
 */
export async function approveUsdc(
  walletClient: any,
  amount: string
): Promise<`0x${string}`> {
  const value = parseUnits(amount, 6) // USDC has 6 decimals
  
  const hash = await walletClient.writeContract({
    chain: sepolia,
    address: TESTNET.ethereum.usdc,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [TESTNET.ethereum.xReserve, value],
  })
  
  return hash
}

/**
 * Execute depositToRemote on xReserve
 * This burns USDC on Ethereum and the attestation service mints USDCx on Stacks
 */
export async function depositToStacks(
  walletClient: any,
  amount: string,
  stacksRecipient: string,
  hookData: `0x${string}`
): Promise<`0x${string}`> {
  const value = parseUnits(amount, 6)
  const remoteRecipient = stacksAddressToBytes32(stacksRecipient)
  
  const hash = await walletClient.writeContract({
    chain: sepolia,
    address: TESTNET.ethereum.xReserve,
    abi: X_RESERVE_ABI,
    functionName: 'depositToRemote',
    args: [
      value,
      TESTNET.domains.STACKS,
      remoteRecipient,
      TESTNET.ethereum.usdc,
      0n, // maxFee
      hookData, // Unique identifier for tracking
    ],
  })
  
  return hash
}

/**
 * Full deposit flow: check allowance, approve if needed, then deposit
 */
export async function executeDeposit(params: DepositParams): Promise<DepositResult> {
  const { amount, stacksRecipient, walletClient, publicClient } = params
  const value = parseUnits(amount, 6)
  
  // Get the wallet address
  const [address] = await walletClient.getAddresses()
  
  // Check current allowance
  const allowance = await getUsdcAllowance(publicClient, address)
  
  let approveTxHash: `0x${string}` | undefined
  
  // Approve if needed
  if (allowance < value) {
    approveTxHash = await approveUsdc(walletClient, amount)
    // Wait for approval to be confirmed
    await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
  }
  
  // Generate unique hookData for tracking this deposit
  const hookData = generateHookData()
  
  // Execute deposit with hookData
  const depositTxHash = await depositToStacks(walletClient, amount, stacksRecipient, hookData)
  
  return {
    approveTxHash,
    depositTxHash,
    hookData,
  }
}
