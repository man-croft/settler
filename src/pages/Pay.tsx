import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatUnits } from 'viem'
import { AlertCircle, Loader2, CheckCircle, ArrowRight, Wallet, RefreshCw } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useWalletStore } from '@/store/wallet'
import { TESTNET, ERC20_ABI } from '@/lib/constants'
import { formatAmount } from '@/lib/utils'
import { 
  approveUsdc, 
  depositToStacks, 
  getUsdcAllowance, 
  generateHookData,
  withdrawToEthereumWithWallet 
} from '@/lib/bridge'

type Direction = 'ETH_TO_STX' | 'STX_TO_ETH'

interface Invoice {
  direction: Direction
  amount: string
  recipient: string
  memo?: string
}

function decodeInvoice(encoded: string): { data: Invoice | null; error: string | null } {
  try {
    const data = atob(encoded)
    const parsed = JSON.parse(data)
    
    // Validate invoice structure
    if (!parsed || typeof parsed !== 'object') {
      return { data: null, error: 'Invalid invoice format' }
    }
    
    // Validate required fields
    if (!parsed.direction || !parsed.amount || !parsed.recipient) {
      return { data: null, error: 'Missing required invoice fields' }
    }
    
    // Validate direction
    if (parsed.direction !== 'ETH_TO_STX' && parsed.direction !== 'STX_TO_ETH') {
      return { data: null, error: 'Invalid bridge direction' }
    }
    
    // Validate amount
    const amount = parseFloat(parsed.amount)
    if (isNaN(amount) || amount <= 0) {
      return { data: null, error: 'Invalid amount (must be greater than 0)' }
    }
    
    // Validate recipient
    if (typeof parsed.recipient !== 'string' || parsed.recipient.length < 1) {
      return { data: null, error: 'Invalid recipient address' }
    }
    
    return { data: parsed, error: null }
  } catch {
    return { data: null, error: 'Invalid invoice encoding' }
  }
}

export function PayPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const invoiceParam = searchParams.get('invoice')
  
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<'idle' | 'approving' | 'bridging' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [allowance, setAllowance] = useState<bigint>(0n)
  const [needsApproval, setNeedsApproval] = useState(true)
  const [isRefreshingAllowance, setIsRefreshingAllowance] = useState(false)
  
  // Ethereum wallet
  const { address: ethAddress, isConnected: isEthConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [ethUsdcBalance, setEthUsdcBalance] = useState<string>('0')
  
  // Stacks wallet
  const { stacksAddress, isStacksConnected } = useWalletStore()
  const [stxUsdcxBalance, setStxUsdcxBalance] = useState<string>('0')
  
  // Decode invoice on mount
  useEffect(() => {
    if (invoiceParam) {
      const result = decodeInvoice(invoiceParam)
      if (result.error) {
        setError(result.error)
        setInvoice(null)
      } else {
        setInvoice(result.data)
      }
    }
    setIsLoading(false)
  }, [invoiceParam])

  // Fetch balances
  useEffect(() => {
    async function fetchBalances() {
      if (ethAddress && publicClient) {
        try {
          const balance = await publicClient.readContract({
            address: TESTNET.ethereum.usdc,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [ethAddress],
          }) as bigint
          setEthUsdcBalance(formatUnits(balance, 6))
        } catch (e) { console.error(e) }
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
              setStxUsdcxBalance((parseInt(bal) / 1_000_000).toFixed(6))
            }
          }
        } catch (e) { console.error(e) }
      }
    }
    fetchBalances()
    const interval = setInterval(fetchBalances, 10000)
    return () => clearInterval(interval)
  }, [ethAddress, stacksAddress, publicClient])

  // Function to check allowance (reusable)
  const checkAllowance = async () => {
    if (!publicClient || !ethAddress || !invoice || invoice.direction !== 'ETH_TO_STX') {
      return
    }
    
    try {
      const currentAllowance = await getUsdcAllowance(publicClient, ethAddress as `0x${string}`)
      setAllowance(currentAllowance)
      
      const requiredAmount = BigInt(Math.floor(parseFloat(invoice.amount) * 1_000_000))
      setNeedsApproval(currentAllowance < requiredAmount)
    } catch (e) {
      console.error('Error checking allowance:', e)
    }
  }

  // Check USDC allowance for ETH_TO_STX direction
  useEffect(() => {
    checkAllowance()
  }, [publicClient, ethAddress, invoice])

  // Manual refresh allowance
  const handleRefreshAllowance = async () => {
    setIsRefreshingAllowance(true)
    await checkAllowance()
    setIsRefreshingAllowance(false)
  }

  const handleApprove = async () => {
    if (!invoice) return
    
    if (!walletClient) {
      setError('Wallet not connected or not ready. Please try reconnecting.')
      return
    }
    
    if (!publicClient) {
      setError('Network connection not ready.')
      return
    }

    setError(null)

    try {
      setStatus('approving')
      const approveTxHash = await approveUsdc(walletClient, invoice.amount)
      
      // Wait for approval to be confirmed
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
      
      // Refresh allowance using the shared function
      await checkAllowance()
      
      setStatus('idle')
    } catch (err: any) {
      console.error('Approval error:', err)
      setStatus('error')
      
      let errorMessage = 'Approval failed. Please try again.'
      if (err.message) {
        if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
          errorMessage = 'Approval rejected by user'
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
    }
  }

  const handleBridge = async () => {
    if (!invoice) return
    
    if (!walletClient) {
      setError('Wallet not connected or not ready. Please try reconnecting.')
      return
    }

    setError(null)
    setTxHash(null)

    try {
      setStatus('bridging')
      
      const hookData = generateHookData()
      const depositTxHash = await depositToStacks(
        walletClient,
        invoice.amount,
        invoice.recipient,
        hookData
      )

      setTxHash(depositTxHash)
      setStatus('success')

      setTimeout(() => {
        navigate(`/track?tx=${depositTxHash}&dir=ETH_TO_STX&to=${encodeURIComponent(invoice.recipient)}&hookData=${hookData}`)
      }, 3000)

    } catch (err: any) {
      console.error('Bridge error:', err)
      setStatus('error')
      
      let errorMessage = 'Bridge failed. Please try again.'
      if (err.message) {
        if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
          errorMessage = 'Transaction rejected by user'
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to complete transaction'
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
    }
  }

  const handleWithdraw = () => {
    if (!invoice || !stacksAddress) return
    setError(null)
    setTxHash(null)
    setStatus('bridging')

    withdrawToEthereumWithWallet(
      {
        amount: invoice.amount,
        ethRecipient: invoice.recipient,
        senderAddress: stacksAddress,
      },
      (result) => {
        setTxHash(result.txId)
        setStatus('success')
        setTimeout(() => {
          navigate(`/track?tx=${result.txId}&dir=STX_TO_ETH&to=${encodeURIComponent(invoice.recipient)}`)
        }, 3000)
      },
      (error?: string) => {
        setStatus('error')
        setError(error || 'Transaction was cancelled by user')
      }
    )
  }

  const handlePay = () => {
    if (!invoice) return
    
    if (invoice.direction === 'ETH_TO_STX') {
      if (!isEthConnected || !walletClient) {
        setError('Please connect your Ethereum wallet')
        return
      }
      if (!publicClient) {
        setError('Ethereum network connection failed')
        return
      }
      
      if (needsApproval) {
        handleApprove()
      } else {
        handleBridge()
      }
    } else {
      if (!isStacksConnected || !stacksAddress) {
        setError('Please connect your Stacks wallet')
        return
      }
      handleWithdraw()
    }
  }
   
   // Show loading state while decoding invoice
   if (isLoading) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-20">
          <Loader2 className="w-16 h-16 text-red-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-white mb-2 font-display">Loading Invoice</h1>
          <p className="text-white/60 mb-8">
            Please wait while we decode your invoice...
          </p>
        </div>
      </Layout>
    )
  }

  if (!invoiceParam) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2 font-display">No Invoice Found</h1>
          <p className="text-white/40 mb-8">
            This page requires a valid invoice link.
          </p>
          <Button onClick={() => navigate('/create')} variant="outline" className="border-white/10 hover:bg-white/5 text-white">
            Create an Invoice
          </Button>
        </div>
      </Layout>
    )
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-red-500/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2 font-display">Invalid Invoice</h1>
          <p className="text-white/60 mb-2">
            {error || 'The invoice data could not be decoded.'}
          </p>
          <p className="text-xs text-white/40 mb-8">
            Please check the invoice link and try again.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/create')} className="bg-red-600 hover:bg-red-700 text-white">
              Create New Invoice
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="border-white/10 hover:bg-white/5 text-white">
              Go Home
            </Button>
          </div>
        </div>
      </Layout>
    )
  }

  const isEthToStx = invoice.direction === 'ETH_TO_STX'
  const requiredWalletConnected = isEthToStx ? isEthConnected : isStacksConnected
  const balance = isEthToStx ? ethUsdcBalance : stxUsdcxBalance
  const hasEnoughBalance = parseFloat(balance) >= parseFloat(invoice.amount)
  
  // Validate minimum amount
  const minAmount = isEthToStx ? TESTNET.limits.minDeposit : TESTNET.limits.minWithdraw
  const meetsMinimum = parseFloat(invoice.amount) >= minAmount
  const amountError = !meetsMinimum ? `Amount must be at least ${minAmount} ${isEthToStx ? 'USDC' : 'USDCx'}` : null

  return (
    <Layout>
      <div className="max-w-lg mx-auto space-y-4 pt-2">
        {/* Header */}
        <div className="text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-electric-lime/20 blur-[50px] rounded-full pointer-events-none" />
          <h1 className="text-3xl font-display font-black text-white mb-1 tracking-tight drop-shadow-sm relative z-10">
            Pay Invoice
          </h1>
          <p className="text-white/60 font-light text-sm relative z-10">
            Review and complete payment
          </p>
        </div>

        {/* Invoice Card */}
        <Card className="clay-card overflow-visible relative">
          <CardHeader className="pb-0 pt-5 px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 mx-auto mb-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isEthToStx ? 'bg-electric-lime shadow-[0_0_8px_#D9FF00]' : 'bg-electric-purple shadow-[0_0_8px_#BD00FF]'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                {isEthToStx ? 'ETH → STX Bridge' : 'STX → ETH Bridge'}
              </span>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-5 px-6 pb-6">
            
            {/* Amount - Hero Display */}
            <div className="text-center space-y-1">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl md:text-5xl font-display font-black text-white tracking-tighter drop-shadow-sm">
                  {formatAmount(invoice.amount)}
                </span>
                <span className={`text-lg font-bold font-display ${isEthToStx ? 'text-electric-lime' : 'text-electric-purple'}`}>
                  {isEthToStx ? 'USDC' : 'USDCx'}
                </span>
              </div>
              <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">Total Amount Due</p>
            </div>

            {/* Visual Route */}
            <div className="relative h-14 flex items-center justify-between px-8">
              {/* Connector Line */}
              <div className="absolute left-14 right-14 top-1/2 -translate-y-1/2 h-[1px] bg-white/5">
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 animate-[shimmer_2s_infinite] ${isEthToStx ? 'via-electric-lime/50' : 'via-electric-purple/50'}`} />
              </div>

              {/* Source Node */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-display font-bold shadow-lg border border-white/10 bg-[#1a1033]`}>
                  <span className="text-white">$</span>
                </div>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{isEthToStx ? 'Ethereum' : 'Stacks'}</span>
              </div>

              {/* Arrow */}
              <div className="relative z-10 w-6 h-6 rounded-full bg-[#0f081e] border border-white/10 flex items-center justify-center shadow-lg">
                <ArrowRight className="w-3 h-3 text-white/40" />
              </div>

              {/* Dest Node */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-display font-bold shadow-lg border border-white/10 bg-[#1a1033]`}>
                  <span className={isEthToStx ? 'text-electric-lime' : 'text-white'}>S</span>
                </div>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{isEthToStx ? 'Stacks' : 'Ethereum'}</span>
              </div>
            </div>

            {/* Details Panel (Inset) */}
            <div className="rounded-2xl bg-[#08040d] p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] border border-white/10 space-y-3">
              {/* Recipient */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Recipient</p>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Wallet className="w-3 h-3 text-white/70" />
                  </div>
                  <p className="font-mono text-xs text-white break-all leading-relaxed">
                    {invoice.recipient}
                  </p>
                </div>
              </div>

              {/* Memo */}
              {invoice.memo && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest ml-1">Memo</p>
                  <p className="text-sm text-white/90 italic px-2 font-medium">
                    "{invoice.memo}"
                  </p>
                </div>
              )}

              {/* Errors */}
              {amountError && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{amountError}</span>
                </div>
              )}
              
              {/* General Error */}
              {error && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Balance Check */}
            {requiredWalletConnected && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${hasEnoughBalance ? 'bg-electric-lime shadow-[0_0_5px_#D9FF00]' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Wallet Balance</span>
                </div>
                <span className={`text-xs font-mono ${hasEnoughBalance ? 'text-white' : 'text-red-400'}`}>
                  {formatAmount(balance)} {isEthToStx ? 'USDC' : 'USDCx'}
                </span>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && txHash && (
              <div className="p-4 rounded-xl bg-electric-lime/10 border border-electric-lime/20 text-electric-lime space-y-2 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-center gap-2 font-bold font-display text-base">
                  <CheckCircle className="w-5 h-5" />
                  Payment Sent!
                </div>
                <p className="text-center text-[10px] text-white/60">Redirecting to tracker...</p>
              </div>
            )}

            {/* Actions */}
            {!requiredWalletConnected ? (
              <div className="text-center space-y-2 py-1">
                <p className="text-xs font-medium text-white/60">Connect wallet to pay</p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {isEthToStx && needsApproval && status !== 'success' && (
                  <div className="bg-[#0f081e] p-3 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">Allowance</span>
                      <button onClick={handleRefreshAllowance} className="text-white/40 hover:text-white transition-colors">
                        <RefreshCw className={`w-3 h-3 ${isRefreshingAllowance ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-display font-bold text-white">{formatAmount(formatUnits(allowance, 6))}</span>
                      <span className="text-[10px] font-mono text-white/40">Approved</span>
                    </div>
                  </div>
                )}

                <Button 
                  className={`w-full h-14 text-base font-bold rounded-2xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] ${
                    needsApproval && isEthToStx
                      ? 'bg-electric-purple hover:bg-electric-purple/90 shadow-[0_0_20px_-5px_rgba(189,0,255,0.4)] text-white' 
                      : 'clay-btn-primary text-black'
                  }`}
                  onClick={isEthToStx && needsApproval ? handleApprove : handlePay}
                  disabled={status === 'approving' || status === 'bridging' || status === 'success' || !hasEnoughBalance || !meetsMinimum}
                >
                  {(status === 'approving' || status === 'bridging') && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {status === 'approving' ? 'Approving USDC...' :
                   status === 'bridging' ? 'Processing Bridge...' :
                   status === 'success' ? 'Success!' :
                   needsApproval && isEthToStx ? `Approve ${formatAmount(invoice.amount)} USDC` :
                   `Pay ${formatAmount(invoice.amount)} ${isEthToStx ? 'USDC' : 'USDCx'}`}
                </Button>
              </div>
            )}

            {/* Footer Info */}
            <div className="text-center space-y-0.5 pt-2 border-t border-white/5">
              <p className="text-[9px] text-white/20 font-mono uppercase tracking-[0.2em]">
                Est. Time: ~{isEthToStx ? '15' : '25'} min
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
