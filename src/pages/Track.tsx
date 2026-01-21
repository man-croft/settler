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
  const isCurrent = step.id === currentStatus
  const isFailed = currentStatus === 'failed' && isCurrent

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'h-10 w-10 rounded-full flex items-center justify-center border transition-all shadow-lg',
            isComplete && 'bg-emerald-500 border-emerald-500 shadow-emerald-500/20',
            isCurrent && !isFailed && 'border-white bg-white/10 shadow-white/20',
            isFailed && 'bg-red-500 border-red-500 shadow-red-500/20',
            !isComplete && !isCurrent && 'border-white/10 bg-white/5'
          )}
        >
          {isComplete && <CheckCircle className="h-5 w-5 text-white" />}
          {isCurrent && !isFailed && <Loader2 className="h-5 w-5 text-white animate-spin" />}
          {isFailed && <XCircle className="h-5 w-5 text-white" />}
          {!isComplete && !isCurrent && <Clock className="h-5 w-5 text-white/20" />}
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[40px] transition-colors duration-500',
              isComplete ? 'bg-emerald-500/50' : 'bg-white/10'
            )}
          />
        )}
      </div>

      <div className="pb-8 pt-2">
        <h3
          className={cn(
            'font-bold text-sm tracking-wide font-display mb-1',
            isComplete && 'text-emerald-400',
            isCurrent && !isFailed && 'text-white',
            isFailed && 'text-red-400',
            !isComplete && !isCurrent && 'text-white/20'
          )}
        >
          {step.label}
        </h3>
        <p className={cn(
          "text-xs leading-relaxed",
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
  const hookData = searchParams.get('hookData') // Unique identifier for tracking mint
  
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
      // Query contract events from the USDCx-v1 contract
      const response = await fetch(
        `https://api.testnet.hiro.so/extended/v1/contract/${TESTNET.stacks.usdcxV1}/events?limit=50`
      )
      
      if (response.ok) {
        const data = await response.json()
        
        // Find a mint event that matches our hookData or recipient
        const mintEvent = data.results?.find((event: any) => {
          if (event.event_type !== 'smart_contract_log') return false
          
          const repr = event.contract_log?.value?.repr || ''
          
          // Check if this is a mint event (handle both escaped and unescaped quotes)
          if (!repr.includes('(topic "mint")') && !repr.includes('(topic \\"mint\\")')) return false
          
          // If we have hookData and it's not empty (0x), match by hookData (most reliable)
          if (hookData && hookData !== '0x' && hookData.length > 2) {
            // The hookData in the event looks like: (hook-data 0x1234...)
            // Our hookData is like: 0x1234...
            const hookDataWithoutPrefix = hookData.replace('0x', '').toLowerCase()
            return repr.toLowerCase().includes(`(hook-data 0x${hookDataWithoutPrefix})`)
          }
          
          // Fallback: match by recipient address
          // Clarity principal format: 'STADDRESS (no closing quote)
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
      // Check for recent USDC transfer events to the recipient
      const currentBlock = await publicClient.getBlockNumber()
      const fromBlock = currentBlock - 1000n // Check last ~1000 blocks
      
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

      // Find the most recent transfer from xReserve contract
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
    
    // Initial check
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
        // STX_TO_ETH
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
          <p className="text-white/40 mb-8">
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
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 font-display tracking-wide">Bridge Status</h1>
          <p className="text-white/60">
            Tracking your cross-chain transfer
          </p>
        </div>

        <Card className="glass-card glow-white overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white font-display flex items-center gap-2">
                {direction === 'STX_TO_ETH' ? 'USDCx' : 'USDC'}
                <ArrowRight className="w-4 h-4 text-white/40" />
                {direction === 'STX_TO_ETH' ? 'USDC' : 'USDCx'}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs font-mono text-white/60 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Clock className="h-3 w-3" />
                {formatElapsedTime(elapsedTime)}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="py-6">
              {steps.map((step, index) => (
                <StepIndicator
                  key={step.id}
                  step={step}
                  currentStatus={tracking.status}
                  isLast={index === steps.length - 1}
                />
              ))}
            </div>

            <div className="space-y-3 mt-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-mono">
                  {direction === 'STX_TO_ETH' ? 'Burn Transaction' : 'Deposit Transaction'}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-mono text-white/80">
                    {shortenAddress(txHash, 8)}
                  </p>
                  <a 
                    href={direction === 'STX_TO_ETH' 
                      ? `${TESTNET.stacks.blockExplorer}/txid/${txHash}?chain=testnet`
                      : `${TESTNET.ethereum.blockExplorer}/tx/${txHash}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {tracking.ethTxConfirmed && (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-medium bg-emerald-500/10 py-1 px-2 rounded w-fit">
                    <CheckCircle className="w-3 h-3" /> Confirmed in block #{tracking.ethTxBlockNumber}
                  </p>
                )}
                {tracking.stacksBurnConfirmed && (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-medium bg-emerald-500/10 py-1 px-2 rounded w-fit">
                    <CheckCircle className="w-3 h-3" /> Burn confirmed on Stacks
                  </p>
                )}
              </div>

              {tracking.stacksMintTxId && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-mono">Stacks Mint Transaction</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono text-white/80">
                      {shortenAddress(tracking.stacksMintTxId, 8)}
                    </p>
                    <a 
                      href={`${TESTNET.stacks.blockExplorer}/txid/${tracking.stacksMintTxId}?chain=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              {tracking.ethReleaseTxHash && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 font-mono">Ethereum Release Transaction</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono text-white/80">
                      {shortenAddress(tracking.ethReleaseTxHash, 8)}
                    </p>
                    <a 
                      href={`${TESTNET.ethereum.blockExplorer}/tx/${tracking.ethReleaseTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              {tracking.error && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-red-400 font-medium">{tracking.error}</p>
                </div>
              )}

              {tracking.status === 'bridging' && (
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-start gap-3">
                  <Loader2 className="w-5 h-5 text-white/60 animate-spin mt-0.5" />
                  <p className="text-sm text-white/60 leading-relaxed">
                    Circle's attestation service is processing your transfer. 
                    This typically takes {direction === 'ETH_TO_STX' ? '~15' : '~25'} minutes on testnet.
                  </p>
                </div>
              )}

              {tracking.status === 'complete' && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm text-emerald-400 font-medium">
                    Bridge complete! Tokens have been delivered.
                  </p>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex gap-3 pt-2 pb-6 px-6">
            <Button 
              variant="outline" 
              className="flex-1 border-white/10 hover:bg-white/5 text-white h-12"
              onClick={handleRefresh}
              disabled={tracking.status === 'complete'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link to="/treasury" className="flex-1">
              <Button className="w-full bg-white text-black hover:bg-white/90 h-12 font-bold">
                View Treasury
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <p className="text-center text-[10px] text-white/20 mt-6 font-mono uppercase tracking-widest">
          Last checked: {tracking.lastChecked.toLocaleTimeString()}
        </p>
      </div>
    </Layout>
  )
}
