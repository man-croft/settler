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
    color: 'bg-electric-lime text-black',
  },
  {
    icon: ArrowLeftRight,
    title: 'Seamless Bridge',
    description: 'Auto-convert Ethereum USDC to Stacks USDCx.',
    color: 'bg-white text-black',
  },
  {
    icon: Shield,
    title: 'Bitcoin Security',
    description: 'Settlement protected by Stacks Bitcoin finality.',
    color: 'bg-electric-purple text-white',
  },
]

export function HomePage() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-24 py-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-8 relative">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-electric-purple/20 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <h1 className="text-6xl md:text-8xl font-display font-black leading-[0.9] tracking-tighter">
              SETTLE ON
              <br />
              <span className="text-gradient-electric drop-shadow-[0_0_30px_rgba(217,255,0,0.3)]">BITCOIN.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto font-light mt-8 leading-relaxed">
              The financial OS for the Bitcoin economy. <br/>
              Get paid in <span className="text-white font-semibold">USDC</span>. Settle in <span className="text-electric-lime font-semibold">USDCx</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-12">
              <Link to="/create">
                <Button size="lg" className="h-16 px-10 text-lg shadow-[0_0_30px_-5px_rgba(217,255,0,0.5)] hover:shadow-[0_0_50px_-5px_rgba(217,255,0,0.7)] transition-all hover:scale-105">
                  Start Invoicing
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/treasury">
                <Button variant="secondary" className="h-16 px-10 text-lg hover:scale-105">
                  View Treasury
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Visual Flow */}
        <div className="clay-card p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-electric-purple/5 via-transparent to-electric-lime/5" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
            {/* ETH Side */}
            <div className="text-center space-y-4 group">
              <div className="w-24 h-24 rounded-[2rem] bg-[#1a1033] shadow-clay-input flex items-center justify-center mx-auto transition-all group-hover:scale-110">
                <span className="text-4xl font-display font-bold text-white">$</span>
              </div>
              <div>
                <p className="font-bold text-white text-lg font-display">USDC</p>
                <p className="text-xs text-white/40 font-mono tracking-widest">ETHEREUM</p>
              </div>
            </div>

            {/* Bridge Animation */}
            <div className="flex-1 max-w-xs flex items-center gap-4">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-white/5 to-electric-purple" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-electric-purple to-electric-lime flex items-center justify-center shadow-[0_0_30px_rgba(189,0,255,0.4)] animate-pulse">
                <ArrowLeftRight className="w-8 h-8 text-black" />
              </div>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-electric-lime to-white/5" />
            </div>

            {/* STX Side */}
            <div className="text-center space-y-4 group">
              <div className="w-24 h-24 rounded-[2rem] bg-[#1a1033] shadow-clay-input flex items-center justify-center mx-auto transition-all group-hover:scale-110">
                <span className="text-4xl font-display font-bold text-electric-lime">S</span>
              </div>
              <div>
                <p className="font-bold text-white text-lg font-display">USDCx</p>
                <p className="text-xs text-white/40 font-mono tracking-widest">STACKS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.title} className="clay-card-interactive cursor-pointer group">
              <CardContent className="pt-10 pb-10 px-8 text-center space-y-6">
                <div className={`w-16 h-16 rounded-2xl ${feature.color} flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="font-display font-bold text-xl text-white">{feature.title}</h3>
                <p className="text-white/70 leading-relaxed font-light">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="text-center py-8 opacity-60">
          <p className="text-xs font-mono text-white/30 uppercase tracking-[0.3em] mb-8">Powered By</p>
          <div className="flex items-center justify-center gap-12 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
              <span className="font-display font-bold text-white text-2xl">Circle</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              <span className="font-display font-bold text-white text-2xl">Stacks</span>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
