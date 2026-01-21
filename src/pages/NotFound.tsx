import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-8">
          <h1 className="text-8xl font-display font-bold text-white/10">404</h1>
        </div>
        
        <h2 className="text-3xl font-display font-bold text-white mb-4">
          Page Not Found
        </h2>
        
        <p className="text-white/60 max-w-md mb-8">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>
        
        <div className="flex gap-4">
          <Link to="/">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="border-white/10 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </Layout>
  )
}
