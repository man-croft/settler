import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TESTNET } from '@/lib/constants'

export function NetworkBanner() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  // Only show if connected and on wrong network
  if (!isConnected || chainId === TESTNET.ethereum.chainId) {
    return null
  }

  const handleSwitch = () => {
    switchChain({ chainId: TESTNET.ethereum.chainId })
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-3 px-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Wrong network detected. Please switch to <strong>Sepolia Testnet</strong> to use Settler.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSwitch}
          disabled={isPending}
          className="bg-white text-red-600 border-white hover:bg-white/90 hover:text-red-700 flex-shrink-0"
        >
          {isPending ? (
            'Switching...'
          ) : (
            <>
              Switch Network
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
