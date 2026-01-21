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

  // Regex to validate number input: allows empty, or valid decimal numbers that don't start with 0 (except 0 itself or 0.xxx)
  const handleAmountChange = (value: string) => {
    // Allow empty string
    if (value === '') {
      setAmount('')
      return
    }
    // Regex: allow "0", "0.", "0.123", or numbers starting with 1-9 followed by optional digits and decimal
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
    
    // Check if it's a name that needs resolution
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
      // Validate address format
      if (expectedType === 'stacks' && !isValidStacksTestnetAddress(value)) {
        setValidationError('Invalid Stacks address format (must start with ST)')
      } else if (expectedType === 'ethereum' && !isValidEthAddress(value)) {
        setValidationError('Invalid Ethereum address format (must be 0x...)')
      }
    }
  }

  const handleGenerate = () => {
    if (!amount || !recipient) return
    
    // Validate amount
    const numAmount = parseFloat(amount)
    const minAmount = direction === 'ETH_TO_STX' ? TESTNET.limits.minDeposit : TESTNET.limits.minWithdraw
    
    if (isNaN(numAmount) || numAmount < minAmount) {
      setValidationError(`Minimum amount is ${minAmount} ${direction === 'ETH_TO_STX' ? 'USDC' : 'USDCx'}`)
      return
    }
    
    if (validationError) return
    
    // Use resolved address if available, otherwise use input
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
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 font-display tracking-wide">Create Invoice</h1>
          <p className="text-white/60">
            Generate a shareable payment link for cross-chain settlements
          </p>
        </div>

        {/* Main Card */}
        <Card className="glass-card glow-white overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-red-600 via-red-500 to-red-600" />
          <CardHeader>
            <CardTitle className="text-lg text-white font-display">Invoice Details</CardTitle>
            <CardDescription className="text-white/40">
              Choose the bridge direction and enter payment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Direction Selector */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-white/60 uppercase tracking-widest text-[10px]">Payment Direction</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDirection('ETH_TO_STX')}
                  className={`p-4 rounded-xl border transition-all text-left cursor-pointer relative overflow-hidden group ${
                    isEthToStx 
                      ? 'border-red-500/50 bg-red-500/10' 
                      : 'border-white/5 hover:border-white/20 bg-white/5'
                  }`}
                >
                  {isEthToStx && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white text-lg font-bold group-hover:bg-white/20 transition-colors">$</div>
                    <ArrowRight className="w-4 h-4 text-white/40" />
                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-red-900/30">S</div>
                  </div>
                  <p className="text-sm font-medium text-white mt-4 font-display">ETH → STX</p>
                  <p className="text-xs text-white/40 mt-1">Pay USDC, receive USDCx</p>
                </button>

                <button
                  onClick={() => setDirection('STX_TO_ETH')}
                  className={`p-4 rounded-xl border transition-all text-left cursor-pointer relative overflow-hidden group ${
                    !isEthToStx 
                      ? 'border-red-500/50 bg-red-500/10' 
                      : 'border-white/5 hover:border-white/20 bg-white/5'
                  }`}
                >
                  {!isEthToStx && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-red-900/30">S</div>
                    <ArrowRight className="w-4 h-4 text-white/40" />
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white text-lg font-bold group-hover:bg-white/20 transition-colors">$</div>
                  </div>
                  <p className="text-sm font-medium text-white mt-4 font-display">STX → ETH</p>
                  <p className="text-xs text-white/40 mt-1">Pay USDCx, receive USDC</p>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60 uppercase tracking-widest text-[10px]">Amount</label>
              <div className="relative group">
                <Input 
                  type="text" 
                  placeholder="0.00"
                  inputMode="decimal"
                  className="h-16 text-2xl pl-4 pr-24 bg-white/5 border-white/10 focus:border-red-500/50 focus:bg-white/10 transition-all font-display tracking-wide"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-white/40 bg-white/5 px-2 py-1 rounded">
                  {isEthToStx ? 'USDC' : 'USDCx'}
                </span>
              </div>
              <p className="text-xs text-white/40 px-1 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-500" />
                Minimum: {isEthToStx ? '1.00 USDC' : '4.80 USDCx'}
              </p>
            </div>

            {/* Recipient Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60 uppercase tracking-widest text-[10px]">
                Recipient ({isEthToStx ? 'Stacks' : 'Ethereum'})
              </label>
              <div className="relative">
                <Input 
                  type="text" 
                  placeholder={isEthToStx ? "ST... or name.btc" : "0x... or name.eth"}
                  className={`h-14 font-mono text-sm pr-10 bg-white/5 border-white/10 focus:bg-white/10 transition-all ${
                    resolvedAddress ? 'border-emerald-500/50 focus:border-emerald-500/50' : 
                    validationError ? 'border-red-500/50 focus:border-red-500/50' : 
                    'focus:border-red-500/50'
                  }`}
                  value={recipient}
                  onChange={(e) => handleRecipientChange(e.target.value)}
                />
                {resolving && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 animate-spin" />
                )}
                {resolvedAddress && !resolving && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                )}
                {validationError && !resolving && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                )}
              </div>
              {resolvedAddress && !validationError && (
                <p className="text-xs text-emerald-400 px-1 flex items-center gap-1 font-mono bg-emerald-500/10 py-1 rounded w-fit">
                  <Check className="w-3 h-3" />
                  Resolved: {resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-8)}
                </p>
              )}
              {validationError && (
                <p className="text-xs text-red-400 px-1 flex items-center gap-1 bg-red-500/10 py-1 rounded w-fit">
                  <AlertCircle className="w-3 h-3" />
                  {validationError}
                </p>
              )}
            </div>

            {/* Memo Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/60 uppercase tracking-widest text-[10px]">
                Memo <span className="text-white/30 ml-2 normal-case tracking-normal">(Optional)</span>
              </label>
              <Input 
                type="text" 
                placeholder="Invoice #123, Design Work, etc."
                className="h-14 bg-white/5 border-white/10 focus:border-red-500/50 focus:bg-white/10 transition-all"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Generate Button */}
            <Button 
              className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
              onClick={handleGenerate}
              disabled={!amount || !recipient || !!validationError || resolving}
            >
              <Link2 className="w-5 h-5 mr-2" />
              Generate Invoice Link
            </Button>

            {/* Generated URL */}
            {generatedUrl && (
              <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  Invoice Created Successfully
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={generatedUrl}
                    className="flex-1 px-4 py-3 rounded-lg border border-emerald-500/20 bg-black/40 text-sm font-mono text-white/80 truncate outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handleCopy}
                    className="bg-black/40 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/40 text-emerald-400"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-emerald-400/60 flex items-center gap-2">
                  <ArrowLeftRight className="w-3 h-3" />
                  Share this link to receive payment directly to your wallet
                </p>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Info Footer */}
        <div className="text-center text-sm text-white/30 space-y-1 font-mono">
          <p>Invoices are valid indefinitely and can be paid by anyone.</p>
          <p>Bridge transfers typically complete in {isEthToStx ? '~15' : '~25'} minutes.</p>
        </div>
      </div>
    </Layout>
  )
}
