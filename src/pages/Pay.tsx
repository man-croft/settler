import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatUnits } from 'viem'
import { AlertCircle, Loader2, CheckCircle, ArrowRight, ExternalLink, CreditCard, Wallet } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [_allowance, setAllowance] = useState<bigint>(0n)
  const [needsApproval, setNeedsApproval] = useState(true)
  
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

  // Check USDC allowance for ETH_TO_STX direction
  useEffect(() => {
    async function checkAllowance() {
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
    
    checkAllowance()
  }, [publicClient, ethAddress, invoice])

  const handleApprove = async () => {
    if (!invoice || !walletClient || !publicClient) return
    setError(null)

    try {
      setStatus('approving')
      const approveTxHash = await approveUsdc(walletClient, invoice.amount)
      
      // Wait for approval to be confirmed
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
      
      // Refresh allowance
      const newAllowance = await getUsdcAllowance(publicClient, ethAddress as `0x${string}`)
      setAllowance(newAllowance)
      
      const requiredAmount = BigInt(Math.floor(parseFloat(invoice.amount) * 1_000_000))
      setNeedsApproval(newAllowance < requiredAmount)
      
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
    if (!invoice || !walletClient) return
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
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 font-display tracking-wide">Pay Invoice</h1>
          <p className="text-white/60">
            Review and complete this cross-chain payment
          </p>
        </div>

        {/* Invoice Card */}
        <Card className="glass-card glow-white overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center justify-between font-display">
              <span>Invoice Details</span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/60 font-mono font-normal">
                {isEthToStx ? 'ETH → STX' : 'STX → ETH'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Visual Route */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex items-center justify-center gap-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50" />
              
              <div className="text-center relative z-10">
                <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg border border-white/10">
                  {isEthToStx ? '$' : 'S'}
                </div>
                <p className="text-sm font-bold text-white">{isEthToStx ? 'USDC' : 'USDCx'}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono mt-1">{isEthToStx ? 'ETHEREUM' : 'STACKS'}</p>
              </div>

              <div className="flex flex-col items-center gap-2 text-white/20">
                <ArrowRight className="w-6 h-6 animate-pulse" />
              </div>

              <div className="text-center relative z-10">
                <div className="w-16 h-16 rounded-xl bg-red-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg shadow-red-900/30">
                  {isEthToStx ? 'S' : '$'}
                </div>
                <p className="text-sm font-bold text-white">{isEthToStx ? 'USDCx' : 'USDC'}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-mono mt-1">{isEthToStx ? 'STACKS' : 'ETHEREUM'}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-mono">Amount Due</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold text-white font-display tracking-tight">
                  {formatAmount(invoice.amount)}
                </p>
                <span className="text-lg font-medium text-white/40">{isEthToStx ? 'USDC' : 'USDCx'}</span>
              </div>
            </div>

            {/* Recipient */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-mono">Recipient Address</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-white/60" />
                </div>
                <p className="font-mono text-sm text-white/80 break-all leading-relaxed">
                  {invoice.recipient}
                </p>
              </div>
            </div>

            {/* Memo (if present) */}
            {invoice.memo && (
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-mono">Memo</p>
                <p className="text-sm text-white/80 italic">
                  "{invoice.memo}"
                </p>
              </div>
            )}

            {/* Amount Error */}
            {amountError && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {amountError}
              </div>
            )}

            {/* Balance Check */}
            {requiredWalletConnected && (
              <div className={`p-4 rounded-xl border flex items-center justify-between ${hasEnoughBalance ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center gap-3">
                  <CreditCard className={`w-5 h-5 ${hasEnoughBalance ? 'text-emerald-400' : 'text-red-400'}`} />
                  <div>
                    <p className={`text-xs font-bold ${hasEnoughBalance ? 'text-emerald-400' : 'text-red-400'}`}>
                      {hasEnoughBalance ? 'Sufficient Balance' : 'Insufficient Balance'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      Available: {formatAmount(balance)} {isEthToStx ? 'USDC' : 'USDCx'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">Payment Error</p>
                    <p className="text-xs text-red-400/80 leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success */}
            {status === 'success' && txHash && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <CheckCircle className="w-6 h-6" />
                  Payment Submitted!
                </div>
                <p className="text-sm text-emerald-400/80">
                  Redirecting to tracker...
                </p>
                <a 
                  href={isEthToStx 
                    ? `${TESTNET.ethereum.blockExplorer}/tx/${txHash}` 
                    : `${TESTNET.stacks.blockExplorer}/txid/${txHash}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 underline hover:text-white transition-colors w-fit"
                >
                  View on Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Action Button */}
            {!requiredWalletConnected ? (
              <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center space-y-3">
                <p className="text-white text-sm font-medium">
                  Connect your <span className="text-red-400">{isEthToStx ? 'Ethereum' : 'Stacks'}</span> wallet to pay
                </p>
                <p className="text-xs text-white/40">
                  Use the wallet buttons in the top right
                </p>
              </div>
            ) : (
              isEthToStx ? (
                <div className="space-y-3">
                  {/* Approval status indicator */}
                  {!needsApproval && status !== 'success' && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm justify-center py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <CheckCircle className="w-4 h-4" />
                      <span>USDC Approved</span>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full h-16 text-lg bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    onClick={handlePay}
                    disabled={status === 'approving' || status === 'bridging' || status === 'success' || !hasEnoughBalance || !meetsMinimum}
                  >
                    {(status === 'approving' || status === 'bridging') && (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    )}
                    {status === 'approving' ? 'Approving USDC...' :
                     status === 'bridging' ? 'Bridging to Stacks...' :
                     status === 'success' ? 'Payment Sent!' :
                     needsApproval ? `Approve ${formatAmount(invoice.amount)} USDC` :
                     `Bridge ${formatAmount(invoice.amount)} USDC`}
                  </Button>
                </div>
              ) : (
                <Button 
                  className="w-full h-16 text-lg bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={handlePay}
                  disabled={status === 'bridging' || status === 'success' || !hasEnoughBalance || !meetsMinimum}
                >
                  {status === 'bridging' && (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  )}
                  {status === 'bridging' ? 'Processing...' :
                   status === 'success' ? 'Payment Sent!' :
                   `Pay ${formatAmount(invoice.amount)} USDCx`}
                </Button>
              )
            )}

            {/* Footer Info */}
            <div className="text-center text-[10px] text-white/30 pt-2 font-mono uppercase tracking-widest space-y-1">
              <p>Estimated completion: ~{isEthToStx ? '15' : '25'} minutes</p>
              <p>Network fee: {isEthToStx ? 'Gas only' : '~$4.80 bridging fee'}</p>
            </div>

          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
