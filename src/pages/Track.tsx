import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { usePublicClient } from 'wagmi'
import { CheckCircle, Clock, Loader2, XCircle, ExternalLink, RefreshCw, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
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
  { id: 'confirming', label: 'Transaction Confirmed', description: 'Deposit transaction confirmed on Ethereum' },
  { id: 'bridging', label: 'Bridging via Circle', description: 'Attestation service processing transfer (~15 min)' },
  { id: 'complete', label: 'USDCx Minted', description: 'Tokens minted on Stacks' },
]

const stxToEthSteps: Step[] = [
  { id: 'confirming', label: 'Burn Confirmed', description: 'USDCx burn transaction confirmed on Stacks' },
  { id: 'bridging', label: 'Attesting', description: 'Circle attestation service processing (~25 min)' },
  { id: 'complete', label: 'USDC Released', description: 'USDC released on Ethereum' },
]

function StepIndicator({ 
  step, 
  currentStatus, 
  isLast 
}: { 
  step: Step
  currentStatus: BridgeStatus
  isLast: boolean 
}) {
  const statusOrder = ['pending', 'confirming', 'bridging', 'complete']
  const stepIndex = statusOrder.indexOf(step.id)
  const currentIndex = statusOrder.indexOf(currentStatus)
  
  const isComplete = stepIndex < currentIndex || currentStatus === 'complete'
  const isCurrent = step.id === currentStatus && currentStatus !== 'complete'
  const isFailed = currentStatus === 'failed' && step.id === currentStatus

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 relative z-10',
            isComplete && 'bg-electric-lime border-electric-lime shadow-[0_0_15px_rgba(217,255,0,0.3)] scale-110',
            isCurrent && !isFailed && 'border-electric-lime bg-electric-lime/10 shadow-[0_0_10px_rgba(217,255,0,0.2)] animate-pulse',
            isFailed && 'bg-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
            !isComplete && !isCurrent && 'border-white/10 bg-[#0f081e] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]'
          )}
        >
          {isComplete && <CheckCircle className="h-4 w-4 text-black" />}
          {isCurrent && !isFailed && <Loader2 className="h-4 w-4 text-electric-lime animate-spin" />}
          {isFailed && <XCircle className="h-4 w-4 text-white" />}
          {!isComplete && !isCurrent && <Clock className="h-3 w-3 text-white/10" />}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-[2px] flex-1 min-h-[30px] transition-colors duration-700',
              isComplete ? 'bg-electric-lime shadow-[0_0_8px_rgba(217,255,0,0.2)]' : 'bg-white/5'
            )}
          />
        )}
      </div>

      <div className="pb-6 pt-1 flex-1">
        <h3
          className={cn(
            'font-bold text-sm font-display mb-0.5 transition-colors duration-300',
            isComplete && 'text-electric-lime',
            isCurrent && !isFailed && 'text-white drop-shadow-sm',
            isFailed && 'text-red-400',
            !isComplete && !isCurrent && 'text-white/20'
          )}
        >
          {step.label}
        </h3>
        <p className={cn(
          "text-[10px] leading-relaxed transition-colors duration-300 font-light",
          isCurrent ? "text-white/80" : "text-white/30"
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
        <div className="max-w-md mx-auto text-center py-20">
          <AlertCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2 font-display">No Transaction</h1>
          <p className="text-white/40 mb-8 font-light">
            Please provide a transaction hash to track.
          </p>
          <Link to="/">
            <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white">
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
      <div className="max-w-lg mx-auto space-y-4 pt-2">
        <div className="text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-electric-purple/20 blur-[60px] rounded-full pointer-events-none" />
          <h1 className="text-3xl font-display font-black text-white mb-1 tracking-wide drop-shadow-sm relative z-10">Bridge Status</h1>
          <p className="text-white/60 font-light text-sm relative z-10">
            Tracking your cross-chain transfer
          </p>
        </div>

        <Card className="clay-card overflow-visible">
          <CardHeader className="pb-4 pt-5 border-b border-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white font-display flex items-center gap-3">
                <span className={direction === 'STX_TO_ETH' ? 'text-electric-lime' : 'text-white'}>
                  {direction === 'STX_TO_ETH' ? 'USDCx' : 'USDC'}
                </span>
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-white/40" />
                </div>
                <span className={direction === 'STX_TO_ETH' ? 'text-white' : 'text-electric-lime'}>
                  {direction === 'STX_TO_ETH' ? 'USDC' : 'USDCx'}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2 text-[10px] font-mono text-electric-lime bg-electric-lime/10 px-2 py-1 rounded-lg border border-electric-lime/20 shadow-[0_0_10px_-2px_rgba(217,255,0,0.3)]">
                <Clock className="h-3 w-3 animate-pulse" />
                {formatElapsedTime(elapsedTime)}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-6 px-6">
            {/* Steps Visualizer */}
            <div className="relative">
              {/* Vertical line background for steps */}
              <div className="absolute left-[15px] top-3 bottom-8 w-[2px] bg-white/5 -z-10" />
              
              <div className="space-y-0">
                {steps.map((step, index) => (
                  <StepIndicator
                    key={step.id}
                    step={step}
                    currentStatus={tracking.status}
                    isLast={index === steps.length - 1}
                  />
                ))}
              </div>
            </div>

            {/* Transaction Details - Inset Panel */}
            <div className="mt-4 space-y-2 bg-[#0f081e] p-4 rounded-2xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-white/5">
              
              {/* Deposit/Burn TX */}
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-0.5">
                    {direction === 'STX_TO_ETH' ? 'Burn Transaction' : 'Deposit Transaction'}
                  </p>
                  <p className="text-xs font-mono text-white/80 group-hover:text-white transition-colors">
                    {shortenAddress(txHash, 8)}
                  </p>
                </div>
                <a 
                  href={direction === 'STX_TO_ETH' 
                    ? `${TESTNET.stacks.blockExplorer}/txid/${txHash}?chain=testnet`
                    : `${TESTNET.ethereum.blockExplorer}/tx/${txHash}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all hover:scale-110"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Status Badges */}
              {(tracking.ethTxConfirmed || tracking.stacksBurnConfirmed) && (
                <div className="pt-1">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                    <CheckCircle className="w-2.5 h-2.5" />
                    {tracking.ethTxConfirmed ? `Confirmed in block #${tracking.ethTxBlockNumber}` : 'Burn confirmed on Stacks'}
                  </div>
                </div>
              )}

              {/* Mint TX (if available) */}
              {tracking.stacksMintTxId && (
                <div className="pt-3 border-t border-white/5 mt-2 animate-in fade-in slide-in-from-left-2">
                  <div className="flex items-center justify-between group">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-electric-lime/60 font-bold mb-0.5">Stacks Mint Transaction</p>
                      <p className="text-xs font-mono text-white/80 group-hover:text-electric-lime transition-colors">
                        {shortenAddress(tracking.stacksMintTxId, 8)}
                      </p>
                    </div>
                    <a 
                      href={`${TESTNET.stacks.blockExplorer}/txid/${tracking.stacksMintTxId}?chain=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full bg-electric-lime/10 flex items-center justify-center text-electric-lime hover:bg-electric-lime/20 transition-all hover:scale-110"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Release TX (if available) */}
              {tracking.ethReleaseTxHash && (
                <div className="pt-3 border-t border-white/5 mt-2 animate-in fade-in slide-in-from-left-2">
                  <div className="flex items-center justify-between group">
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-electric-lime/60 font-bold mb-0.5">Ethereum Release Transaction</p>
                      <p className="text-xs font-mono text-white/80 group-hover:text-electric-lime transition-colors">
                        {shortenAddress(tracking.ethReleaseTxHash, 8)}
                      </p>
                    </div>
                    <a 
                      href={`${TESTNET.ethereum.blockExplorer}/tx/${tracking.ethReleaseTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full bg-electric-lime/10 flex items-center justify-center text-electric-lime hover:bg-electric-lime/20 transition-all hover:scale-110"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Error State */}
              {tracking.error && (
                <div className="pt-3 border-t border-white/5 mt-2">
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-400">Error</p>
                      <p className="text-[10px] text-red-400/80">{tracking.error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Waiting Message */}
            {tracking.status === 'bridging' && (
              <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2 animate-pulse">
                <Loader2 className="w-4 h-4 text-white/40 animate-spin mt-0.5" />
                <p className="text-[10px] text-white/40 leading-relaxed font-light">
                  Circle's attestation service is verifying. <br/>
                  Est. time: <span className="text-white/60 font-medium">{direction === 'ETH_TO_STX' ? '~15' : '~25'} minutes</span>
                </p>
              </div>
            )}

            {/* Success Message */}
            {tracking.status === 'complete' && (
              <div className="mt-4 p-4 rounded-2xl bg-electric-lime text-black shadow-[0_0_20px_-5px_rgba(217,255,0,0.5)] flex flex-col items-center text-center gap-2 animate-in zoom-in-95 duration-300">
                <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center mb-0.5">
                  <CheckCircle className="w-5 h-5 text-black" />
                </div>
                <h3 className="font-display font-bold text-xl">Bridge Complete!</h3>
                <p className="text-xs opacity-60 max-w-[200px] leading-snug">
                  Your funds have been delivered.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex gap-3 pt-2 pb-6 px-6">
            <Button 
              variant="outline" 
              className="flex-1 border-white/10 hover:bg-white/5 hover:text-white text-white/60 h-12 rounded-xl text-sm"
              onClick={handleRefresh}
              disabled={tracking.status === 'complete'}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Refresh
            </Button>
            <Link to="/treasury" className="flex-1">
              <Button className="w-full bg-white text-black hover:bg-white/90 h-12 rounded-xl font-bold shadow-lg text-sm">
                View Treasury
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <p className="text-center text-[10px] text-white/20 mt-4 font-mono uppercase tracking-widest">
          Last checked: {tracking.lastChecked.toLocaleTimeString()}
        </p>
      </div>
    </Layout>
  )
}
