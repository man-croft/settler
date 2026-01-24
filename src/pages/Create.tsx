import { useState } from 'react'
import { ArrowRight, Copy, Check, Link2, Loader2 } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isValidStacksTestnetAddress, isValidEthAddress, isBnsName, isEnsName } from '@/lib/utils'
import { resolveRecipient } from '@/lib/identity'
import { TESTNET } from '@/lib/constants'

type Direction = 'ETH_TO_STX' | 'STX_TO_ETH'

interface Invoice {
  direction: Direction
  amount: string
  recipient: string
  memo?: string
}

function encodeInvoice(invoice: Invoice): string {
  const data = JSON.stringify(invoice)
  return btoa(data)
}

export function CreatePage() {
  const [direction, setDirection] = useState<Direction>('ETH_TO_STX')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [memo, setMemo] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleAmountChange = (value: string) => {
    if (value === '') {
      setAmount('')
      return
    }
    const regex = /^(0|0\.[0-9]*|[1-9][0-9]*\.?[0-9]*)$/
    if (regex.test(value)) {
      setAmount(value)
    }
  }

  const handleRecipientChange = async (value: string) => {
    setRecipient(value)
    setResolvedAddress(null)
    setValidationError(null)
    
    if (!value.trim()) return
    
    const expectedType = direction === 'ETH_TO_STX' ? 'stacks' : 'ethereum'
    
    if (isBnsName(value) || isEnsName(value)) {
      setResolving(true)
      const result = await resolveRecipient(value, expectedType)
      setResolving(false)
      
      if (result.error) {
        setValidationError(result.error)
      } else if (result.address) {
        setResolvedAddress(result.address)
      }
    } else {
      if (expectedType === 'stacks' && !isValidStacksTestnetAddress(value)) {
        setValidationError('Invalid Stacks address format (must start with ST)')
      } else if (expectedType === 'ethereum' && !isValidEthAddress(value)) {
        setValidationError('Invalid Ethereum address format (must be 0x...)')
      }
    }
  }

  const handleGenerate = () => {
    if (!amount || !recipient) return
    
    const numAmount = parseFloat(amount)
    const minAmount = direction === 'ETH_TO_STX' ? TESTNET.limits.minDeposit : TESTNET.limits.minWithdraw
    
    if (isNaN(numAmount) || numAmount < minAmount) {
      setValidationError(`Minimum amount is ${minAmount} ${direction === 'ETH_TO_STX' ? 'USDC' : 'USDCx'}`)
      return
    }
    
    if (validationError) return
    
    const finalRecipient = resolvedAddress || recipient

    const invoice: Invoice = { 
      direction, 
      amount, 
      recipient: finalRecipient,
      ...(memo && { memo })
    }
    const encoded = encodeInvoice(invoice)
    const url = `${window.location.origin}/pay?invoice=${encoded}`
    setGeneratedUrl(url)
  }

  const handleCopy = async () => {
    if (!generatedUrl) return
    await navigator.clipboard.writeText(generatedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isEthToStx = direction === 'ETH_TO_STX'

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-8 lg:px-16 py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 
            className="text-white mb-4"
            style={{ 
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              fontFamily: "'Instrument Serif', Georgia, serif",
              lineHeight: 1,
              letterSpacing: '-0.02em'
            }}
          >
            Create <span style={{ fontStyle: 'italic', color: '#FF4D00' }}>Invoice</span>
          </h1>
          <p className="text-white/40 text-lg">Generate a cross-chain payment link.</p>
        </div>

        <div className="space-y-12">
          {/* Direction Selector */}
          <div className="space-y-4">
            <label className="text-xs font-medium text-white/30 uppercase tracking-widest">Direction</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDirection('ETH_TO_STX')}
                className={`group p-6 border text-left transition-all duration-300 ${
                  isEthToStx 
                    ? 'border-[#FF4D00] bg-[#FF4D00]/5' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontSize: '1.5rem', fontFamily: "'Instrument Serif', Georgia, serif" }}>$</span>
                  <ArrowRight className="w-4 h-4 text-white/30" />
                  <span style={{ fontSize: '1.5rem', fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', color: '#FF4D00' }}>S</span>
                </div>
                <p className="text-sm text-white/60">Ethereum → Stacks</p>
              </button>

              <button
                onClick={() => setDirection('STX_TO_ETH')}
                className={`group p-6 border text-left transition-all duration-300 ${
                  !isEthToStx 
                    ? 'border-[#FF4D00] bg-[#FF4D00]/5' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontSize: '1.5rem', fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', color: '#FF4D00' }}>S</span>
                  <ArrowRight className="w-4 h-4 text-white/30" />
                  <span style={{ fontSize: '1.5rem', fontFamily: "'Instrument Serif', Georgia, serif" }}>$</span>
                </div>
                <p className="text-sm text-white/60">Stacks → Ethereum</p>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-4">
            <label className="text-xs font-medium text-white/30 uppercase tracking-widest">Amount</label>
            <div className="relative">
              <Input 
                type="text" 
                placeholder="0.00"
                inputMode="decimal"
                className="h-16 bg-transparent border-white/10 focus:border-white/30 rounded-none pl-4 pr-24"
                style={{ fontSize: '1.875rem', fontFamily: "'Instrument Serif', Georgia, serif" }}
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-white/30">
                {isEthToStx ? 'USDC' : 'USDCx'}
              </div>
            </div>
            <p className="text-xs text-white/20">
              Minimum: {isEthToStx ? '1.00' : '4.80'} {isEthToStx ? 'USDC' : 'USDCx'}
            </p>
          </div>

          {/* Recipient Input */}
          <div className="space-y-4">
            <label className="text-xs font-medium text-white/30 uppercase tracking-widest">Recipient</label>
            <div className="relative">
              <Input 
                type="text" 
                placeholder={isEthToStx ? "ST... or name.btc" : "0x... or name.eth"}
                className={`h-16 text-lg font-mono bg-transparent border-white/10 focus:border-white/30 rounded-none ${
                  resolvedAddress ? 'border-green-500/50' : 
                  validationError ? 'border-red-500/50' : ''
                }`}
                value={recipient}
                onChange={(e) => handleRecipientChange(e.target.value)}
              />
              {resolving && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 animate-spin" />
              )}
              {resolvedAddress && !resolving && (
                <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>
            {resolvedAddress && !validationError && (
              <p className="text-xs text-green-500 font-mono">Resolved: {resolvedAddress}</p>
            )}
            {validationError && (
              <p className="text-xs text-red-500">{validationError}</p>
            )}
          </div>

          {/* Memo Input */}
          <div className="space-y-4">
            <label className="text-xs font-medium text-white/30 uppercase tracking-widest">Memo (Optional)</label>
            <Input 
              type="text" 
              placeholder="Invoice #123..."
              className="h-16 text-lg bg-transparent border-white/10 focus:border-white/30 rounded-none"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <Button 
              className="btn-minimal h-16 px-12 text-base rounded-none w-full md:w-auto"
              onClick={handleGenerate}
              disabled={!amount || !recipient || !!validationError || resolving}
            >
              <Link2 className="w-5 h-5 mr-3" />
              Generate Link
            </Button>
          </div>

          {/* Result */}
          {generatedUrl && (
            <div className="border border-green-500/20 bg-green-500/5 p-8 animate-fade-in">
              <div className="flex items-center gap-2 font-medium mb-6" style={{ color: '#22c55e' }}>
                <Check className="w-5 h-5" />
                <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: '1.125rem' }}>Invoice Ready</span>
              </div>
              
              <div className="flex gap-3">
                <Input 
                  readOnly 
                  value={generatedUrl}
                  className="font-mono text-xs bg-black/20 border-green-500/20 text-white/70 rounded-none flex-1"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopy}
                  className="border-green-500/20 hover:bg-green-500/10 hover:text-green-500 rounded-none h-10 w-10"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
