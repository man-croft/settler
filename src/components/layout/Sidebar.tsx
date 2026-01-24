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
        <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-black/50 border-white/10 backdrop-blur-md">
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-black/90 border-r border-white/5 backdrop-blur-xl transform transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-white/5">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-orbital-orange to-red-500 flex items-center justify-center font-bold text-black">
                S
              </div>
              <span className="font-display font-bold text-xl tracking-tight">SETTLER</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActive 
                      ? "bg-orbital-orange/10 text-orbital-orange" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-orbital-orange" : "text-zinc-500 group-hover:text-white"
                  )} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer / User */}
          <div className="p-4 border-t border-white/5">
            <div className="text-xs text-zinc-500 text-center font-mono">
              v1.0.0 • Testnet
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
