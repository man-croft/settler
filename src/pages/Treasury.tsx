import { useState, useEffect } from 'react'
import { useAccount, usePublicClient } from 'wagmi'
import { formatUnits } from 'viem'
import { DollarSign, TrendingUp, RefreshCw, Sparkles, Lock } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useWalletStore } from '@/store/wallet'
import { TESTNET, ERC20_ABI } from '@/lib/constants'
import { formatAmount, shortenAddress } from '@/lib/utils'

interface Balance {
  symbol: string
  chain: string
  amount: string
  usdValue: string
  color: string
  icon: string
}

interface YieldStrategy {
  id: string
  name: string
  protocol: string
  apy: string
  tvl: string
  risk: 'Low' | 'Medium' | 'High'
  description: string
  acceptedTokens: string[]
  logo: string
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
    acceptedTokens: ['USDCx'],
    logo: '₿',
  },
  {
    id: 'bitflow-liquidity',
    name: 'USDCx/STX Liquidity Pool',
    protocol: 'Bitflow',
    apy: '12.3',
    tvl: '$850K',
    risk: 'Medium',
    description: 'Provide liquidity and earn trading fees + protocol rewards',
    acceptedTokens: ['USDCx'],
    logo: '💧',
  },
  {
    id: 'stackswap-stable',
    name: 'Stablecoin Vault',
    protocol: 'StackSwap',
    apy: '6.2',
    tvl: '$1.8M',
    risk: 'Low',
    description: 'Conservative strategy optimized for capital preservation',
    acceptedTokens: ['USDCx'],
    logo: '🏦',
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

    // Fetch Ethereum USDC
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
          chain: 'Ethereum Sepolia',
          amount,
          usdValue: amount, // 1:1 for stablecoin
          color: 'from-white/20 to-white/10',
          icon: 'ETH',
        })
      } catch (e) {
        console.error('Error fetching ETH USDC:', e)
      }
    }

    // Fetch Stacks USDCx
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
              chain: 'Stacks Testnet',
              amount,
              usdValue: amount,
              color: 'from-red-600/20 to-red-500/10',
              icon: 'STX',
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

  // Regex to validate number input: allows empty, or valid decimal numbers that don't start with 0 (except 0 itself or 0.xxx)
  const handleDepositAmountChange = (value: string) => {
    // Allow empty string
    if (value === '') {
      setDepositAmount('')
      return
    }
    // Regex: allow "0", "0.", "0.123", or numbers starting with 1-9 followed by optional digits and decimal
    const regex = /^(0|0\.[0-9]*|[1-9][0-9]*\.?[0-9]*)$/
    if (regex.test(value)) {
      setDepositAmount(value)
    }
  }

  const handleDeposit = (strategyId: string) => {
    // Mock deposit simulation - in production this would call Stacks smart contracts
    alert(`🎉 Mock Deposit Simulation\n\nStrategy: ${MOCK_YIELD_STRATEGIES.find(s => s.id === strategyId)?.name}\nAmount: ${depositAmount} USDCx\n\nIn production, this would:\n1. Call SIP-010 transfer to vault contract\n2. Mint yield-bearing tokens\n3. Start earning ${MOCK_YIELD_STRATEGIES.find(s => s.id === strategyId)?.apy}% APY\n\nThis is a demo for the hackathon MVP.`)
    setSelectedStrategy(null)
    setDepositAmount('')
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Treasury</h1>
            <p className="text-white/60 mt-1">
              View your cross-chain balances
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchBalances}
            disabled={isLoading}
            className="border-white/10 hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Total Value Card */}
        <Card className="glass-card border-t-4 border-t-red-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-2">Total Portfolio Value</p>
                <p className="text-5xl font-display font-bold text-white">
                  ${formatAmount(totalValue)}
                  <span className="text-xl font-normal text-white/60 ml-3">USD</span>
                </p>
              </div>
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg shadow-red-900/30">
                <DollarSign className="h-10 w-10 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Connection Status */}
        {!isAnyWalletConnected && (
          <Card className="glass-card border-red-600/30">
            <CardContent className="pt-6 text-center">
              <p className="text-red-400 mb-2">No wallets connected</p>
              <p className="text-sm text-white/60">
                Connect your Ethereum or Stacks wallet to view balances
              </p>
            </CardContent>
          </Card>
        )}

        {/* Balances Grid */}
        {balances.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {balances.map((balance) => (
              <Card key={`${balance.symbol}-${balance.chain}`} className="glass-card hover:bg-white/10 transition-all cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${balance.color} flex items-center justify-center text-white font-bold text-lg shadow-lg border border-white/10`}>
                        {balance.icon === 'ETH' ? 'Ξ' : '₿'}
                      </div>
                      <div>
                        <CardTitle className="text-white text-xl">{balance.symbol}</CardTitle>
                        <p className="text-xs text-white/40">{balance.chain}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-display font-bold text-white">
                    {formatAmount(balance.amount)}
                    <span className="text-sm font-normal text-white/40 ml-2">{balance.symbol}</span>
                  </p>
                  <p className="text-sm text-white/60 mt-1">
                    ≈ ${formatAmount(balance.usdValue)} USD
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Connected Wallets */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 font-display">
              Connected Wallets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center border border-white/20">
                  <span className="text-white text-sm font-bold">Ξ</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Ethereum</p>
                  <p className="text-xs text-white/40">Sepolia Testnet</p>
                </div>
              </div>
              <p className="font-mono text-sm text-white/80">
                {isEthConnected ? shortenAddress(ethAddress!) : 'Not connected'}
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600/30 to-red-500/20 flex items-center justify-center border border-red-500/30">
                  <span className="text-white text-sm font-bold">₿</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Stacks</p>
                  <p className="text-xs text-white/40">Testnet</p>
                </div>
              </div>
              <p className="font-mono text-sm text-white/80">
                {isStacksConnected ? shortenAddress(stacksAddress!) : 'Not connected'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Yield Opportunities */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 font-display">
              <TrendingUp className="h-5 w-5" />
              Yield Opportunities
            </CardTitle>
            <CardDescription className="text-white/60">
              Deploy your USDCx into Bitcoin-secured DeFi protocols
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {MOCK_YIELD_STRATEGIES.map((strategy) => {
              const usdcxBalance = getUsdcxBalance()
              const canDeposit = usdcxBalance > 0 && isStacksConnected
              
              return (
                <div 
                  key={strategy.id} 
                  className="p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center text-2xl border border-emerald-500/20">
                        {strategy.logo}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">{strategy.name}</h3>
                        <p className="text-sm text-white/60">{strategy.protocol}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-display font-bold text-emerald-400">{strategy.apy}%</p>
                      <p className="text-xs text-white/40">APY</p>
                    </div>
                  </div>

                  <p className="text-sm text-white/80 mb-4">{strategy.description}</p>

                  <div className="flex items-center gap-4 text-xs text-white/60 mb-4">
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>TVL: {strategy.tvl}</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full ${
                      strategy.risk === 'Low' ? 'bg-emerald-500/20 text-emerald-400' :
                      strategy.risk === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {strategy.risk} Risk
                    </div>
                    <div>
                      Accepts: {strategy.acceptedTokens.join(', ')}
                    </div>
                  </div>

                  {selectedStrategy === strategy.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={depositAmount}
                          onChange={(e) => handleDepositAmountChange(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-red-600/50"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDepositAmount(usdcxBalance.toFixed(6))}
                          className="text-xs border-white/10 hover:bg-white/5"
                        >
                          MAX
                        </Button>
                      </div>
                      <p className="text-xs text-white/40">
                        Available: {usdcxBalance.toFixed(6)} USDCx
                      </p>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleDeposit(strategy.id)}
                          disabled={!depositAmount || parseFloat(depositAmount) <= 0 || parseFloat(depositAmount) > usdcxBalance}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Deposit & Earn
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedStrategy(null)
                            setDepositAmount('')
                          }}
                          className="border-white/10 hover:bg-white/5"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-white text-black hover:bg-white/90"
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

            <div className="p-4 rounded-xl border border-red-600/30 bg-red-600/10 mt-4">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <strong>Demo Mode:</strong> Yield deposits are simulated for this hackathon MVP. 
                Production version will integrate real Stacks DeFi protocols with actual yield generation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
