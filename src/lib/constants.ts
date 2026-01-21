/**
 * Testnet Configuration for Settler
 * All bridging happens between Ethereum Sepolia and Stacks Testnet
 */

export const TESTNET = {
  ethereum: {
    chainId: 11155111, // Sepolia
    name: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,
    xReserve: '0x008888878f94C0d87defdf0B07f46B93C1934442' as `0x${string}`,
  },
  stacks: {
    network: 'testnet' as const,
    blockExplorer: 'https://explorer.hiro.so',
    apiUrl: 'https://api.testnet.hiro.so',
    usdcxToken: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx',
    usdcxV1: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx-v1',
    usdcxContract: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    usdcxTokenName: 'usdcx-token',
  },
  domains: {
    STACKS: 10003,     // Stacks domain ID (constant for all networks)
    ETHEREUM: 0,       // Ethereum domain ID
  },
  limits: {
    minDeposit: 1,       // 1 USDC minimum on testnet
    minWithdraw: 4.80,   // 4.80 USDCx minimum
  },
  timing: {
    depositTime: '~15 min',
    withdrawTime: '~25 min',
  },
} as const;

// Contract ABIs
export const X_RESERVE_ABI = [
  {
    name: 'depositToRemote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'value', type: 'uint256' },
      { name: 'remoteDomain', type: 'uint32' },
      { name: 'remoteRecipient', type: 'bytes32' },
      { name: 'localToken', type: 'address' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: 'remaining', type: 'uint256' }],
  },
] as const;

// Useful links
export const FAUCETS = {
  usdc: 'https://faucet.circle.com/',
  sepolia: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
  stacks: 'https://explorer.hiro.so/sandbox/faucet?chain=testnet',
} as const;

export type BridgeDirection = 'ETH_TO_STX' | 'STX_TO_ETH';
