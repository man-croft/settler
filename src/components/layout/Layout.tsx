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
        variant="secondary" 
        onClick={disconnectStacks}
        className="font-mono"
      >
        <span className="w-2 h-2 rounded-full bg-electric-purple mr-2 shadow-[0_0_10px_#BD00FF]" />
        {shortenAddress(stacksAddress)}
      </Button>
    )
  }

  return (
    <Button 
      variant="secondary"
      onClick={handleConnect}
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
                    variant="default"
                    onClick={openConnectModal}
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
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <Button
                  variant="secondary"
                  onClick={openAccountModal}
                  className="font-mono"
                >
                  <span className="w-2 h-2 rounded-full bg-electric-lime mr-2 shadow-[0_0_10px_#D9FF00]" />
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
    <div className="min-h-screen font-sans flex flex-col bg-background text-foreground overflow-x-hidden selection:bg-electric-lime selection:text-black">
      {/* Network Warning Banner */}
      <NetworkBanner />
      
      {/* Floating Clay Navbar */}
      <div className="w-full px-4 pt-6 z-50">
        <header className="max-w-6xl mx-auto clay-card h-20 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 font-semibold text-xl tracking-tight hover:opacity-80 transition-opacity">
            <span className="font-display font-black text-2xl tracking-tight text-gradient-electric drop-shadow-sm">SETTLER</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <Link to="/create" className="hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] transition-all">Create Invoice</Link>
            <Link to="/track" className="hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] transition-all">Track</Link>
            <Link to="/treasury" className="hover:text-white hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] transition-all">Treasury</Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <StacksConnectButton />
            <EthereumConnectButton />
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-12 text-center text-sm text-white/30 border-t border-white/5 mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <p className="font-mono">SETTLER • Cross-chain invoicing powered by Circle xReserve</p>
        </div>
      </footer>
    </div>
  )
}
