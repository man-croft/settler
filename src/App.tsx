import { Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/Home'
import { CreatePage } from './pages/Create'
import { PayPage } from './pages/Pay'
import { TrackPage } from './pages/Track'
import { TreasuryPage } from './pages/Treasury'
import { NotFoundPage } from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/pay" element={<PayPage />} />
      <Route path="/track" element={<TrackPage />} />
      <Route path="/treasury" element={<TreasuryPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
