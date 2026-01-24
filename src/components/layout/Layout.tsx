import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
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
        className="font-mono text-xs border-white/10 hover:bg-white/5"
      >
        <div className="w-2 h-2 rounded-full bg-orbital-orange mr-2" />
        {shortenAddress(stacksAddress)}
      </Button>
    )
  }

  return (
    <Button 
      variant="outline"
      size="sm"
      onClick={handleConnect}
      className="border-white/10 hover:bg-white/5 text-xs"
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
                    className="bg-orbital-blue hover:bg-orbital-blue/90 text-white text-xs border-none"
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
                    className="text-xs"
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
                  className="font-mono text-xs border-white/10 hover:bg-white/5"
                >
                  <div className="w-2 h-2 rounded-full bg-orbital-blue mr-2" />
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
    <div className="min-h-screen bg-black text-foreground font-sans">
      <NetworkBanner />
      <Sidebar />
      
      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-end px-6 border-b border-white/5 bg-black/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <StacksConnectButton />
            <EthereumConnectButton />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10 w-full animate-in fade-in duration-500">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
