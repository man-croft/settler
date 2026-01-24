import { Link, useLocation } from 'react-router-dom'
import { Home, PlusCircle, Activity, Wallet, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Create Invoice', href: '/create', icon: PlusCircle },
  { name: 'Track Status', href: '/track', icon: Activity },
  { name: 'Treasury', href: '/treasury', icon: Wallet },
]

export function Sidebar() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsOpen(!isOpen)} 
          className="bg-minimal-black/80 border-white/10 backdrop-blur-md hover:bg-white/5 rounded-lg"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-minimal-black border-r border-white/5 transform transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-8 border-b border-white/5">
            <Link to="/" className="flex items-center gap-2 hover-reveal pb-1">
              <span className="font-serif italic text-2xl text-minimal-white">Settler</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActive 
                      ? "bg-white/5 text-minimal-white" 
                      : "text-white/40 hover:text-minimal-white hover:bg-white/[0.02]"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-minimal-accent" : "text-white/30 group-hover:text-white/60"
                  )} strokeWidth={1.5} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-white/5">
            <div className="flex items-center justify-between text-xs text-white/20">
              <span className="font-mono">v1.0.0</span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>Testnet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
