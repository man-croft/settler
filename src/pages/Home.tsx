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
    color: 'from-red-500 to-red-600',
  },
  {
    icon: ArrowLeftRight,
    title: 'Seamless Bridge',
    description: 'Auto-convert Ethereum USDC to Stacks USDCx.',
    color: 'from-white to-slate-200',
  },
  {
    icon: Shield,
    title: 'Bitcoin Security',
    description: 'Settlement protected by Stacks Bitcoin finality.',
    color: 'from-red-500 to-red-600',
  },
]

export function HomePage() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-24 py-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-8 relative">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-500/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="relative">
            <h1 className="text-6xl md:text-8xl font-display font-bold leading-tight tracking-tight">
              SETTLE ON
              <br />
              <span className="gradient-text-red">BITCOIN.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto font-light mt-6">
              The financial OS for the Bitcoin economy. 
              Get paid in USDC. Settle in USDCx.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
              <Link to="/create">
                <Button className="h-16 px-10 text-lg bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl shadow-red-900/20 transition-all hover:scale-105">
                  Start Invoicing
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/treasury">
                <Button variant="outline" className="h-16 px-10 text-lg bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-2xl backdrop-blur-md transition-all hover:scale-105">
                  View Treasury
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Visual Flow */}
        <div className="glass-card p-12 glow-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
            {/* ETH Side */}
            <div className="text-center space-y-4 group">
              <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto transition-all group-hover:scale-110 group-hover:bg-white/10 group-hover:border-white/20">
                <span className="text-4xl font-display font-bold text-white">$</span>
              </div>
              <div>
                <p className="font-bold text-white text-lg">USDC</p>
                <p className="text-sm text-white/40 font-mono">ETHEREUM</p>
              </div>
            </div>

            {/* Bridge Animation */}
            <div className="flex-1 max-w-xs flex items-center gap-4">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-red-500/50" />
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30 animate-pulse">
                <ArrowLeftRight className="w-8 h-8 text-white" />
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-red-500/50 to-white/10" />
            </div>

            {/* STX Side */}
            <div className="text-center space-y-4 group">
              <div className="w-24 h-24 rounded-3xl bg-red-600/10 border border-red-500/20 flex items-center justify-center mx-auto transition-all group-hover:scale-110 group-hover:bg-red-600/20 group-hover:border-red-500/40">
                <span className="text-4xl font-display font-bold text-red-500">S</span>
              </div>
              <div>
                <p className="font-bold text-white text-lg">USDCx</p>
                <p className="text-sm text-white/40 font-mono">STACKS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="glass-card hover:bg-white/5 transition-all hover:-translate-y-1 cursor-pointer border-white/5">
              <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mx-auto shadow-lg`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-display font-bold text-xl text-white">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="text-center py-8 opacity-60">
          <p className="text-sm font-mono text-white/40 uppercase tracking-widest mb-6">Powered By</p>
          <div className="flex items-center justify-center gap-12 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white" />
              <span className="font-bold text-white text-xl">Circle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-500" />
              <span className="font-bold text-white text-xl">Stacks</span>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
