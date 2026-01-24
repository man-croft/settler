import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Link2, ArrowLeftRight } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: Link2,
    title: 'Smart Invoices',
    description: 'Create payment links that work cross-chain instantly.',
    color: 'text-orbital-orange',
  },
  {
    icon: ArrowLeftRight,
    title: 'Seamless Bridge',
    description: 'Auto-convert Ethereum USDC to Stacks USDCx.',
    color: 'text-white',
  },
  {
    icon: Shield,
    title: 'Bitcoin Security',
    description: 'Settlement protected by Stacks Bitcoin finality.',
    color: 'text-orbital-blue',
  },
]

export function HomePage() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-20 py-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-8 relative">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orbital-orange/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-orbital-orange mb-6">
              <span className="w-2 h-2 rounded-full bg-orbital-orange animate-pulse" />
              Live on Sepolia & Stacks Testnet
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight tracking-tight text-white">
              Settle on
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orbital-orange to-red-500">Bitcoin.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light mt-6 leading-relaxed">
              The financial OS for the Bitcoin economy. <br/>
              Get paid in <span className="text-white font-medium">USDC</span>. Settle in <span className="text-orbital-orange font-medium">USDCx</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
              <Link to="/create">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Invoicing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/treasury">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  View Treasury
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Visual Flow */}
        <div className="border border-white/10 bg-white/5 rounded-2xl p-12 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-orbital-blue/5 via-transparent to-orbital-orange/5" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
            {/* ETH Side */}
            <div className="text-center space-y-4 group">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto transition-all group-hover:border-white/20 shadow-lg">
                <span className="text-3xl font-display font-bold text-white">$</span>
              </div>
              <div>
                <p className="font-bold text-white text-base font-display">USDC</p>
                <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Ethereum</p>
              </div>
            </div>

            {/* Bridge Animation */}
            <div className="flex-1 max-w-xs flex items-center gap-4 opacity-50">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-white/30" />
              <ArrowLeftRight className="w-6 h-6 text-zinc-500" />
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/30 to-white/10" />
            </div>

            {/* STX Side */}
            <div className="text-center space-y-4 group">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto transition-all group-hover:border-orbital-orange/50 shadow-lg shadow-orbital-orange/10">
                <span className="text-3xl font-display font-bold text-orbital-orange">S</span>
              </div>
              <div>
                <p className="font-bold text-white text-base font-display">USDCx</p>
                <p className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Stacks</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:border-white/20 transition-all cursor-default group bg-black/40">
              <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
                <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto transition-colors group-hover:bg-white/10 ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-white">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="text-center py-8 border-t border-white/5">
          <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-6">Powered By</p>
          <div className="flex items-center justify-center gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white" />
              <span className="font-display font-bold text-white text-xl">Circle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-500" />
              <span className="font-display font-bold text-white text-xl">Stacks</span>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
