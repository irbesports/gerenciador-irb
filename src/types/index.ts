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
  iracing_series_id?: string
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
  regulation_text?: string
  regulation_file?: string
  regulation_rules?: string[] | { code?: string; title: string; description?: string }[]
  short_code?: string
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
  case_counter?: number
  is_closed?: boolean
  closed_at?: string
  closed_by?: string
  expand?: {
    closed_by?: User
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

export type RegistrationStatus = 'pendente' | 'aprovada' | 'recusada' | 'cancelada'
export type RegistrationPaymentStatus = 'pendente' | 'pago' | 'isento' | 'reembolsado' | 'cancelado'

export interface ChampionshipPilot extends RecordModel {
  championship_id: string
  pilot?: string
  name?: string
  iracing_id?: string
  number?: number
  team?: string
  number_options?: string
  car_class?: string
  registration_status?: RegistrationStatus
  payment_status?: RegistrationPaymentStatus
  paid_at?: string
  approved_at?: string
  notes?: string
  expand?: {
    pilot?: Pilot
    championship_id?: Championship
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
  iracing_id?: string
  country_code?: string
  expand?: {
    user_id?: User
  }
}

export type ResultImportStatus = 'ativo' | 'substituido' | 'excluido'

export interface RaceImport extends RecordModel {
  subsession_id: number
  session_name?: string
  file_name?: string
  track_name?: string
  track_config?: string
  simulated_start_time?: string
  championship_id: string
  stage_race_id: string
  imported_by?: string
  status: ResultImportStatus
  raw_json?: any
  expand?: {
    championship_id?: Championship
    stage_race_id?: StageRace
    imported_by?: User
  }
}

/**
 * RaceResultRecord representa o registro persistido na coleção `race_results`.
 *
 * NOTA DE ARQUITETURA ESPORTIVA IRB:
 * A coleção `race_results` é uma camada existente e legada de resultados importados e
 * normalizados a partir da telemetria bruta do iRacing (race_imports).
 * Ela NÃO deve ser tratada automaticamente como resultado oficial final ou homologado da liga IRB.
 * O resultado oficial da IRB requer validação desportiva pela direção de prova e comissários,
 * incluindo aplicação de punições pós-corrida (moderation_cases), descartes de pontuação e
 * homologação em ata desportiva. Não criar atalhos de "official result" direto nesta camada sem auditoria.
 */
export interface RaceResultRecord extends RecordModel {
  race_import_id: string
  stage_race_id: string
  championship_id: string
  pilot_id?: string
  cust_id: number
  display_name: string
  finish_position: number
  finish_position_in_class: number
  starting_position?: number
  starting_position_in_class?: number
  car_id?: number
  car_name?: string
  car_class_id?: number
  car_class_name?: string
  car_class_short_name?: string
  best_lap_num?: number
  best_lap_time?: number
  best_lap_time_str?: string
  best_qual_lap_num?: number
  best_qual_lap_time?: number
  best_qual_lap_time_str?: string
  average_lap?: number
  average_lap_str?: string
  laps_complete?: number
  laps_lead?: number
  incidents?: number
  points?: number
  bonus_points?: number
  total_points?: number
  is_pole?: boolean
  is_fastest_lap?: boolean
  is_winner?: boolean
  is_podium?: boolean
  weight_penalty_kg?: number
  drop_race?: boolean
  country_code?: string
  car_number?: string
  reason_out?: string
  status: ResultImportStatus
  expand?: {
    pilot_id?: Pilot
    stage_race_id?: StageRace
    championship_id?: Championship
    race_import_id?: RaceImport
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
  championship_pilot_id?: string
  amount: number
  description?: string
  due_date?: string
  status: InvoiceStatus
  expand?: {
    pilot_id?: Pilot
    championship_id?: Championship
    championship_pilot_id?: ChampionshipPilot
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

export type ModerationCaseStatus =
  | 'Em análise'
  | 'Aplicado em corrida'
  | 'Aplicado pós corrida'
  | 'Nenhuma ação necessária'

export type ModerationCaseOpenedByType = 'comissarios' | 'protesto_piloto'

export interface ModerationCase extends RecordModel {
  stage_race_id: string
  championship_id: string
  code?: string
  case_number?: number
  lap: number | string
  involved_pilots?: string[]
  guilty_pilot_id?: string
  opened_by_type: ModerationCaseOpenedByType
  author_user_id?: string
  author_pilot_id?: string
  status: ModerationCaseStatus
  infraction_cited?: string
  penalty_applied?: string
  penalty_points?: number
  penalty_seconds?: number
  penalty_positions?: number
  penalty_type?: string
  cancelled?: boolean
  description?: string
  deadline?: string
  expand?: {
    stage_race_id?: StageRace & {
      expand?: {
        stage_id?: ChampionshipStage & {
          expand?: {
            track?: Track
            championship_id?: Championship
          }
        }
      }
    }
    championship_id?: Championship
    involved_pilots?: Pilot[]
    guilty_pilot_id?: Pilot
    author_user_id?: User
    author_pilot_id?: Pilot
  }
}

export interface ModerationCaseMessage extends RecordModel {
  case_id: string
  user_id: string
  pilot_id?: string
  message: string
  attachment?: string
  is_steward_ruling?: boolean
  expand?: {
    user_id?: User
    pilot_id?: Pilot
  }
}

export type NotificationType = 'protesto' | 'comissarios' | 'decisao' | 'geral'

export interface AppNotification extends RecordModel {
  recipient_user_id?: string
  recipient_pilot_id?: string
  type: NotificationType
  title: string
  message: string
  target_link?: string
  read?: boolean
  moderation_case_id?: string
  expand?: {
    recipient_user_id?: User
    recipient_pilot_id?: Pilot
    moderation_case_id?: ModerationCase
  }
}
