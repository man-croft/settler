# Bridge Guide: USDC ↔ USDCx Cross-Chain Bridging

This guide explains the technical process for bridging USDC between Ethereum and Stacks using Circle's xReserve protocol.

## Table of Contents

- [Overview](#overview)
- [Contract Addresses](#contract-addresses)
- [Deposit: Ethereum USDC → Stacks USDCx](#deposit-ethereum-usdc--stacks-usdcx)
- [Withdrawal: Stacks USDCx → Ethereum USDC](#withdrawal-stacks-usdcx--ethereum-usdc)
- [Tracking Bridge Status](#tracking-bridge-status)
- [Linking Intent to Mint (hookData)](#linking-intent-to-mint-hookdata)
- [Success Verification](#success-verification)

---

## Overview

The bridge uses Circle's xReserve protocol with two attestation services:

1. **Circle's xReserve Attestation Service** - Monitors Ethereum deposits and signs attestations
2. **Stacks Attestation Service** - Processes attestations to mint USDCx on Stacks

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Ethereum   │────▶│   Circle    │────▶│   Stacks    │
│   (USDC)    │     │  xReserve   │     │  (USDCx)    │
└─────────────┘     └─────────────┘     └─────────────┘
     Deposit         Attestation           Mint
```

---

## Contract Addresses

### Mainnet

| Contract | Network | Address |
|----------|---------|---------|
| USDC | Ethereum | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| xReserve | Ethereum | `0x8888888199b2Df864bf678259607d6D5EBb4e3Ce` |
| USDCx Token | Stacks | `SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx` |
| USDCx Protocol | Stacks | `SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx-v1` |

### Testnet (Sepolia / Stacks Testnet)

| Contract | Network | Address |
|----------|---------|---------|
| USDC | Sepolia | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| xReserve | Sepolia | `0x008888878f94C0d87defdf0B07f46B93C1934442` |
| USDCx Token | Stacks Testnet | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx` |
| USDCx Protocol | Stacks Testnet | `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx-v1` |

### Domain IDs

| Chain | Domain ID |
|-------|-----------|
| Ethereum | `0` |
| Stacks | `10003` |

---

## Deposit: Ethereum USDC → Stacks USDCx

### Step 1: Approve USDC Spending

Before depositing, approve the xReserve contract to spend your USDC.

```typescript
import { parseUnits } from 'viem'

const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
const X_RESERVE_ADDRESS = '0x008888878f94C0d87defdf0B07f46B93C1934442'

// Approve xReserve to spend USDC
const approveTx = await walletClient.writeContract({
  address: USDC_ADDRESS,
  abi: [{
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  }],
  functionName: 'approve',
  args: [X_RESERVE_ADDRESS, parseUnits('100', 6)], // 100 USDC
})

// Wait for confirmation
await publicClient.waitForTransactionReceipt({ hash: approveTx })
```

### Step 2: Convert Stacks Address to bytes32

The xReserve contract requires the recipient address as bytes32.

```typescript
import { c32addressDecode } from 'c32check'

function stacksAddressToBytes32(stacksAddress: string): `0x${string}` {
  const [version, hash160] = c32addressDecode(stacksAddress)
  
  // Pad to 32 bytes: version (1 byte) + hash160 (20 bytes) + padding (11 bytes)
  const versionHex = version.toString(16).padStart(2, '0')
  const paddedHash = hash160.padStart(40, '0')
  const padding = '0'.repeat(22) // 11 bytes of padding
  
  return `0x${padding}${versionHex}${paddedHash}` as `0x${string}`
}
```

### Step 3: Generate hookData (for tracking)

Generate a unique identifier to track this specific deposit:

```typescript
function generateHookData(): `0x${string}` {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0')
  const randomBytes = new Uint8Array(12)
  crypto.getRandomValues(randomBytes)
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `0x${timestamp}${randomHex}` as `0x${string}`
}
```

### Step 4: Call depositToRemote

```typescript
const STACKS_DOMAIN = 10003

const hookData = generateHookData()
const remoteRecipient = stacksAddressToBytes32(stacksAddress)

const depositTx = await walletClient.writeContract({
  address: X_RESERVE_ADDRESS,
  abi: [{
    name: 'depositToRemote',
    type: 'function',
    inputs: [
      { name: 'value', type: 'uint256' },
      { name: 'remoteDomain', type: 'uint32' },
      { name: 'remoteRecipient', type: 'bytes32' },
      { name: 'localToken', type: 'address' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
  }],
  functionName: 'depositToRemote',
  args: [
    parseUnits('10', 6),    // 10 USDC (6 decimals)
    STACKS_DOMAIN,          // 10003
    remoteRecipient,        // Stacks address as bytes32
    USDC_ADDRESS,           // USDC token address
    0n,                     // maxFee (0 for no fee limit)
    hookData,               // Unique tracking identifier
  ],
})

console.log('Deposit TX:', depositTx)
console.log('HookData:', hookData) // Save this for tracking!
```

### Deposit Timeline

1. **0-2 min**: Ethereum transaction confirms
2. **2-15 min**: Circle attestation service processes deposit
3. **15-20 min**: Stacks attestation service mints USDCx

---

## Withdrawal: Stacks USDCx → Ethereum USDC

### Step 1: Prepare Withdrawal Parameters

```typescript
import { 
  openContractCall,
  uintCV,
  bufferCV,
  PostConditionMode
} from '@stacks/connect'

const USDCX_CONTRACT = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
const ETHEREUM_DOMAIN = 0
```

### Step 2: Convert Ethereum Address to Buffer

```typescript
function ethAddressToBuffer(ethAddress: string): Uint8Array {
  // Remove 0x prefix and pad to 32 bytes
  const hex = ethAddress.replace('0x', '').toLowerCase()
  const padded = hex.padStart(64, '0')
  return Buffer.from(padded, 'hex')
}
```

### Step 3: Call withdraw-to-remote

```typescript
const amountMicroUsdc = 10_000_000 // 10 USDCx (6 decimals)
const ethRecipientBuffer = ethAddressToBuffer(ethAddress)

await openContractCall({
  contractAddress: USDCX_CONTRACT,
  contractName: 'usdcx-v1',
  functionName: 'withdraw-to-remote',
  functionArgs: [
    uintCV(amountMicroUsdc),           // Amount in micro-units
    uintCV(ETHEREUM_DOMAIN),           // Remote domain (0 = Ethereum)
    bufferCV(ethRecipientBuffer),      // Ethereum recipient (32 bytes)
    uintCV(0),                         // Max fee
  ],
  postConditionMode: PostConditionMode.Allow,
  onFinish: (data) => {
    console.log('Withdrawal TX:', data.txId)
  },
  onCancel: () => {
    console.log('User cancelled')
  },
})
```

### Withdrawal Timeline

1. **0-5 min**: Stacks burn transaction confirms
2. **5-20 min**: Stacks attestation service signs burn intent
3. **20-30 min**: Circle xReserve verifies and releases USDC

### Minimum Withdrawal Amount

Due to bridging fees, the minimum withdrawal is approximately **4.80 USDCx**.

---

## Tracking Bridge Status

### ETH → STX: Checking Mint Status

Query the USDCx-v1 contract events to find mint events:

```typescript
const USDCX_V1 = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx-v1'

async function checkMintStatus(hookData: string, recipient: string) {
  const response = await fetch(
    `https://api.testnet.hiro.so/extended/v1/contract/${USDCX_V1}/events?limit=50`
  )
  
  const data = await response.json()
  
  const mintEvent = data.results.find((event: any) => {
    if (event.event_type !== 'smart_contract_log') return false
    
    const repr = event.contract_log?.value?.repr || ''
    
    // Check if this is a mint event
    if (!repr.includes('(topic "mint")') && 
        !repr.includes('(topic \\"mint\\")')) return false
    
    // Match by hookData (most reliable)
    if (hookData && hookData !== '0x' && hookData.length > 2) {
      const hookDataClean = hookData.replace('0x', '').toLowerCase()
      return repr.toLowerCase().includes(`(hook-data 0x${hookDataClean})`)
    }
    
    // Fallback: match by recipient (Clarity principal format)
    if (recipient) {
      return repr.includes(`(remote-recipient '${recipient})`)
    }
    
    return false
  })
  
  if (mintEvent) {
    return {
      success: true,
      txId: mintEvent.tx_id,
    }
  }
  
  return { success: false }
}
```

### STX → ETH: Checking Release Status

Query Ethereum for USDC Transfer events to the recipient:

```typescript
async function checkReleaseStatus(
  publicClient: any,
  recipientAddress: string
) {
  const currentBlock = await publicClient.getBlockNumber()
  const fromBlock = currentBlock - 1000n // Last ~1000 blocks
  
  const logs = await publicClient.getLogs({
    address: USDC_ADDRESS,
    event: {
      type: 'event',
      name: 'Transfer',
      inputs: [
        { type: 'address', indexed: true, name: 'from' },
        { type: 'address', indexed: true, name: 'to' },
        { type: 'uint256', indexed: false, name: 'value' },
      ],
    },
    args: {
      to: recipientAddress,
    },
    fromBlock,
    toBlock: currentBlock,
  })
  
  // Filter for transfers from xReserve
  const releaseLog = logs.find(log => 
    log.args.from?.toLowerCase() === X_RESERVE_ADDRESS.toLowerCase()
  )
  
  if (releaseLog) {
    return {
      success: true,
      txHash: releaseLog.transactionHash,
      amount: releaseLog.args.value,
    }
  }
  
  return { success: false }
}
```

---

## Linking Intent to Mint (hookData)

The `hookData` parameter is crucial for reliably tracking deposits.

### How it Works

1. **Generate unique hookData** before calling `depositToRemote`
2. **Include hookData** in the deposit transaction
3. **When USDCx is minted**, the hookData appears in the mint event
4. **Query events** and match by hookData to confirm mint

### Mint Event Structure

When a mint occurs, the USDCx-v1 contract emits a Print event:

```clarity
{
  attestor-pk: 0x0254a0efe64e10b7f9c88d3072a8ee6a9c7b65e968d8bdd6f3f5da8334805eb028,
  fee-amount: u0,
  mint-amount: u1000000,
  parsed-intent: {
    amount: u1000000,
    hook-data: 0x677d1234abcdef...,  ;; YOUR UNIQUE HOOKDATA
    local-depositor: 0x000000000000000000000000...,
    local-token: 0x0000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c7238,
    magic: 0x5a2e0acd,
    max-fee: u0,
    nonce: 0x...,
    remote-domain: u10003,
    remote-recipient: 'ST1YOURADDRESS...,
    remote-token: 0x...usdcx...,
    version: u1
  },
  topic: "mint"
}
```

### Matching Logic

```typescript
function matchesByHookData(eventRepr: string, hookData: string): boolean {
  if (!hookData || hookData === '0x') return false
  
  const hookDataClean = hookData.replace('0x', '').toLowerCase()
  return eventRepr.toLowerCase().includes(`(hook-data 0x${hookDataClean})`)
}
```

---

## Success Verification

### ETH → STX Deposit Success Checklist

| Step | How to Verify |
|------|---------------|
| 1. Ethereum TX Confirmed | Check Etherscan for `status: success` |
| 2. Deposit Event Emitted | Look for `DepositToRemote` event in TX logs |
| 3. Attestation Processing | Wait 10-15 minutes |
| 4. USDCx Minted | Query contract events for mint with matching hookData |
| 5. Balance Updated | Check recipient's USDCx balance |

```typescript
// Check USDCx balance
async function getUsdcxBalance(stacksAddress: string): Promise<number> {
  const response = await fetch(
    `https://api.testnet.hiro.so/extended/v1/address/${stacksAddress}/balances`
  )
  const data = await response.json()
  
  const usdcxKey = Object.keys(data.fungible_tokens || {})
    .find(k => k.includes('usdcx'))
  
  if (usdcxKey) {
    return parseInt(data.fungible_tokens[usdcxKey].balance) / 1_000_000
  }
  return 0
}
```

### STX → ETH Withdrawal Success Checklist

| Step | How to Verify |
|------|---------------|
| 1. Stacks TX Confirmed | Check Hiro Explorer for `tx_status: success` |
| 2. Burn Event Emitted | Look for burn event in TX events |
| 3. Attestation Processing | Wait 15-25 minutes |
| 4. USDC Released | Query Ethereum for Transfer event from xReserve |
| 5. Balance Updated | Check recipient's USDC balance |

```typescript
// Check Stacks TX status
async function getStacksTxStatus(txId: string) {
  const response = await fetch(
    `https://api.testnet.hiro.so/extended/v1/tx/${txId}`
  )
  const data = await response.json()
  
  return {
    status: data.tx_status,
    success: data.tx_status === 'success',
  }
}
```

---

## Error Handling

### Common Deposit Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Insufficient allowance | USDC not approved | Call `approve()` first |
| Insufficient balance | Not enough USDC | Check balance before deposit |
| Invalid recipient | Bad Stacks address format | Validate address format |
| Transaction reverted | Gas or contract error | Check Etherscan for details |

### Common Withdrawal Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `u1` error code | Insufficient USDCx balance | Check balance |
| `u2` error code | Invalid remote domain | Use correct domain ID |
| Post-condition failure | Token transfer blocked | Use `PostConditionMode.Allow` |
| Minimum amount | Below 4.80 USDCx minimum | Increase withdrawal amount |

---

## API Endpoints Reference

### Stacks Testnet

```
Base URL: https://api.testnet.hiro.so

GET /extended/v1/address/{address}/balances
GET /extended/v1/tx/{txId}
GET /extended/v1/contract/{contractId}/events?limit=50
```

### Ethereum Sepolia

```
Etherscan: https://sepolia.etherscan.io
RPC: https://ethereum-sepolia-rpc.publicnode.com
```

---

## Example: Complete Deposit Flow

```typescript
async function depositUsdcToStacks(
  walletClient: any,
  publicClient: any,
  amount: string,
  stacksRecipient: string
) {
  // 1. Generate tracking ID
  const hookData = generateHookData()
  
  // 2. Check and approve if needed
  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [walletClient.account.address, X_RESERVE_ADDRESS],
  })
  
  const value = parseUnits(amount, 6)
  
  if (allowance < value) {
    const approveTx = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [X_RESERVE_ADDRESS, value],
    })
    await publicClient.waitForTransactionReceipt({ hash: approveTx })
  }
  
  // 3. Execute deposit
  const depositTx = await walletClient.writeContract({
    address: X_RESERVE_ADDRESS,
    abi: X_RESERVE_ABI,
    functionName: 'depositToRemote',
    args: [
      value,
      STACKS_DOMAIN,
      stacksAddressToBytes32(stacksRecipient),
      USDC_ADDRESS,
      0n,
      hookData,
    ],
  })
  
  return {
    depositTxHash: depositTx,
    hookData: hookData,
  }
}

// 4. Poll for mint completion
async function waitForMint(hookData: string, recipient: string) {
  const maxAttempts = 60 // 10 minutes at 10s intervals
  
  for (let i = 0; i < maxAttempts; i++) {
    const result = await checkMintStatus(hookData, recipient)
    
    if (result.success) {
      console.log('Mint successful!', result.txId)
      return result
    }
    
    await new Promise(r => setTimeout(r, 10000)) // Wait 10s
  }
  
  throw new Error('Mint timeout - check manually')
}
```

---

## Resources

- [Circle xReserve Documentation](https://developers.circle.com/)
- [Stacks USDCx Documentation](https://docs.stacks.co/)
- [Hiro API Reference](https://docs.hiro.so/stacks/api)
- [Etherscan Sepolia](https://sepolia.etherscan.io/)
- [Hiro Explorer (Testnet)](https://explorer.hiro.so/?chain=testnet)
