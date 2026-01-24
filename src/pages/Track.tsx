import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { usePublicClient } from 'wagmi'
import { CheckCircle, Clock, Loader2, XCircle, ExternalLink, RefreshCw, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, shortenAddress } from '@/lib/utils'
import { TESTNET } from '@/lib/constants'
import { Layout } from '@/components/layout/Layout'

type BridgeStatus = 'pending' | 'confirming' | 'bridging' | 'complete' | 'failed'

interface TrackingState {
  status: BridgeStatus
  ethTxConfirmed: boolean
  ethTxBlockNumber?: number
  stacksMintTxId?: string
  stacksBurnConfirmed?: boolean
  ethReleaseTxHash?: string
  error?: string
  lastChecked: Date
}

interface Step {
  id: string
  label: string
  description: string
}

const ethToStxSteps: Step[] = [
  { id: 'confirming', label: 'Transaction Confirmed', description: 'Deposit confirmed on Ethereum' },
  { id: 'bridging', label: 'Bridging via Circle', description: 'Attestation processing (~15 min)' },
  { id: 'complete', label: 'USDCx Minted', description: 'Tokens minted on Stacks' },
]

const stxToEthSteps: Step[] = [
  { id: 'confirming', label: 'Burn Confirmed', description: 'USDCx burn confirmed on Stacks' },
  { id: 'bridging', label: 'Attesting', description: 'Circle attestation (~25 min)' },
  { id: 'complete', label: 'USDC Released', description: 'USDC released on Ethereum' },
]

function StepIndicator({ 
  step, 
  currentStatus, 
  isLast,
  index
}: { 
  step: Step
  currentStatus: BridgeStatus
  isLast: boolean
  index: number
}) {
  const statusOrder = ['pending', 'confirming', 'bridging', 'complete']
  const stepIndex = statusOrder.indexOf(step.id)
  const currentIndex = statusOrder.indexOf(currentStatus)
  
  const isComplete = stepIndex < currentIndex || currentStatus === 'complete'
  const isCurrent = step.id === currentStatus && currentStatus !== 'complete'
  const isFailed = currentStatus === 'failed' && step.id === currentStatus

  return (
    <div className="flex gap-6 group">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-10 h-10 flex items-center justify-center border-2 transition-all duration-500',
            isComplete && 'border-[#FF4D00]',
            isCurrent && !isFailed && 'border-[#FF4D00]',
            isFailed && 'bg-red-500 border-red-500',
            !isComplete && !isCurrent && 'border-white/10'
          )}
          style={isComplete ? { backgroundColor: '#FF4D00' } : undefined}
        >
          {isComplete && <CheckCircle className="h-5 w-5 text-white" />}
          {isCurrent && !isFailed && <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#FF4D00' }} />}
          {isFailed && <XCircle className="h-5 w-5 text-white" />}
          {!isComplete && !isCurrent && !isFailed && (
            <span className="text-xs font-mono text-white/20">{String(index + 1).padStart(2, '0')}</span>
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-px flex-1 min-h-[40px] transition-colors duration-700',
              isComplete ? 'bg-[#FF4D00]' : 'bg-white/10'
            )}
          />
        )}
      </div>

      <div className="pb-8 pt-2 flex-1">
        <h3
          className={cn(
            'mb-1 transition-colors duration-300',
            isFailed && 'text-red-400',
            !isComplete && !isCurrent && 'text-white/30'
          )}
          style={{ 
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: '1.125rem',
            color: isComplete ? '#FF4D00' : isCurrent && !isFailed ? '#FAFAFA' : undefined
          }}
        >
          {step.label}
        </h3>
        <p className={cn(
          "text-sm transition-colors duration-300",
          isCurrent ? "text-white/60" : "text-white/30"
        )}>{step.description}</p>
      </div>
    </div>
  )
}

export function TrackPage() {
  const [searchParams] = useSearchParams()
  const txHash = searchParams.get('tx') as `0x${string}` | null
  const direction = searchParams.get('dir') as 'ETH_TO_STX' | 'STX_TO_ETH' | null
  const recipient = searchParams.get('to')
  const hookData = searchParams.get('hookData')
  
  const publicClient = usePublicClient()
  
  const [tracking, setTracking] = useState<TrackingState>({
    status: 'pending',
    ethTxConfirmed: false,
    lastChecked: new Date(),
  })
  const [isPolling, setIsPolling] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)
  
  const steps = direction === 'STX_TO_ETH' ? stxToEthSteps : ethToStxSteps

  const checkEthTxStatus = useCallback(async () => {
    if (!publicClient || !txHash || direction !== 'ETH_TO_STX') return
    
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
      
      if (receipt) {
        if (receipt.status === 'success') {
          setTracking(prev => ({
            ...prev,
            ethTxConfirmed: true,
            ethTxBlockNumber: Number(receipt.blockNumber),
            status: prev.status === 'pending' ? 'confirming' : prev.status,
            lastChecked: new Date(),
          }))
          
          setTimeout(() => {
            setTracking(prev => ({
              ...prev,
              status: 'bridging',
              lastChecked: new Date(),
            }))
          }, 2000)
          
        } else if (receipt.status === 'reverted') {
          setTracking(prev => ({
            ...prev,
            status: 'failed',
            error: 'Transaction reverted on Ethereum',
            lastChecked: new Date(),
          }))
          setIsPolling(false)
        }
      }
    } catch (err) {
      console.error('Error checking ETH tx:', err)
    }
  }, [publicClient, txHash, direction])

  const checkStacksMint = useCallback(async () => {
    if (tracking.status !== 'bridging' || direction !== 'ETH_TO_STX') return
    
    try {
      const response = await fetch(
        `https://api.testnet.hiro.so/extended/v1/contract/${TESTNET.stacks.usdcxV1}/events?limit=50`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        const mintEvent = data.results?.find((event: any) => {
          if (event.event_type !== 'smart_contract_log') return false
          
          const repr = event.contract_log?.value?.repr || ''
          
          if (!repr.includes('(topic "mint")') && !repr.includes('(topic \\"mint\\")')) return false
          
          if (hookData && hookData !== '0x' && hookData.length > 2) {
            const hookDataWithoutPrefix = hookData.replace('0x', '').toLowerCase()
            return repr.toLowerCase().includes(`(hook-data 0x${hookDataWithoutPrefix})`)
          }
          
          if (recipient) {
            return repr.includes(`(remote-recipient '${recipient})`)
          }
          
          return false
        })
        
        if (mintEvent) {
          setTracking(prev => ({
            ...prev,
            status: 'complete',
            stacksMintTxId: mintEvent.tx_id,
            lastChecked: new Date(),
          }))
          setIsPolling(false)
        }
      }
    } catch (err) {
      console.error('Error checking Stacks mint:', err)
    }
  }, [tracking.status, direction, hookData, recipient])

  const checkStacksBurn = useCallback(async () => {
    if (!txHash || direction !== 'STX_TO_ETH') return
    
    try {
      const response = await fetch(
        `https://api.testnet.hiro.so/extended/v1/tx/${txHash}`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.tx_status === 'success') {
          setTracking(prev => ({
            ...prev,
            stacksBurnConfirmed: true,
            status: prev.status === 'pending' ? 'confirming' : prev.status,
            lastChecked: new Date(),
          }))
          
          setTimeout(() => {
            setTracking(prev => ({
              ...prev,
              status: 'bridging',
              lastChecked: new Date(),
            }))
          }, 2000)
        } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
          setTracking(prev => ({
            ...prev,
            status: 'failed',
            error: 'Burn transaction failed on Stacks',
            lastChecked: new Date(),
          }))
          setIsPolling(false)
        }
      }
    } catch (err) {
      console.error('Error checking Stacks burn:', err)
    }
  }, [txHash, direction])

  const checkEthRelease = useCallback(async () => {
    if (!recipient || !publicClient || tracking.status !== 'bridging' || direction !== 'STX_TO_ETH') return
    
    try {
      const currentBlock = await publicClient.getBlockNumber()
      const fromBlock = currentBlock - 1000n
      
      const logs = await publicClient.getLogs({
        address: TESTNET.ethereum.usdc,
        event: {
          type: 'event',
          name: 'Transfer',
          inputs: [
            { type: 'address', indexed: true, name: 'from' },
            { type: 'address', indexed: true, name: 'to' },
            { type: 'uint256', indexed: false, name: 'value' }
          ]
        },
        args: {
          to: recipient as `0x${string}`,
        },
        fromBlock,
        toBlock: currentBlock,
      })

      const releaseLog = logs.find(log => 
        log.address.toLowerCase() === TESTNET.ethereum.usdc.toLowerCase()
      )

      if (releaseLog) {
        setTracking(prev => ({
          ...prev,
          status: 'complete',
          ethReleaseTxHash: releaseLog.transactionHash,
          lastChecked: new Date(),
        }))
        setIsPolling(false)
      }
    } catch (err) {
      console.error('Error checking ETH release:', err)
    }
  }, [recipient, publicClient, tracking.status, direction])

  useEffect(() => {
    if (!isPolling || !txHash) return
    
    if (direction === 'ETH_TO_STX') {
      checkEthTxStatus()
    } else {
      checkStacksBurn()
    }
    
    const interval = setInterval(() => {
      if (direction === 'ETH_TO_STX') {
        if (tracking.status === 'pending' || tracking.status === 'confirming') {
          checkEthTxStatus()
        } else if (tracking.status === 'bridging') {
          checkStacksMint()
        }
      } else {
        if (tracking.status === 'pending' || tracking.status === 'confirming') {
          checkStacksBurn()
        } else if (tracking.status === 'bridging') {
          checkEthRelease()
        }
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [isPolling, txHash, tracking.status, direction, checkEthTxStatus, checkStacksMint, checkStacksBurn, checkEthRelease])

  useEffect(() => {
    if (tracking.status === 'complete' || tracking.status === 'failed') return
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [tracking.status])

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRefresh = () => {
    setIsPolling(true)
    if (direction === 'ETH_TO_STX') {
      checkEthTxStatus()
      if (tracking.status === 'bridging') {
        checkStacksMint()
      }
    } else {
      checkStacksBurn()
      if (tracking.status === 'bridging') {
        checkEthRelease()
      }
    }
  }

  if (!txHash) {
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
            No Transaction
          </h1>
          <p className="text-white/40 mb-8">Please provide a transaction hash to track.</p>
          <Link to="/">
            <Button variant="outline" className="btn-outline-minimal rounded-none">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-8 lg:px-16 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
            {direction === 'STX_TO_ETH' ? 'Stacks → Ethereum' : 'Ethereum → Stacks'}
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
            Bridge <span style={{ fontStyle: 'italic', color: '#FF4D00' }}>Status</span>
          </h1>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <Clock className="w-5 h-5 text-white/30" />
          <span className="font-mono text-2xl text-white">{formatElapsedTime(elapsedTime)}</span>
        </div>

        {/* Steps */}
        <div className="mb-12">
          {steps.map((step, index) => (
            <StepIndicator
              key={step.id}
              step={step}
              currentStatus={tracking.status}
              isLast={index === steps.length - 1}
              index={index}
            />
          ))}
        </div>

        {/* Transaction Details */}
        <div className="space-y-4 mb-12">
          {/* Source TX */}
          <div className="p-6 border border-white/5 bg-white/[0.01] flex items-center justify-between">
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-2">
                {direction === 'STX_TO_ETH' ? 'Burn Transaction' : 'Deposit Transaction'}
              </p>
              <p className="font-mono text-sm text-white">{shortenAddress(txHash, 8)}</p>
            </div>
            <a 
              href={direction === 'STX_TO_ETH' 
                ? `${TESTNET.stacks.blockExplorer}/txid/${txHash}?chain=testnet`
                : `${TESTNET.ethereum.blockExplorer}/tx/${txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 transition-all"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Confirmation Badge */}
          {(tracking.ethTxConfirmed || tracking.stacksBurnConfirmed) && (
            <div className="p-4 border border-green-500/20 bg-green-500/5 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-400">
                {tracking.ethTxConfirmed ? `Confirmed in block #${tracking.ethTxBlockNumber}` : 'Burn confirmed on Stacks'}
              </span>
            </div>
          )}

          {/* Mint TX */}
          {tracking.stacksMintTxId && (
            <div className="p-6 border bg-[#FF4D00]/5 flex items-center justify-between animate-fade-in" style={{ borderColor: 'rgba(255, 77, 0, 0.2)' }}>
              <div>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#FF4D00' }}>Stacks Mint Transaction</p>
                <p className="font-mono text-sm text-white">{shortenAddress(tracking.stacksMintTxId, 8)}</p>
              </div>
              <a 
                href={`${TESTNET.stacks.blockExplorer}/txid/${tracking.stacksMintTxId}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border flex items-center justify-center transition-all"
                style={{ borderColor: 'rgba(255, 77, 0, 0.3)', color: '#FF4D00' }}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Release TX */}
          {tracking.ethReleaseTxHash && (
            <div className="p-6 border bg-[#FF4D00]/5 flex items-center justify-between animate-fade-in" style={{ borderColor: 'rgba(255, 77, 0, 0.2)' }}>
              <div>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#FF4D00' }}>Ethereum Release Transaction</p>
                <p className="font-mono text-sm text-white">{shortenAddress(tracking.ethReleaseTxHash, 8)}</p>
              </div>
              <a 
                href={`${TESTNET.ethereum.blockExplorer}/tx/${tracking.ethReleaseTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 border flex items-center justify-center transition-all"
                style={{ borderColor: 'rgba(255, 77, 0, 0.3)', color: '#FF4D00' }}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {/* Error */}
          {tracking.error && (
            <div className="p-6 border border-red-500/20 bg-red-500/5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Error</p>
                <p className="text-xs text-red-400/70">{tracking.error}</p>
              </div>
            </div>
          )}

          {/* Waiting Message */}
          {tracking.status === 'bridging' && (
            <div className="p-6 border border-white/5 bg-white/[0.01] flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-white/30 animate-spin shrink-0 mt-0.5" />
              <p className="text-sm text-white/40">
                Circle's attestation service is verifying your transfer. 
                Est. time: ~{direction === 'ETH_TO_STX' ? '15' : '25'} minutes
              </p>
            </div>
          )}

          {/* Success */}
          {tracking.status === 'complete' && (
            <div className="p-8 border text-white text-center animate-fade-in" style={{ borderColor: '#FF4D00', backgroundColor: '#FF4D00' }}>
              <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              <h3 
                className="mb-2"
                style={{ fontSize: '1.25rem', fontFamily: "'Instrument Serif', Georgia, serif" }}
              >
                Bridge Complete!
              </h3>
              <p className="text-sm opacity-70">Your funds have been delivered.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            className="flex-1 btn-outline-minimal h-14 rounded-none"
            onClick={handleRefresh}
            disabled={tracking.status === 'complete'}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link to="/treasury" className="flex-1">
            <Button className="w-full btn-minimal h-14 rounded-none">
              View Treasury
            </Button>
          </Link>
        </div>

        {/* Last Checked */}
        <p className="text-center text-xs text-white/20 mt-8">
          Last checked: {tracking.lastChecked.toLocaleTimeString()}
        </p>
      </div>
    </Layout>
  )
}
