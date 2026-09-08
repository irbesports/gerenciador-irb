import type { RecordModel } from 'pocketbase'

export type UserRole = 'cliente' | 'colaborador'

export interface User extends RecordModel {
  email: string
  name: string
  avatar?: string
  role: UserRole
}

export interface Year extends RecordModel {
  year: number
  name?: string
}

export type SeasonStatus = 'planejada' | 'ativa' | 'concluida'

export interface Season extends RecordModel {
  year_id: string
  name: string
  start_date?: string
  end_date?: string
  status?: SeasonStatus
  expand?: {
    year_id?: Year
  }
}

export type ChampionshipStatus = 'rascunho' | 'ativo' | 'concluido'
export type ChampionshipType = 'Road' | 'Oval' | 'Dirt Road'

export interface SingleScoringConfig {
  preset_id?: string
  rules: { position: number; points: number }[]
}

export interface MultiClassScoringConfig {
  class_name: string
  preset_id?: string
  rules: { position: number; points: number }[]
}

export type ChampionshipStagesScoring = SingleScoringConfig | MultiClassScoringConfig[]

export interface Championship extends RecordModel {
  season_id: string
  name: string
  description?: string
  status?: ChampionshipStatus
  championship_type?: ChampionshipType
  drop_scores?: number
  pilots_per_team?: number
  scoring_pilots_per_team?: number
  min_lap_percentage_points?: number
  bonus_fastest_lap?: number
  bonus_pole_position?: number
  bonus_no_incidents?: number
  bonus_most_positions_gained?: number
  bonus_most_laps_led?: number
  bonus_lead_lap?: number
  penalty_points_suspension?: number
  penalty_points_pit_start?: number
  loss_points_change_car?: boolean
  team_championship?: boolean
  fixed_setup?: boolean
  visible_to_pilots?: boolean
  multi_class?: boolean
  stages_scoring?: ChampionshipStagesScoring
  image?: string
  cars?: string[]
  expand?: {
    season_id?: Season & {
      expand?: {
        year_id?: Year
      }
    }
    cars?: Car[]
  }
}

export type StageDurationType = 'Minutos' | 'Voltas'
export type StageStatus = 'Agendada' | 'Em andamento' | 'Finalizada'

export interface ChampionshipStage extends RecordModel {
  championship_id: string
  order: number
  date?: string
  duration_type: StageDurationType
  duration: number
  points_multiplier?: number
  track?: string
  track_layout?: string
  status: StageStatus
  expand?: {
    track?: Track
    championship_id?: Championship
  }
}

export interface StageRace extends RecordModel {
  stage_id: string
  order: number
  duration_type: StageDurationType
  duration: number
  start_time?: string
  weather?: string
  inverted_positions?: number
  name?: string
  expand?: {
    stage_id?: ChampionshipStage & {
      expand?: {
        track?: Track
        championship_id?: Championship
      }
    }
  }
}

export interface StageRaceComment extends RecordModel {
  race_id: string
  user_id: string
  message: string
  expand?: {
    user_id?: User
  }
}

export interface ScoringPresetRule {
  position: number
  points: number
}

export interface ScoringPreset extends RecordModel {
  name: string
  description?: string
  rules: ScoringPresetRule[]
}

export interface ChampionshipPilot extends RecordModel {
  championship_id: string
  pilot?: string
  name?: string
  iracing_id?: string
  number?: number
  team?: string
  number_options?: string
  car_class?: string
  expand?: {
    pilot?: Pilot
  }
}

export type BatteryDurationType = 'Minutos' | 'Voltas'

export interface ChampionshipBattery extends RecordModel {
  championship_id: string
  order: number
  duration_type: BatteryDurationType
  duration: number
  start_time?: string
  weather?: string
  inverted_positions?: number
}

export interface ScoringRule extends RecordModel {
  championship_id: string
  position: number
  points: number
  bonus_fastest_lap?: number
}

export type PilotStatus = 'ativo' | 'inativo'

export interface Pilot extends RecordModel {
  user_id?: string
  name: string
  number?: number
  team_name?: string
  avatar?: string
  status?: PilotStatus
  expand?: {
    user_id?: User
  }
}

export type InfractionType =
  | 'ultrapassagem_perigosa'
  | 'toque_na_traseira'
  | 'bloqueio_de_trajetoria'
  | 'excesso_de_velocidade'
  | 'conduta_antidesportiva'
  | 'outros'

export type InfractionSeverity = 'baixa' | 'media' | 'alta'
export type InfractionStatus = 'aberta' | 'em_revisao' | 'resolvida' | 'descartada'

export interface Infraction extends RecordModel {
  pilot_id: string
  championship_id: string
  type: InfractionType
  description?: string
  severity: InfractionSeverity
  status: InfractionStatus
  expand?: {
    pilot_id?: Pilot
    championship_id?: Championship
  }
}

export type InvoiceStatus = 'pendente' | 'pago' | 'atrazado' | 'cancelado'

export interface Invoice extends RecordModel {
  pilot_id: string
  championship_id: string
  amount: number
  description?: string
  due_date?: string
  status: InvoiceStatus
  expand?: {
    pilot_id?: Pilot
    championship_id?: Championship
  }
}

export type PaymentMethod = 'pix' | 'cartao' | 'transferencia' | 'dinheiro'

export interface Payment extends RecordModel {
  invoice_id: string
  pilot_id: string
  amount: number
  payment_date?: string
  method: PaymentMethod
  expand?: {
    invoice_id?: Invoice
    pilot_id?: Pilot
  }
}

export interface Track extends RecordModel {
  name: string
  country?: string
  length?: number
  image?: string
}

export interface Manufacturer extends RecordModel {
  name: string
  country?: string
  founded_year?: number
  image?: string
}

export interface Car extends RecordModel {
  manufacturer_id: string
  model: string
  year?: number
  category?: string
  image?: string
  expand?: {
    manufacturer_id?: Manufacturer
  }
}

export type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido' | 'fechado'
export type TicketPriority = 'baixa' | 'media' | 'alta'

export interface SupportTicket extends RecordModel {
  user_id?: string
  subject: string
  content: string
  status: TicketStatus
  priority: TicketPriority
  expand?: {
    user_id?: User
  }
}

export interface SupportMessage extends RecordModel {
  ticket_id: string
  user_id: string
  content: string
  expand?: {
    user_id?: User
  }
}
