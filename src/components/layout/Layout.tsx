import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { useWalletStore } from '@/store/wallet'
import { shortenAddress } from '@/lib/utils'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'
import { NetworkBanner } from '@/components/NetworkBanner'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

interface LayoutProps {
  children: ReactNode
}

function StacksConnectButton() {
  const { stacksAddress, setStacksWallet, disconnectStacks } = useWalletStore()

  const handleConnect = () => {
    showConnect({
      appDetails: {
        name: 'Settler Bridge',
        icon: window.location.origin + '/settler.svg',
      },
      onFinish: () => {
        const userData = userSession.loadUserData()
        const address = userData.profile?.stxAddress?.testnet
        if (address) {
          setStacksWallet(address)
        }
      },
      userSession,
    })
  }

  if (stacksAddress) {
    return (
      <Button 
        variant="outline" 
        onClick={disconnectStacks}
        className="font-mono text-xs h-9 bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50"
      >
        <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
        {shortenAddress(stacksAddress)}
      </Button>
    )
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleConnect}
      className="text-xs h-9 bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/50 text-white"
    >
      Connect Stacks
    </Button>
  )
}

function EthereumConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button 
                    variant="outline"
                    onClick={openConnectModal} 
                    className="text-xs h-9 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/50 text-white"
                  >
                    Connect Ethereum
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button 
                    variant="destructive"
                    onClick={openChainModal}
                    className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white border-none"
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <Button
                  variant="outline"
                  onClick={openAccountModal}
                  className="font-mono text-xs h-9 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/50 text-white"
                >
                  <span className="w-2 h-2 rounded-full bg-white mr-2" />
                  {account.displayName}
                </Button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  )
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen font-sans flex flex-col bg-background">
      {/* Network Warning Banner */}
      <NetworkBanner />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass-strong border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-semibold text-xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="font-display font-bold text-xl tracking-wider text-white">SETTLER</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <Link to="/create" className="hover:text-white hover:glow-white transition-all">Create Invoice</Link>
            <Link to="/track" className="hover:text-white hover:glow-white transition-all">Track</Link>
            <Link to="/treasury" className="hover:text-white hover:glow-white transition-all">Treasury</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <StacksConnectButton />
            <EthereumConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-white/40 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <p className="font-mono">SETTLER • Cross-chain invoicing powered by Circle xReserve</p>
        </div>
      </footer>
    </div>
  )
}
