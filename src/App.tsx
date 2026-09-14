import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/toaster'

// Layout & Global
import Layout from '@/components/Layout'

// Auth Pages
import Login from '@/pages/Login'
import Register from '@/pages/Register'

// Public Home V1 & Sports Pages
import HomeView from '@/pages/HomeView'
import { SportsPlaceholderPage } from '@/pages/SportsPlaceholderPage'

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
import RaceModerationPage from '@/pages/RaceModerationPage'
import ModerationCaseDetail from '@/pages/ModerationCaseDetail'
import StewardsHubPage from '@/pages/StewardsHubPage'
import PilotNewProtestPage from '@/pages/PilotNewProtestPage'
import MyProtestsPage from '@/pages/MyProtestsPage'

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
          {/* Public Home V1 Route for ALL (visitors and authenticated users) */}
          <Route path="/" element={<HomeView />} />

          {/* Public Sports Subpages with dedicated Home IRB Header */}
          <Route
            path="/race-center"
            element={
              <SportsPlaceholderPage
                title="Race Center & Live Timing"
                subtitle="Acompanhamento ao vivo de voltas, telemetria em tempo real e súmula esportiva das sessões IRB."
                badgeText="LIVE STREAM & TIMING"
                icon="radio"
              />
            }
          />
          <Route
            path="/corrida/:id"
            element={
              <SportsPlaceholderPage
                title="Detalhes da Corrida"
                subtitle="Horários oficiais de largada, grid de largada homologado, condições de pista e regulamento particular da etapa."
                badgeText="PRÓXIMA ETAPA"
                icon="calendar"
              />
            }
          />
          <Route
            path="/calendario"
            element={
              <SportsPlaceholderPage
                title="Calendário Esportivo IRB"
                subtitle="Cronograma oficial das temporadas 2025: treinos oficiais, briefings, qualificações e corridas principais."
                badgeText="TEMPORADA 2025"
                icon="calendar"
              />
            }
          />
          <Route
            path="/resultados"
            element={
              <SportsPlaceholderPage
                title="Resultados Oficiais Homologados"
                subtitle="Atas esportivas após auditoria dos comissários desportivos. Posições e penalidades pós-corrida aplicadas."
                badgeText="HOMOLOGAÇÃO OFICIAL"
                icon="check"
              />
            }
          />
          <Route
            path="/classificacoes"
            element={
              <SportsPlaceholderPage
                title="Classificações Oficiais Drivers & Teams"
                subtitle="Tabelas de pontuação por categoria com sistema de descartes e critérios de desempate homologados."
                badgeText="TABELA DE PONTOS"
                icon="award"
              />
            }
          />
          <Route
            path="/conteudo"
            element={
              <SportsPlaceholderPage
                title="Conteúdo & Notícias IRB"
                subtitle="Artigos técnicos, entrevistas com competidores, análises táticas e destaques das transmissões ao vivo."
                badgeText="PORTAL ESPORTIVO"
                icon="trophy"
              />
            }
          />
          <Route
            path="/explore/drivers"
            element={
              <SportsPlaceholderPage
                title="Grid Oficial de Drivers"
                subtitle="Estatísticas completas, histórico de pódios, vitórias e identificador único IRB_ID de cada competidor."
                badgeText="COMUNIDADE COMPETITIVA"
                icon="shield"
              />
            }
          />
          <Route
            path="/explore/teams"
            element={
              <SportsPlaceholderPage
                title="Equipes & Organizações (Teams)"
                subtitle="Estrutura de organizações permanentes e participações homologadas por temporada."
                badgeText="TEAMS HOMOLOGADAS"
                icon="shield"
              />
            }
          />

          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />

          {/* Platform Inside Main Carbon Layout (Management system moved to /dashboard) */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard (moved from '/' to '/dashboard' for management) */}
            <Route path="/dashboard" element={<Index />} />

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
            <Route
              path="/moderacao/central-de-provas"
              element={
                <ProtectedRoute>
                  <StewardsHubPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/moderacao/corrida/:raceId"
              element={
                <ProtectedRoute>
                  <RaceModerationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/moderacao/caso/:id"
              element={
                <ProtectedRoute>
                  <ModerationCaseDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/pontuacao" element={<ScoringSystemPage />} />

            {/* Protestos Desportivos do Piloto */}
            <Route path="/protestar" element={<PilotNewProtestPage />} />
            <Route path="/meus-protestos" element={<MyProtestsPage />} />
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
