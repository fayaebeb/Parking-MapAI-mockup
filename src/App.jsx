import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Current from './routes/Current.jsx'
import Landing from './routes/Landing.jsx'
import Simulation from './routes/Simulation.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/current" element={<Current />} />
        <Route path="/simulation" element={<Simulation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
