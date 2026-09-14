import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { HomeHeader } from '@/components/home/HomeHeader'
import { PriorityAlert } from '@/components/home/PriorityAlert'
import { LiveSessionSection } from '@/components/home/LiveSessionSection'
import { NextRaceSection } from '@/components/home/NextRaceSection'
import { MyIRBSection } from '@/components/home/MyIRBSection'
import { LatestResultSection } from '@/components/home/LatestResultSection'
import { UpcomingRacesSection } from '@/components/home/UpcomingRacesSection'
import { ChampionshipsSection } from '@/components/home/ChampionshipsSection'
import { StandingsSection } from '@/components/home/StandingsSection'
import { HistoricalResultsSection } from '@/components/home/HistoricalResultsSection'
import { ContentSection } from '@/components/home/ContentSection'
import { ExploreSection } from '@/components/home/ExploreSection'
import { HomeFooter } from '@/components/home/HomeFooter'
import { StateSimulatorBar } from '@/components/home/StateSimulatorBar'

import {
  mockPriorityAlert,
  mockLiveSessions,
  mockNextRaceVisitor,
  mockNextRaceDriver,
  mockDriverSummary,
  mockLatestOfficialResult,
  mockUpcomingRaces,
  mockChampionships,
  mockDriverStandings,
  mockTeamStandings,
  mockHistoricalResults,
  mockContentArticles,
  mockExploreLinks,
} from '@/mock/homeData'

export default function HomeView() {
  const { user } = useAuth()

  // Em produção, o State Simulator NÃO deve ser exibido nem usado como fonte de verdade.
  // Em DEV / QA, o simulador permite validar os estados da hierarquia visual IRB.
  const isDev = Boolean(import.meta.env.DEV)

  const [hasLive, setHasLive] = useState(true)
  const [hasAlert, setHasAlert] = useState(true)
  const [isDriverSimulated, setIsDriverSimulated] = useState(false)
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null)

  // Em produção: a autenticação REAL do usuário é a única fonte de verdade.
  // Usuário não autenticado = visitante. Usuário autenticado = driver/inscrito.
  // Em DEV: o simulador StateSimulatorBar permite alternar estados visuais.
  const isDriverActive = isDev ? isDriverSimulated : Boolean(user)

  // Determine current active alert (em produção, exige usuário autenticado com pendência real)
  const currentAlert =
    (isDev ? hasAlert && isDriverSimulated : Boolean(user)) &&
    dismissedAlertId !== mockPriorityAlert.id
      ? mockPriorityAlert
      : null

  // Determine live sessions (em produção mock ativo da Home; em DEV respeita toggle)
  const currentLiveSessions = (isDev ? hasLive : true) ? mockLiveSessions : []

  // Determine next race (personalized if driver mode is active)
  const currentNextRace = isDriverActive ? mockNextRaceDriver : mockNextRaceVisitor

  // Driver summary data (null if not logged in or in visitor preview)
  const currentDriver = isDriverActive ? mockDriverSummary : null

  const handleResetSimulator = () => {
    setHasLive(true)
    setHasAlert(true)
    setIsDriverSimulated(false)
    setDismissedAlertId(null)
  }

  return (
    <div className="min-h-screen bg-[#0B0B14] text-white flex flex-col font-sans selection:bg-[#E10600] selection:text-white">
      {/* State Simulator Toolbar: visível APENAS em ambiente de DEV / QA */}
      {isDev && (
        <StateSimulatorBar
          hasLive={hasLive}
          setHasLive={setHasLive}
          hasAlert={hasAlert}
          setHasAlert={setHasAlert}
          isDriverState={isDriverSimulated}
          setIsDriverState={setIsDriverSimulated}
          onReset={handleResetSimulator}
        />
      )}

      {/* 1. Header (Self-contained, public-ready with CTA "ENTRAR" or user menu) */}
      <HomeHeader liveCount={currentLiveSessions.length} />

      {/* 2. Priority Alert (Only appears if action needed, collapses completely otherwise) */}
      {currentAlert && (
        <PriorityAlert alert={currentAlert} onDismiss={(id) => setDismissedAlertId(id)} />
      )}

      {/* 3. NOW / LIVE (Only shows when session is active; disappears if no live session) */}
      {currentLiveSessions.length > 0 && <LiveSessionSection sessions={currentLiveSessions} />}

      {/* 4. NEXT (Next relevant race - takes top priority if no LIVE session) */}
      <NextRaceSection race={currentNextRace} isUserDriver={isDriverActive} />

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10 sm:space-y-12">
        {/* Above the fold combined block: MY IRB + ÚLTIMO RESULTADO */}
        {/* Desktop: side by side; Tablet: side by side or stacked; Mobile: naturally stacked */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* 5. MY IRB (visitante vê CTA entrar; autenticado/driver vê resumo) */}
          <div className="h-full">
            <MyIRBSection isLoggedIn={isDriverActive} driver={currentDriver} />
          </div>

          {/* 6. ÚLTIMO RESULTADO (Official sports result with podium) */}
          <div className="h-full">
            <LatestResultSection result={mockLatestOfficialResult} />
          </div>
        </div>

        {/* 7. PRÓXIMAS CORRIDAS (Compact & highly legible list) */}
        <UpcomingRacesSection races={mockUpcomingRaces} />

        {/* 8. CAMPEONATOS (Discovery grid with status and upcoming stages) */}
        <ChampionshipsSection championships={mockChampionships} />

        {/* Standings & Historical Results side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* 9. CLASSIFICAÇÃO (Drivers | Teams toggleable standings) */}
          <div className="h-full">
            <StandingsSection drivers={mockDriverStandings} teams={mockTeamStandings} />
          </div>

          {/* 10. ÚLTIMOS RESULTADOS (Historical official results archive) */}
          <div className="h-full">
            <HistoricalResultsSection results={mockHistoricalResults} />
          </div>
        </div>

        {/* 11. CONTEÚDO (Sports editorial, interviews, videos) */}
        <ContentSection articles={mockContentArticles} />

        {/* 12. EXPLORE (IRB Ecosystem quick access) */}
        <ExploreSection items={mockExploreLinks} />
      </main>

      {/* IRB Platform Global Footer */}
      <HomeFooter />
    </div>
  )
}
