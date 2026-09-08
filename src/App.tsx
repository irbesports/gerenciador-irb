import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'

// Layout & Global
import Layout from '@/components/Layout'

// Auth Pages
import Login from '@/pages/Login'
import Register from '@/pages/Register'

// Main Pages
import Index from '@/pages/Index'
import ChampionshipsList from '@/pages/ChampionshipsList'
import ChampionshipForm from '@/pages/ChampionshipForm'
import ChampionshipDetail from '@/pages/ChampionshipDetail'

import YearsList from '@/pages/YearsList'
import SeasonsList from '@/pages/SeasonsList'
import SeasonForm from '@/pages/SeasonForm'

import PilotsList from '@/pages/PilotsList'
import PilotDetail from '@/pages/PilotDetail'

import FinancialDashboard from '@/pages/FinancialDashboard'
import InvoiceForm from '@/pages/InvoiceForm'
import InvoiceDetail from '@/pages/InvoiceDetail'

import SupportList from '@/pages/SupportList'
import SupportDetail from '@/pages/SupportDetail'

import InfractionsList from '@/pages/InfractionsList'
import InfractionForm from '@/pages/InfractionForm'
import ModerationList from '@/pages/ModerationList'
import ScoringSystemPage from '@/pages/ScoringSystemPage'

import ManufacturersList from '@/pages/ManufacturersList'
import CarsList from '@/pages/CarsList'
import TracksList from '@/pages/TracksList'

import AdminDashboard from '@/pages/AdminDashboard'
import NotFound from '@/pages/NotFound'

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireCollaborator?: boolean }> = ({
  children,
  requireCollaborator = false,
}) => {
  const { user, isCollaborator, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] text-gray-500 font-medium text-sm">
        Carregando Racing Manager...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireCollaborator && !isCollaborator) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />

          {/* Platform Inside Main Carbon Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard */}
            <Route path="/" element={<Index />} />

            {/* Championships */}
            <Route path="/campeonatos" element={<ChampionshipsList />} />
            <Route path="/campeonatos/novo" element={<ChampionshipForm />} />
            <Route path="/campeonatos/:id" element={<ChampionshipDetail />} />
            <Route path="/campeonatos/:id/editar" element={<ChampionshipForm />} />

            {/* Seasons & Years */}
            <Route path="/anos" element={<YearsList />} />
            <Route path="/temporadas" element={<SeasonsList />} />
            <Route path="/temporadas/novo" element={<SeasonForm />} />
            <Route path="/temporadas/:id/editar" element={<SeasonForm />} />

            {/* Pilots */}
            <Route path="/pilotos" element={<PilotsList />} />
            <Route path="/pilotos/:id" element={<PilotDetail />} />

            {/* Financial */}
            <Route path="/financeiro" element={<FinancialDashboard />} />
            <Route path="/financeiro/cobrancas/novo" element={<InvoiceForm />} />
            <Route path="/financeiro/cobrancas/:id" element={<InvoiceDetail />} />
            <Route path="/financeiro/cobrancas/:id/editar" element={<InvoiceForm />} />

            {/* Support */}
            <Route path="/suporte" element={<SupportList />} />
            <Route path="/suporte/:id" element={<SupportDetail />} />

            {/* Infractions & Moderation */}
            <Route path="/infracoes" element={<InfractionsList />} />
            <Route path="/infracoes/novo" element={<InfractionForm />} />
            <Route path="/moderacao" element={<ModerationList />} />
            <Route path="/pontuacao" element={<ScoringSystemPage />} />

            {/* Reference Data */}
            <Route path="/montadoras" element={<ManufacturersList />} />
            <Route path="/carros" element={<CarsList />} />
            <Route path="/pistas" element={<TracksList />} />

            {/* Admin Console (Collaborator Only) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireCollaborator>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* 404 Inside Layout */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  )
}
