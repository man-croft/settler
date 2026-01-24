import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatUnits } from 'viem'
import { AlertCircle, Loader2, CheckCircle, ArrowRight, Wallet, RefreshCw } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
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
    
    if (!parsed || typeof parsed !== 'object') {
      return { data: null, error: 'Invalid invoice format' }
    }
    
    if (!parsed.direction || !parsed.amount || !parsed.recipient) {
      return { data: null, error: 'Missing required invoice fields' }
    }
    
    if (parsed.direction !== 'ETH_TO_STX' && parsed.direction !== 'STX_TO_ETH') {
      return { data: null, error: 'Invalid bridge direction' }
    }
    
    const amount = parseFloat(parsed.amount)
    if (isNaN(amount) || amount <= 0) {
      return { data: null, error: 'Invalid amount (must be greater than 0)' }
    }
    
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
  
  const { address: ethAddress, isConnected: isEthConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [ethUsdcBalance, setEthUsdcBalance] = useState<string>('0')
  
  const { stacksAddress, isStacksConnected } = useWalletStore()
  const [stxUsdcxBalance, setStxUsdcxBalance] = useState<string>('0')
  
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

  useEffect(() => {
    checkAllowance()
  }, [publicClient, ethAddress, invoice])

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
      
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash })
      
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

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto text-center py-32 px-8">
          <Loader2 className="w-12 h-12 text-white/20 mx-auto mb-6 animate-spin" />
          <h1 
            className="text-white mb-2"
            style={{ fontSize: '1.5rem', fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Loading Invoice
          </h1>
          <p className="text-white/40">Please wait...</p>
        </div>
      </Layout>
    )
  }

  if (!invoiceParam) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto text-center py-32 px-8">
          <div className="w-16 h-16 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white/20" />
          </div>
          <h1 
            className="text-white mb-2"
            style={{ fontSize: '1.5rem', fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            No Invoice Found
          </h1>
          <p className="text-white/40 mb-8">This page requires a valid invoice link.</p>
          <Button onClick={() => navigate('/create')} className="btn-minimal rounded-none">
            Create an Invoice
          </Button>
        </div>
      </Layout>
    )
  }

  if (!invoice) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto text-center py-32 px-8">
          <div className="w-16 h-16 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500/50" />
          </div>
          <h1 
            className="text-white mb-2"
            style={{ fontSize: '1.5rem', fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            Invalid Invoice
          </h1>
          <p className="text-white/60 mb-2">{error || 'The invoice data could not be decoded.'}</p>
          <p className="text-xs text-white/30 mb-8">Please check the invoice link and try again.</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/create')} className="btn-minimal rounded-none">
              Create New Invoice
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="btn-outline-minimal rounded-none">
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
  
  const minAmount = isEthToStx ? TESTNET.limits.minDeposit : TESTNET.limits.minWithdraw
  const meetsMinimum = parseFloat(invoice.amount) >= minAmount
  const amountError = !meetsMinimum ? `Amount must be at least ${minAmount} ${isEthToStx ? 'USDC' : 'USDCx'}` : null

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-8 lg:px-16 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
            {isEthToStx ? 'Ethereum → Stacks' : 'Stacks → Ethereum'}
          </p>
          <h1 
            className="text-white"
            style={{ 
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              fontFamily: "'Instrument Serif', Georgia, serif",
              lineHeight: 1,
              letterSpacing: '-0.02em'
            }}
          >
            Pay <span style={{ fontStyle: 'italic', color: '#FF4D00' }}>Invoice</span>
          </h1>
        </div>

        {/* Amount Display */}
        <div className="text-center mb-16 py-12 border-y border-white/5">
          <p 
            className="text-white mb-2"
            style={{ 
              fontSize: 'clamp(3rem, 10vw, 6rem)',
              fontFamily: "'Instrument Serif', Georgia, serif"
            }}
          >
            {formatAmount(invoice.amount)}
          </p>
          <p className="text-xl text-white/40">
            {isEthToStx ? 'USDC' : 'USDCx'}
          </p>
        </div>

        {/* Bridge Visual */}
        <div className="flex items-center justify-center gap-8 mb-16">
          <div className="text-center">
            <p 
              className="mb-2"
              style={{ 
                fontSize: '2.5rem',
                fontFamily: "'Instrument Serif', Georgia, serif",
                color: '#FAFAFA'
              }}
            >
              {isEthToStx ? '$' : 'S'}
            </p>
            <p className="text-xs text-white/30 uppercase tracking-widest">{isEthToStx ? 'Ethereum' : 'Stacks'}</p>
          </div>
          <ArrowRight className="w-6 h-6 text-white/20" />
          <div className="text-center">
            <p 
              className="mb-2"
              style={{ 
                fontSize: '2.5rem',
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: 'italic',
                color: '#FF4D00'
              }}
            >
              {isEthToStx ? 'S' : '$'}
            </p>
            <p className="text-xs text-white/30 uppercase tracking-widest">{isEthToStx ? 'Stacks' : 'Ethereum'}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6 mb-12">
          {/* Recipient */}
          <div className="p-6 border border-white/5 bg-white/[0.01]">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Recipient</p>
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-white/30" />
              <p className="font-mono text-sm text-white break-all">{invoice.recipient}</p>
            </div>
          </div>

          {/* Memo */}
          {invoice.memo && (
            <div className="p-6 border border-white/5 bg-white/[0.01]">
              <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Memo</p>
              <p className="text-white/80 italic">"{invoice.memo}"</p>
            </div>
          )}

          {/* Balance */}
          {requiredWalletConnected && (
            <div className="flex items-center justify-between p-6 border border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${hasEnoughBalance ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-white/30 uppercase tracking-widest">Your Balance</span>
              </div>
              <span className={`font-mono ${hasEnoughBalance ? 'text-white' : 'text-red-400'}`}>
                {formatAmount(balance)} {isEthToStx ? 'USDC' : 'USDCx'}
              </span>
            </div>
          )}

          {/* Allowance (ETH to STX only) */}
          {isEthToStx && needsApproval && requiredWalletConnected && status !== 'success' && (
            <div className="flex items-center justify-between p-6 border border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/30 uppercase tracking-widest">Allowance</span>
                <button onClick={handleRefreshAllowance} className="text-white/30 hover:text-white transition-colors">
                  <RefreshCw className={`w-3 h-3 ${isRefreshingAllowance ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <span className="font-mono text-white/60">{formatAmount(formatUnits(allowance, 6))} USDC</span>
            </div>
          )}

          {/* Errors */}
          {(amountError || error) && (
            <div className="p-6 border border-red-500/20 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{amountError || error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {status === 'success' && txHash && (
            <div className="p-8 border border-green-500/20 bg-green-500/5 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 
                className="text-white mb-2"
                style={{ fontSize: '1.25rem', fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                Payment Sent!
              </h3>
              <p className="text-white/40 text-sm">Redirecting to tracker...</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!requiredWalletConnected ? (
          <div className="text-center py-8 border border-white/5">
            <p className="text-white/40">Connect your {isEthToStx ? 'Ethereum' : 'Stacks'} wallet to pay</p>
          </div>
        ) : status !== 'success' && (
          <Button 
            className={`w-full h-16 text-lg rounded-none ${
              needsApproval && isEthToStx
                ? 'bg-white/10 text-white border border-white/20 hover:bg-white/20' 
                : 'btn-minimal'
            }`}
            onClick={handlePay}
            disabled={status === 'approving' || status === 'bridging' || !hasEnoughBalance || !meetsMinimum}
          >
            {(status === 'approving' || status === 'bridging') && (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            )}
            {status === 'approving' ? 'Approving USDC...' :
             status === 'bridging' ? 'Processing...' :
             needsApproval && isEthToStx ? `Approve ${formatAmount(invoice.amount)} USDC` :
             `Pay ${formatAmount(invoice.amount)} ${isEthToStx ? 'USDC' : 'USDCx'}`}
          </Button>
        )}

        {/* Footer Info */}
        <p className="text-center text-xs text-white/20 mt-8">
          Estimated time: ~{isEthToStx ? '15' : '25'} minutes
        </p>
      </div>
    </Layout>
  )
}
