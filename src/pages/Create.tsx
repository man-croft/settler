import { useState } from 'react'
import { ArrowRight, Copy, Check, Link2, Loader2 } from 'lucide-react'

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
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Create Invoice</h1>
          <p className="text-zinc-400 text-sm">Generate a payment link for cross-chain settlement</p>
        </div>

        <div className="grid gap-6">
          {/* Main Card */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Configure the bridge parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Direction Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Direction</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDirection('ETH_TO_STX')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isEthToStx 
                        ? 'bg-orbital-orange/10 border-orbital-orange/50 ring-1 ring-orbital-orange/20' 
                        : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs font-bold">$</div>
                      <ArrowRight className="w-3 h-3 text-zinc-500" />
                      <div className="w-6 h-6 rounded-md bg-orbital-orange text-black flex items-center justify-center text-xs font-bold">S</div>
                    </div>
                    <div className="text-sm font-medium text-white">ETH → STX</div>
                  </button>

                  <button
                    onClick={() => setDirection('STX_TO_ETH')}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      !isEthToStx 
                        ? 'bg-orbital-blue/10 border-orbital-blue/50 ring-1 ring-orbital-blue/20' 
                        : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-md bg-orbital-orange text-black flex items-center justify-center text-xs font-bold">S</div>
                      <ArrowRight className="w-3 h-3 text-zinc-500" />
                      <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-xs font-bold">$</div>
                    </div>
                    <div className="text-sm font-medium text-white">STX → ETH</div>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Amount</label>
                <div className="relative">
                  <Input 
                    type="text" 
                    placeholder="0.00"
                    inputMode="decimal"
                    className="pl-4 pr-16 h-12 text-lg font-mono"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-500">
                    {isEthToStx ? 'USDC' : 'USDCx'}
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  Min: {isEthToStx ? '1.00' : '4.80'}
                </p>
              </div>

              {/* Recipient Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Recipient</label>
                <div className="relative">
                  <Input 
                    type="text" 
                    placeholder={isEthToStx ? "ST... or name.btc" : "0x... or name.eth"}
                    className={`pl-4 pr-10 font-mono text-sm h-12 ${
                      resolvedAddress ? 'border-emerald-500/50' : 
                      validationError ? 'border-red-500/50' : ''
                    }`}
                    value={recipient}
                    onChange={(e) => handleRecipientChange(e.target.value)}
                  />
                  {resolving && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
                  )}
                  {resolvedAddress && !resolving && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
                {resolvedAddress && !validationError && (
                  <p className="text-xs text-emerald-500 font-mono">Resolved: {resolvedAddress}</p>
                )}
                {validationError && (
                  <p className="text-xs text-red-500 font-mono">{validationError}</p>
                )}
              </div>

              {/* Memo Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Memo (Optional)</label>
                <Input 
                  type="text" 
                  placeholder="Invoice #123..."
                  className="h-12"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="pt-2">
                <Button 
                  className="w-full h-12 text-base"
                  onClick={handleGenerate}
                  disabled={!amount || !recipient || !!validationError || resolving}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Generate Link
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Result Card */}
          {generatedUrl && (
            <Card className="border-emerald-500/20 bg-emerald-900/5 animate-in fade-in slide-in-from-bottom-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-emerald-500 font-medium mb-4">
                  <Check className="w-5 h-5" />
                  Invoice Ready
                </div>
                
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={generatedUrl}
                    className="font-mono text-xs bg-black/20 border-emerald-500/20 text-zinc-300"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopy}
                    className="border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}
