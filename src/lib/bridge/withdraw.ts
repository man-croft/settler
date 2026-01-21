/**
 * STX → ETH: Burn USDCx to release USDC
 * Uses usdcx-v1 contract burn function
 * 
 * Limit: Up to 50 burn intents per request (max 10 per batch, max 5 batches)
 */
import { 
  Cl, 
  Pc,
  PostConditionMode,
  AnchorMode,
  makeContractCall,
  broadcastTransaction
} from '@stacks/transactions'
import { openContractCall } from '@stacks/connect'
import { TESTNET } from '../constants'
import { ethAddressToBytes32 } from './helpers'

export interface WithdrawParams {
  amount: string          // Amount in USDCx (human readable, e.g. "10.00")
  ethRecipient: string    // 0x... Ethereum address
  senderAddress: string   // Stacks sender address
}

export interface WithdrawResult {
  txId: string
}

/**
 * Convert human readable amount to micro USDCx
 */
export function toMicroUsdcx(amount: string): number {
  return Math.floor(parseFloat(amount) * 1_000_000)
}

/**
 * Convert micro USDCx to human readable amount
 */
export function fromMicroUsdcx(microAmount: number): string {
  return (microAmount / 1_000_000).toFixed(6)
}

/**
 * Build the burn transaction options for @stacks/connect
 * This prepares the contract call to be signed by the user's wallet
 */
export function buildBurnTxOptions(params: WithdrawParams) {
  const { amount, ethRecipient, senderAddress } = params
  const microAmount = toMicroUsdcx(amount)
  
  // Pad Ethereum address to 32 bytes (left-pad with zeros)
  const nativeRecipient = ethAddressToBytes32(ethRecipient)
  
  const functionArgs = [
    Cl.uint(microAmount),                    // amount in micro USDCx
    Cl.uint(TESTNET.domains.ETHEREUM),       // native domain for Ethereum (0)
    Cl.bufferFromHex(nativeRecipient),       // native recipient (32 bytes)
  ]
  
  // Post-condition: sender will send exactly `amount` USDCx
  const postCondition = Pc.principal(senderAddress)
    .willSendEq(microAmount)
    .ft(TESTNET.stacks.usdcxToken, TESTNET.stacks.usdcxTokenName)
  
  return {
    contractAddress: TESTNET.stacks.usdcxContract,
    contractName: 'usdcx-v1',
    functionName: 'burn',
    functionArgs,
    postConditions: [postCondition],
    postConditionMode: PostConditionMode.Deny,
    network: TESTNET.stacks.network,
    anchorMode: AnchorMode.Any,
  }
}

/**
 * Execute burn via browser wallet (Leather/Xverse)
 * Uses @stacks/connect to open wallet popup for signing
 */
export function withdrawToEthereumWithWallet(
  params: WithdrawParams,
  onFinish: (result: { txId: string }) => void,
  onCancel: () => void
): void {
  const txOptions = buildBurnTxOptions(params)
  
  openContractCall({
    ...txOptions,
    onFinish: (data) => {
      onFinish({ txId: data.txId })
    },
    onCancel,
  })
}

/**
 * Execute burn with private key (for backend/scripts)
 * Uses makeContractCall + broadcastTransaction
 */
export async function withdrawToEthereumWithKey(
  params: WithdrawParams & { senderKey: string }
): Promise<WithdrawResult> {
  const { senderKey, ...restParams } = params
  const txOptions = buildBurnTxOptions(restParams)
  
  const transaction = await makeContractCall({
    ...txOptions,
    senderKey,
  })
  
  const result = await broadcastTransaction(transaction, TESTNET.stacks.network)
  
  if ('error' in result) {
    throw new Error(`Broadcast failed: ${result.error}`)
  }
  
  return {
    txId: result.txid,
  }
}
