import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { RefreshCw, TrendingUp, Lock, ArrowRight } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { useWalletStore } from '@/store/wallet'
import { TESTNET, ERC20_ABI } from '@/lib/constants'
import { formatAmount, shortenAddress } from '@/lib/utils'

interface Balance {
  symbol: string
  chain: string
  amount: string
  usdValue: string
}

interface YieldStrategy {
  id: string
  name: string
  protocol: string
  apy: string
  tvl: string
  risk: 'Low' | 'Medium' | 'High'
  description: string
}

const MOCK_YIELD_STRATEGIES: YieldStrategy[] = [
  {
    id: 'zest-btc-lending',
    name: 'Bitcoin-Backed Lending',
    protocol: 'Zest Protocol',
    apy: '8.5',
    tvl: '$2.4M',
    risk: 'Low',
    description: 'Earn yield by providing liquidity to Bitcoin-backed loans',
  },
  {
    id: 'bitflow-liquidity',
    name: 'USDCx/STX Liquidity Pool',
    protocol: 'Bitflow',
    apy: '12.3',
    tvl: '$850K',
    risk: 'Medium',
    description: 'Provide liquidity and earn trading fees + protocol rewards',
  },
  {
    id: 'stackswap-stable',
    name: 'Stablecoin Vault',
    protocol: 'StackSwap',
    apy: '6.2',
    tvl: '$1.8M',
    risk: 'Low',
    description: 'Conservative strategy optimized for capital preservation',
  },
]

export function TreasuryPage() {
  const { address: ethAddress, isConnected: isEthConnected } = useAccount()
  const publicClient = usePublicClient()
  const { stacksAddress, isStacksConnected } = useWalletStore()
  
  const [balances, setBalances] = useState<Balance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalValue, setTotalValue] = useState('0.00')
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')

  const fetchBalances = async () => {
    setIsLoading(true)
    const newBalances: Balance[] = []

    if (ethAddress && publicClient) {
      try {
        const balance = await publicClient.readContract({
          address: TESTNET.ethereum.usdc,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [ethAddress],
        }) as bigint
        const amount = formatUnits(balance, 6)
        newBalances.push({
          symbol: 'USDC',
          chain: 'Ethereum',
          amount,
          usdValue: amount,
        })
      } catch (e) {
        console.error('Error fetching ETH USDC:', e)
      }
    }

    if (stacksAddress) {
      try {
        const response = await fetch(
          `https://api.testnet.hiro.so/extended/v1/address/${stacksAddress}/balances`
        )
        if (response.ok) {
          const data = await response.json()
          const usdcxKey = Object.keys(data.fungible_tokens || {}).find(k => k.includes('usdcx'))
          if (usdcxKey) {
            const bal = data.fungible_tokens[usdcxKey].balance
            const amount = (parseInt(bal) / 1_000_000).toFixed(6)
            newBalances.push({
              symbol: 'USDCx',
              chain: 'Stacks',
              amount,
              usdValue: amount,
            })
          }
        }
      } catch (e) {
        console.error('Error fetching Stacks USDCx:', e)
      }
    }

    setBalances(newBalances)
    
    const total = newBalances.reduce((sum, b) => sum + parseFloat(b.usdValue), 0)
    setTotalValue(total.toFixed(2))
    
    setIsLoading(false)
  }

  useEffect(() => {
    fetchBalances()
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [ethAddress, stacksAddress, publicClient])

  const isAnyWalletConnected = isEthConnected || isStacksConnected

  const getUsdcxBalance = () => {
    const usdcxBalance = balances.find(b => b.symbol === 'USDCx')
    return usdcxBalance ? parseFloat(usdcxBalance.amount) : 0
  }

  const handleDepositAmountChange = (value: string) => {
    if (value === '') {
      setDepositAmount('')
      return
    }
    const regex = /^(0|0\.[0-9]*|[1-9][0-9]*\.?[0-9]*)$/
    if (regex.test(value)) {
      setDepositAmount(value)
    }
  }

  const handleDeposit = (strategyId: string) => {
    const strategy = MOCK_YIELD_STRATEGIES.find(s => s.id === strategyId)
    alert(`Demo Mode\n\nStrategy: ${strategy?.name}\nAmount: ${depositAmount} USDCx\n\nIn production, this would deploy to ${strategy?.protocol}.`)
    setSelectedStrategy(null)
    setDepositAmount('')
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-8 lg:px-16 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div>
            <h1 
              className="text-white mb-2"
              style={{ 
                fontSize: 'clamp(2rem, 6vw, 4rem)',
                fontFamily: "'Instrument Serif', Georgia, serif",
                lineHeight: 1,
                letterSpacing: '-0.02em'
              }}
            >
              <span style={{ fontStyle: 'italic', color: '#FF4D00' }}>Treasury</span>
            </h1>
            <p className="text-white/40">Cross-chain balances & yield</p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchBalances}
            disabled={isLoading}
            className="btn-outline-minimal rounded-none"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Total Value */}
        <div className="border-y border-white/5 py-16 mb-16 text-center">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">Total Portfolio Value</p>
          <p 
            className="text-white"
            style={{ 
              fontSize: 'clamp(3rem, 10vw, 6rem)',
              fontFamily: "'Instrument Serif', Georgia, serif"
            }}
          >
            ${formatAmount(totalValue)}
          </p>
        </div>

        {/* Wallet Status */}
        {!isAnyWalletConnected && (
          <div className="border border-white/5 p-8 text-center mb-16">
            <p className="text-white/40">Connect a wallet to view balances</p>
          </div>
        )}

        {/* Balances */}
        {balances.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xs text-white/30 uppercase tracking-widest mb-6">Balances</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {balances.map((balance) => (
                <div key={`${balance.symbol}-${balance.chain}`} 
                  className="border border-white/5 p-8 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 border border-white/10 flex items-center justify-center">
                        <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '1.25rem' }}>
                          {balance.symbol === 'USDC' ? '$' : 'S'}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '1.125rem', color: '#FAFAFA' }}>{balance.symbol}</p>
                        <p className="text-xs text-white/30">{balance.chain}</p>
                      </div>
                    </div>
                  </div>
                  <p 
                    className="text-white mb-1"
                    style={{ fontSize: '1.875rem', fontFamily: "'Instrument Serif', Georgia, serif" }}
                  >
                    {formatAmount(balance.amount)}
                  </p>
                  <p className="text-sm text-white/40">
                    ≈ ${formatAmount(balance.usdValue)} USD
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected Wallets */}
        <div className="mb-16">
          <h2 className="text-xs text-white/30 uppercase tracking-widest mb-6">Connected Wallets</h2>
          <div className="space-y-4">
            <div className="border border-white/5 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-white/10 flex items-center justify-center">
                  <span style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>$</span>
                </div>
                <div>
                  <p className="text-white">Ethereum</p>
                  <p className="text-xs text-white/30">Sepolia</p>
                </div>
              </div>
              <p className="font-mono text-sm text-white/60">
                {isEthConnected ? shortenAddress(ethAddress!) : 'Not connected'}
              </p>
            </div>

            <div className="border border-white/5 p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border flex items-center justify-center" style={{ borderColor: 'rgba(255, 77, 0, 0.3)' }}>
                  <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', color: '#FF4D00' }}>S</span>
                </div>
                <div>
                  <p className="text-white">Stacks</p>
                  <p className="text-xs text-white/30">Testnet</p>
                </div>
              </div>
              <p className="font-mono text-sm text-white/60">
                {isStacksConnected ? shortenAddress(stacksAddress!) : 'Not connected'}
              </p>
            </div>
          </div>
        </div>

        {/* Yield Opportunities */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5" style={{ color: '#FF4D00' }} />
            <h2 className="text-xs text-white/30 uppercase tracking-widest">Yield Opportunities</h2>
          </div>
          
          <div className="space-y-6">
            {MOCK_YIELD_STRATEGIES.map((strategy) => {
              const usdcxBalance = getUsdcxBalance()
              const canDeposit = usdcxBalance > 0 && isStacksConnected
              
              return (
                <div 
                  key={strategy.id} 
                  className="border border-white/5 p-8 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 
                        className="text-white mb-1"
                        style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '1.25rem' }}
                      >
                        {strategy.name}
                      </h3>
                      <p className="text-sm text-white/40">{strategy.protocol}</p>
                    </div>
                    <div className="text-right">
                      <p 
                        style={{ fontSize: '1.875rem', fontFamily: "'Instrument Serif', Georgia, serif", color: '#FF4D00' }}
                      >
                        {strategy.apy}%
                      </p>
                      <p className="text-xs text-white/30 uppercase tracking-widest">APY</p>
                    </div>
                  </div>

                  <p className="text-white/60 mb-6">{strategy.description}</p>

                  <div className="flex items-center gap-6 text-xs text-white/40 mb-6">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      <span>TVL: {strategy.tvl}</span>
                    </div>
                    <div className={`px-2 py-1 border ${
                      strategy.risk === 'Low' ? 'border-green-500/30 text-green-400' :
                      strategy.risk === 'Medium' ? 'border-yellow-500/30 text-yellow-400' :
                      'border-red-500/30 text-red-400'
                    }`}>
                      {strategy.risk} Risk
                    </div>
                  </div>

                  {selectedStrategy === strategy.id ? (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={depositAmount}
                          onChange={(e) => handleDepositAmountChange(e.target.value)}
                          className="flex-1 px-4 py-3 bg-transparent border border-white/10 text-white text-lg font-mono placeholder:text-white/20 focus:outline-none focus:border-white/30"
                        />
                        <Button
                          variant="outline"
                          onClick={() => setDepositAmount(usdcxBalance.toFixed(6))}
                          className="btn-outline-minimal rounded-none px-6"
                        >
                          MAX
                        </Button>
                      </div>
                      <p className="text-xs text-white/30">
                        Available: {usdcxBalance.toFixed(6)} USDCx
                      </p>
                      <div className="flex gap-3">
                        <Button
                          className="flex-1 btn-minimal rounded-none h-12"
                          onClick={() => handleDeposit(strategy.id)}
                          disabled={!depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > usdcxBalance}
                        >
                          Deposit & Earn
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedStrategy(null)
                            setDepositAmount('')
                          }}
                          className="btn-outline-minimal rounded-none px-6"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      className="w-full btn-minimal rounded-none h-12"
                      onClick={() => setSelectedStrategy(strategy.id)}
                      disabled={!canDeposit}
                    >
                      {!isStacksConnected ? 'Connect Stacks Wallet' : 
                       usdcxBalance === 0 ? 'No USDCx Balance' : 
                       'Deposit USDCx'}
                    </Button>
                  )}
                </div>
              )
            })}

            {/* Demo Notice */}
            <div className="border p-6" style={{ borderColor: 'rgba(255, 77, 0, 0.2)', backgroundColor: 'rgba(255, 77, 0, 0.05)' }}>
              <p className="text-sm" style={{ color: '#FF4D00' }}>
                <strong>Demo Mode:</strong> Yield deposits are simulated. Production will integrate real Stacks DeFi protocols.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
