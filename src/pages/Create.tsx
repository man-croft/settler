import { useState } from 'react'
import { ArrowRight, Copy, Check, Link2, Loader2, AlertCircle } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <div className="max-w-xl mx-auto space-y-6 pt-4">
        {/* Header */}
        <div className="text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-electric-lime/20 blur-[40px] rounded-full pointer-events-none" />
          <h1 className="text-3xl font-display font-black text-white mb-2 tracking-tight drop-shadow-sm">
            Create Invoice
          </h1>
          <p className="text-white/60 text-sm font-light">
            Generate a shareable payment link
          </p>
        </div>

        {/* Main Card */}
        <Card className="clay-card overflow-visible">
          <CardHeader className="pb-4 pt-6 px-6">
            <CardTitle className="text-xl text-white font-display">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-8">
            
            {/* Direction Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Payment Direction</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDirection('ETH_TO_STX')}
                  className={`relative p-3 rounded-2xl text-left cursor-pointer transition-all duration-300 group overflow-hidden ${
                    isEthToStx 
                      ? 'bg-electric-lime/10 ring-1 ring-electric-lime shadow-[0_0_20px_-5px_rgba(217,255,0,0.2)]' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-display font-bold shadow-md transition-colors ${
                      isEthToStx ? 'bg-electric-lime text-black' : 'bg-white/10 text-white'
                    }`}>$</div>
                    <ArrowRight className={`w-3 h-3 transition-colors ${isEthToStx ? 'text-electric-lime' : 'text-white/20'}`} />
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-display font-bold shadow-md transition-colors ${
                      isEthToStx ? 'bg-white/10 text-white border border-white/10' : 'bg-white/5 text-white/40'
                    }`}>S</div>
                  </div>
                  <p className={`text-sm font-bold font-display transition-colors ${isEthToStx ? 'text-white' : 'text-white/60'}`}>ETH → STX</p>
                </button>

                <button
                  onClick={() => setDirection('STX_TO_ETH')}
                  className={`relative p-3 rounded-2xl text-left cursor-pointer transition-all duration-300 group overflow-hidden ${
                    !isEthToStx 
                      ? 'bg-electric-purple/10 ring-1 ring-electric-purple shadow-[0_0_20px_-5px_rgba(189,0,255,0.2)]' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-display font-bold shadow-md transition-colors ${
                      !isEthToStx ? 'bg-electric-purple text-white' : 'bg-white/10 text-white'
                    }`}>S</div>
                    <ArrowRight className={`w-3 h-3 transition-colors ${!isEthToStx ? 'text-electric-purple' : 'text-white/20'}`} />
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-display font-bold shadow-md transition-colors ${
                      !isEthToStx ? 'bg-white/10 text-white border border-white/10' : 'bg-white/5 text-white/40'
                    }`}>$</div>
                  </div>
                  <p className={`text-sm font-bold font-display transition-colors ${!isEthToStx ? 'text-white' : 'text-white/60'}`}>STX → ETH</p>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Amount</label>
              <div className="relative group">
                <Input 
                  type="text" 
                  placeholder="0.00"
                  inputMode="decimal"
                  className="h-16 text-3xl pl-5 pr-24 font-display tracking-tight transition-all focus:ring-2 focus:ring-electric-lime/20"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <div className="h-6 w-[1px] bg-white/10" />
                  <span className="text-base font-bold text-white/60 font-display">
                    {isEthToStx ? 'USDC' : 'USDCx'}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-white/30 px-1 flex items-center gap-1 font-mono">
                Min: {isEthToStx ? '1.00' : '4.80'}
              </p>
            </div>

            {/* Recipient Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">
                Recipient
              </label>
              <div className="relative group">
                <Input 
                  type="text" 
                  placeholder={isEthToStx ? "ST... or name.btc" : "0x... or name.eth"}
                  className={`h-12 pl-5 pr-10 font-mono text-sm tracking-wide transition-all ${
                    resolvedAddress ? 'ring-1 ring-electric-lime/50' : 
                    validationError ? 'ring-1 ring-red-500/50' : ''
                  }`}
                  value={recipient}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                />
                {resolving && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-electric-purple animate-spin" />
                )}
                {resolvedAddress && !resolving && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-electric-lime flex items-center justify-center shadow-[0_0_10px_rgba(217,255,0,0.5)]">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                )}
                {validationError && !resolving && (
                  <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
              
              {/* Validation Messages */}
              {resolvedAddress && !validationError && (
                <div className="flex items-center gap-2 px-2">
                  <div className="w-1 h-1 rounded-full bg-electric-lime" />
                  <p className="text-[10px] text-electric-lime font-mono truncate">
                    {resolvedAddress}
                  </p>
                </div>
              )}
              {validationError && (
                <div className="flex items-center gap-2 px-2">
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  <p className="text-[10px] text-red-400 font-mono">
                    {validationError}
                  </p>
                </div>
              )}
            </div>

            {/* Memo Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] ml-1">
                Memo <span className="text-white/20 normal-case tracking-normal ml-1">(Opt)</span>
              </label>
              <Input 
                type="text" 
                placeholder="Invoice #123..."
                className="h-12 pl-5 text-sm transition-all"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <Button 
                size="lg"
                className="w-full h-14 text-base font-bold shadow-lime-glow hover:shadow-lime-glow-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01]"
                onClick={handleGenerate}
                disabled={!amount || !recipient || !!validationError || resolving}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Generate Invoice Link
              </Button>
            </div>

            {/* Generated URL Result - Compact */}
            {generatedUrl && (
              <div className="p-5 rounded-2xl bg-[#0f081e] border border-electric-lime/20 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-2 text-electric-lime font-bold text-sm font-display">
                  <div className="w-6 h-6 rounded-full bg-electric-lime/20 flex items-center justify-center border border-electric-lime/30">
                    <Check className="w-3 h-3" />
                  </div>
                  Created Successfully
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1 relative group">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedUrl}
                      className="w-full h-10 px-4 rounded-lg border border-white/10 bg-white/5 text-xs font-mono text-white/80 truncate outline-none focus:border-electric-lime/50 transition-colors"
                    />
                  </div>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={handleCopy}
                    className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-electric-lime"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
