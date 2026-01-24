import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { useWalletStore } from '@/store/wallet'
import { shortenAddress } from '@/lib/utils'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'
import { NetworkBanner } from '@/components/NetworkBanner'
import { Link } from 'react-router-dom'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

interface LayoutProps {
  children: ReactNode
  showSidebar?: boolean
}

function StacksConnectButton() {
  const { stacksAddress, setStacksWallet, disconnectStacks } = useWalletStore()

  const handleConnect = () => {
    showConnect({
      appDetails: {
        name: 'Settler',
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
        size="sm"
        onClick={disconnectStacks}
        className="font-mono text-xs border-white/10 hover:border-white/30 hover:bg-transparent rounded-lg"
      >
        <div className="w-2 h-2 rounded-full bg-minimal-accent mr-2" />
        {shortenAddress(stacksAddress)}
      </Button>
    )
  }

  return (
    <Button 
      variant="outline"
      size="sm"
      onClick={handleConnect}
      className="border-white/10 hover:border-white/30 hover:bg-transparent text-xs rounded-lg"
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
                    size="sm"
                    onClick={openConnectModal} 
                    className="btn-minimal text-xs rounded-lg"
                  >
                    Connect ETH
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={openChainModal}
                    className="text-xs rounded-lg"
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAccountModal}
                  className="font-mono text-xs border-white/10 hover:border-white/30 hover:bg-transparent rounded-lg"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
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

export function Layout({ children, showSidebar = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-minimal-black text-foreground font-sans">
      <NetworkBanner />
      
      {showSidebar && <Sidebar />}
      
      <div className={`${showSidebar ? 'lg:pl-64' : ''} flex flex-col min-h-screen transition-all duration-300`}>
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-8 lg:px-16 border-b border-white/5 bg-minimal-black/80 backdrop-blur-sm sticky top-0 z-30">
          {/* Logo - only show when sidebar is hidden */}
          {!showSidebar && (
            <Link to="/" className="flex items-center gap-2 hover-reveal pb-1">
              <span className="font-serif italic text-2xl">Settler</span>
            </Link>
          )}
          
          {/* Spacer when sidebar is visible */}
          {showSidebar && <div />}
          
          {/* Wallet Buttons */}
          <div className="flex items-center gap-3">
            <StacksConnectButton />
            <EthereumConnectButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
