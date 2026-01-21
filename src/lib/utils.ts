import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format amount with decimals for display
 */
export function formatAmount(amount: string | number, decimals = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  })
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length < chars * 2 + 3) return address
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Validate Stacks testnet address
 */
export function isValidStacksTestnetAddress(address: string): boolean {
  return address.startsWith('ST') && address.length >= 39
}

/**
 * Validate Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Check if string is a BNS name
 */
export function isBnsName(name: string): boolean {
  return name.endsWith('.btc')
}

/**
 * Check if string is an ENS name
 */
export function isEnsName(name: string): boolean {
  return name.endsWith('.eth')
}
