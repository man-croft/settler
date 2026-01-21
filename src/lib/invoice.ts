import type { BridgeDirection } from './constants'

export interface Invoice {
  recipient: string       // STX address (ETH→STX) or ETH address (STX→ETH)
  amount: string          // Amount in USDC/USDCx (6 decimals)
  memo: string            // Description
  direction: BridgeDirection
  timestamp: number
}

interface EncodedInvoice {
  r: string  // recipient
  a: string  // amount
  m: string  // memo
  d: BridgeDirection  // direction
  t: number  // timestamp
}

/**
 * Encode invoice to Base64 URL parameter
 */
export function encodeInvoice(invoice: Invoice): string {
  const encoded: EncodedInvoice = {
    r: invoice.recipient,
    a: invoice.amount,
    m: invoice.memo,
    d: invoice.direction,
    t: invoice.timestamp,
  }
  return btoa(JSON.stringify(encoded))
}

/**
 * Decode invoice from Base64 URL parameter
 */
export function decodeInvoice(encoded: string): Invoice | null {
  try {
    const json: EncodedInvoice = JSON.parse(atob(encoded))
    return {
      recipient: json.r,
      amount: json.a,
      memo: json.m,
      direction: json.d,
      timestamp: json.t,
    }
  } catch {
    return null
  }
}

/**
 * Generate shareable invoice URL
 */
export function getInvoiceUrl(invoice: Invoice): string {
  const encoded = encodeInvoice(invoice)
  return `${window.location.origin}/pay?inv=${encoded}`
}

/**
 * Validate recipient address based on direction
 */
export function validateRecipient(recipient: string, direction: BridgeDirection): boolean {
  if (direction === 'ETH_TO_STX') {
    // Must be Stacks testnet address (ST...) or BNS name (*.btc)
    return recipient.startsWith('ST') || recipient.endsWith('.btc')
  } else {
    // Must be Ethereum address (0x...) or ENS name (*.eth)
    return recipient.startsWith('0x') || recipient.endsWith('.eth')
  }
}

/**
 * Get recipient placeholder based on direction
 */
export function getRecipientPlaceholder(direction: BridgeDirection): string {
  if (direction === 'ETH_TO_STX') {
    return 'ST... or name.btc'
  }
  return '0x... or name.eth'
}

/**
 * Get direction label
 */
export function getDirectionLabel(direction: BridgeDirection): string {
  if (direction === 'ETH_TO_STX') {
    return 'USDC (Ethereum) → USDCx (Stacks)'
  }
  return 'USDCx (Stacks) → USDC (Ethereum)'
}
