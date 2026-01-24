import { useState } from 'react'
import { ArrowRight, Copy, Check, Link2, Loader2, AlertCircle, ArrowLeftRight } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-electric-lime/20 blur-[50px] rounded-full pointer-events-none" />
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight drop-shadow-sm">
            Create Invoice
          </h1>
          <p className="text-white/60 text-lg font-light">
            Generate a shareable payment link for cross-chain settlements
          </p>
        </div>

        {/* Main Card */}
        <Card className="clay-card overflow-visible">
          <CardHeader className="pb-8">
            <CardTitle className="text-2xl text-white font-display">Invoice Details</CardTitle>
            <CardDescription className="text-white/40 text-base">
              Choose the bridge direction and enter payment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-10">
            
            {/* Direction Selector */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Payment Direction</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button
                  onClick={() => setDirection('ETH_TO_STX')}
                  className={`relative p-6 rounded-3xl text-left cursor-pointer transition-all duration-300 group overflow-hidden ${
                    isEthToStx 
                      ? 'bg-electric-lime/10 ring-2 ring-electric-lime shadow-[0_0_30px_-5px_rgba(217,255,0,0.3)]' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-display font-bold shadow-lg transition-colors ${
                      isEthToStx ? 'bg-electric-lime text-black' : 'bg-white/10 text-white'
                    }`}>$</div>
                    <ArrowRight className={`w-5 h-5 transition-colors ${isEthToStx ? 'text-electric-lime' : 'text-white/20'}`} />
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-display font-bold shadow-lg transition-colors ${
                      isEthToStx ? 'bg-white/10 text-white border border-white/10' : 'bg-white/5 text-white/40'
                    }`}>S</div>
                  </div>
                  <p className={`text-lg font-bold font-display mb-1 transition-colors ${isEthToStx ? 'text-white' : 'text-white/60'}`}>ETH → STX</p>
                  <p className="text-sm text-white/40">Pay USDC, receive USDCx</p>
                </button>

                <button
                  onClick={() => setDirection('STX_TO_ETH')}
                  className={`relative p-6 rounded-3xl text-left cursor-pointer transition-all duration-300 group overflow-hidden ${
                    !isEthToStx 
                      ? 'bg-electric-purple/10 ring-2 ring-electric-purple shadow-[0_0_30px_-5px_rgba(189,0,255,0.3)]' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-display font-bold shadow-lg transition-colors ${
                      !isEthToStx ? 'bg-electric-purple text-white' : 'bg-white/10 text-white'
                    }`}>S</div>
                    <ArrowRight className={`w-5 h-5 transition-colors ${!isEthToStx ? 'text-electric-purple' : 'text-white/20'}`} />
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-display font-bold shadow-lg transition-colors ${
                      !isEthToStx ? 'bg-white/10 text-white border border-white/10' : 'bg-white/5 text-white/40'
                    }`}>$</div>
                  </div>
                  <p className={`text-lg font-bold font-display mb-1 transition-colors ${!isEthToStx ? 'text-white' : 'text-white/60'}`}>STX → ETH</p>
                  <p className="text-sm text-white/40">Pay USDCx, receive USDC</p>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] ml-1">Amount</label>
              <div className="relative group">
                <Input 
                  type="text" 
                  placeholder="0.00"
                  inputMode="decimal"
                  className="h-20 text-4xl pl-6 pr-28 font-display tracking-tight transition-all focus:ring-4 focus:ring-electric-lime/20"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <div className="h-8 w-[1px] bg-white/10" />
                  <span className="text-lg font-bold text-white/60 font-display">
                    {isEthToStx ? 'USDC' : 'USDCx'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/30 px-1 flex items-center gap-2 font-mono">
                Minimum: {isEthToStx ? '1.00 USDC' : '4.80 USDCx'}
              </p>
            </div>

            {/* Recipient Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] ml-1">
                Recipient ({isEthToStx ? 'Stacks' : 'Ethereum'})
              </label>
              <div className="relative group">
                <Input 
                  type="text" 
                  placeholder={isEthToStx ? "ST... or name.btc" : "0x... or name.eth"}
                  className={`h-16 pl-6 pr-12 font-mono text-sm tracking-wide transition-all ${
                    resolvedAddress ? 'ring-2 ring-electric-lime/50' : 
                    validationError ? 'ring-2 ring-red-500/50' : ''
                  }`}
                  value={recipient}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                />
                {resolving && (
                  <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-electric-purple animate-spin" />
                )}
                {resolvedAddress && !resolving && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-electric-lime flex items-center justify-center shadow-[0_0_10px_rgba(217,255,0,0.5)]">
                    <Check className="w-3.5 h-3.5 text-black" />
                  </div>
                )}
                {validationError && !resolving && (
                  <AlertCircle className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                )}
              </div>
              
              {/* Validation Messages */}
              {resolvedAddress && !validationError && (
                <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-top-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-electric-lime shadow-[0_0_5px_rgba(217,255,0,0.8)]" />
                  <p className="text-xs text-electric-lime font-mono">
                    Resolved: {resolvedAddress}
                  </p>
                </div>
              )}
              {validationError && (
                <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-top-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                  <p className="text-xs text-red-400 font-mono">
                    {validationError}
                  </p>
                </div>
              )}
            </div>

            {/* Memo Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] ml-1">
                Memo <span className="text-white/20 normal-case tracking-normal ml-1">(Optional)</span>
              </label>
              <Input 
                type="text" 
                placeholder="Invoice #123, Design Work, etc."
                className="h-16 pl-6 transition-all"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Generate Button */}
            <div className="pt-4">
              <Button 
                size="lg"
                className="w-full h-16 text-lg font-bold shadow-lime-glow hover:shadow-lime-glow-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.01]"
                onClick={handleGenerate}
                disabled={!amount || !recipient || !!validationError || resolving}
              >
                <Link2 className="w-5 h-5 mr-3" />
                Generate Invoice Link
              </Button>
            </div>

            {/* Generated URL Result */}
            {generatedUrl && (
              <div className="p-8 rounded-3xl bg-[#0f081e] border border-electric-lime/20 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 text-electric-lime font-bold text-lg font-display">
                  <div className="w-8 h-8 rounded-full bg-electric-lime/20 flex items-center justify-center border border-electric-lime/30">
                    <Check className="w-4 h-4" />
                  </div>
                  Invoice Created Successfully
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 relative group">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedUrl}
                      className="w-full h-14 px-6 rounded-xl border border-white/10 bg-white/5 text-sm font-mono text-white/80 truncate outline-none focus:border-electric-lime/50 transition-colors"
                    />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 pointer-events-none group-hover:ring-white/20" />
                  </div>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    onClick={handleCopy}
                    className="h-14 w-14 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-electric-lime"
                  >
                    {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                  </Button>
                </div>
                
                <p className="text-xs text-white/40 flex items-center gap-2 font-mono ml-1">
                  <ArrowLeftRight className="w-3 h-3 text-electric-purple" />
                  Share this link to receive payment directly to your wallet
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Info Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-white/30 font-mono">Invoices are valid indefinitely and can be paid by anyone.</p>
          <div className="flex items-center justify-center gap-2 text-xs text-white/20 uppercase tracking-widest">
            <div className={`w-2 h-2 rounded-full ${isEthToStx ? 'bg-electric-lime shadow-[0_0_10px_#D9FF00]' : 'bg-electric-purple shadow-[0_0_10px_#BD00FF]'}`} />
            Bridge time: {isEthToStx ? '~15 min' : '~25 min'}
          </div>
        </div>
      </div>
    </Layout>
  )
}
