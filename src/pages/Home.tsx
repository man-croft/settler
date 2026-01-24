import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'

export function HomePage() {
  return (
    <Layout showSidebar={false}>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-16">
          <div className="max-w-[1400px] mx-auto w-full space-y-12">
            {/* Massive Headline */}
            <div className="space-y-2">
              <h1 
                className="text-white leading-[0.9] tracking-tight"
                style={{ 
                  fontSize: 'clamp(4rem, 12vw, 10rem)',
                  fontFamily: "'Instrument Serif', Georgia, serif"
                }}
              >
                Settle
              </h1>
              <h1 
                className="leading-[0.9] tracking-tight"
                style={{ 
                  fontSize: 'clamp(4rem, 12vw, 10rem)',
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: 'italic',
                  color: '#FF4D00'
                }}
              >
                on Bitcoin.
              </h1>
            </div>

            {/* Subtitle Row */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pt-8">
              <p className="text-lg md:text-xl text-white/40 max-w-md leading-relaxed font-light">
                The financial OS for the Bitcoin economy. Get paid in USDC. Settle in USDCx.
              </p>
              
              <div className="flex items-center gap-4">
                <Link to="/create">
                  <Button className="h-14 px-8 text-base bg-white text-black hover:bg-[#FF4D00] hover:text-white transition-all">
                    Start Invoicing
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/treasury">
                  <Button variant="outline" className="h-14 px-8 text-base border-white/20 text-white/70 hover:border-white hover:text-white">
                    Treasury
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

        {/* Bridge Visual */}
        <section className="px-8 lg:px-16 py-20">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
              {/* USDC Side */}
              <div className="text-center">
                <p 
                  className="text-white/90"
                  style={{ 
                    fontSize: 'clamp(3rem, 8vw, 6rem)',
                    fontFamily: "'Instrument Serif', Georgia, serif"
                  }}
                >
                  $
                </p>
                <p className="mt-3 text-sm text-white/30 uppercase tracking-[0.2em]">USDC</p>
                <p className="text-xs text-white/20">Ethereum</p>
              </div>

              {/* Arrow */}
              <div className="flex items-center gap-4 text-white/20">
                <div className="w-16 h-px bg-white/10" />
                <ArrowRight className="w-5 h-5" strokeWidth={1} />
                <div className="w-16 h-px bg-white/10" />
              </div>

              {/* USDCx Side */}
              <div className="text-center">
                <p 
                  style={{ 
                    fontSize: 'clamp(3rem, 8vw, 6rem)',
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontStyle: 'italic',
                    color: '#FF4D00'
                  }}
                >
                  S
                </p>
                <p className="mt-3 text-sm text-white/30 uppercase tracking-[0.2em]">USDCx</p>
                <p className="text-xs text-white/20">Stacks</p>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

        {/* Features */}
        <section className="px-8 lg:px-16 py-20">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-3 gap-12 md:gap-8">
              {/* Feature 1 */}
              <div className="group cursor-default">
                <span 
                  className="block"
                  style={{ 
                    fontSize: '5rem',
                    lineHeight: 1,
                    WebkitTextStroke: '1px rgba(255,255,255,0.08)',
                    color: 'transparent'
                  }}
                >
                  01
                </span>
                <h3 
                  className="mt-4 text-white group-hover:text-[#FF4D00] transition-colors duration-300"
                  style={{ 
                    fontSize: '1.5rem',
                    fontFamily: "'Instrument Serif', Georgia, serif"
                  }}
                >
                  Smart Invoices
                </h3>
                <p className="mt-3 text-white/40 leading-relaxed">
                  Payment links that work cross-chain. No databases.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="group cursor-default">
                <span 
                  className="block"
                  style={{ 
                    fontSize: '5rem',
                    lineHeight: 1,
                    WebkitTextStroke: '1px rgba(255,255,255,0.08)',
                    color: 'transparent'
                  }}
                >
                  02
                </span>
                <h3 
                  className="mt-4 text-white group-hover:text-[#FF4D00] transition-colors duration-300"
                  style={{ 
                    fontSize: '1.5rem',
                    fontFamily: "'Instrument Serif', Georgia, serif"
                  }}
                >
                  Seamless Bridge
                </h3>
                <p className="mt-3 text-white/40 leading-relaxed">
                  Auto-convert via Circle xReserve protocol.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="group cursor-default">
                <span 
                  className="block"
                  style={{ 
                    fontSize: '5rem',
                    lineHeight: 1,
                    WebkitTextStroke: '1px rgba(255,255,255,0.08)',
                    color: 'transparent'
                  }}
                >
                  03
                </span>
                <h3 
                  className="mt-4 text-white group-hover:text-[#FF4D00] transition-colors duration-300"
                  style={{ 
                    fontSize: '1.5rem',
                    fontFamily: "'Instrument Serif', Georgia, serif"
                  }}
                >
                  Bitcoin Security
                </h3>
                <p className="mt-3 text-white/40 leading-relaxed">
                  Protected by Stacks Bitcoin finality.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 lg:px-16 py-10 border-t border-white/5 mt-auto">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-white/20">
              <span className="text-xs uppercase tracking-[0.2em]">Powered by</span>
              <span className="text-sm hover:text-white/50 transition-colors cursor-default">Circle</span>
              <span className="text-white/10">|</span>
              <span className="text-sm hover:text-white/50 transition-colors cursor-default">Stacks</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-white/30">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Testnet
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  )
}
