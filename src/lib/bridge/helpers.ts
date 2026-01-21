/**
 * Address encoding helpers for cross-chain bridging
 * Based on Circle xReserve official documentation
 * 
 * Remote recipient encoding format (32 bytes):
 * - 11 bytes: zero padding (left)
 * - 1 byte: version
 * - 20 bytes: hash160
 */
import * as P from 'micro-packed'
import { createAddress } from '@stacks/transactions'
import { c32address } from 'c32check'
import { hex } from '@scure/base'
import { type Hex, pad, toHex } from 'viem'

/**
 * Encode/decode Stacks address to bytes32 for Ethereum contracts
 * This is required for depositToRemote remoteRecipient parameter
 * 
 * Uses createAddress from @stacks/transactions to parse the address
 */
export const remoteRecipientCoder = P.wrap<string>({
  encodeStream(w, value: string) {
    // Parse address using @stacks/transactions
    const address = createAddress(value)
    // Left pad with 11 zero bytes
    P.bytes(11).encodeStream(w, new Uint8Array(11).fill(0))
    // 1 version byte
    P.U8.encodeStream(w, address.version)
    // 20 hash160 bytes
    P.bytes(20).encodeStream(w, hex.decode(address.hash160))
  },
  decodeStream(r) {
    // Skip left padding (11 zero bytes)
    P.bytes(11).decodeStream(r)
    // Read 1 version byte
    const version = P.U8.decodeStream(r)
    // Read 20 hash bytes
    const hashBytes = P.bytes(20).decodeStream(r)
    // Use c32address to reconstruct the address
    return c32address(version, hex.encode(hashBytes))
  },
})

/**
 * Convert bytes to bytes32 hex - matches official docs exactly
 */
export function bytes32FromBytes(bytes: Uint8Array): Hex {
  return toHex(pad(bytes, { size: 32 }))
}

/**
 * Convert Stacks address to bytes32 for Ethereum contracts
 * Used in depositToRemote as remoteRecipient
 * 
 * This is the value you use for remoteRecipient parameter
 */
export function stacksAddressToBytes32(stacksAddress: string): Hex {
  return bytes32FromBytes(remoteRecipientCoder.encode(stacksAddress))
}

/**
 * Decode bytes32 back to Stacks address
 */
export function bytes32ToStacksAddress(bytes32: Hex): string {
  const bytes = new Uint8Array(
    bytes32.slice(2).match(/.{2}/g)!.map(byte => parseInt(byte, 16))
  )
  return remoteRecipientCoder.decode(bytes)
}

/**
 * Pad Ethereum address to bytes32 for Stacks contracts
 * Used in usdcx-v1.burn as native-recipient
 * 
 * Format: left-pad 20-byte address to 32 bytes
 */
export function ethAddressToBytes32(ethAddress: string): Hex {
  return pad(ethAddress as Hex, { size: 32 })
}
