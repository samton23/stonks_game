export interface BrowserJoinResponse {
  token: string;
  player_id: number;
  name: string;
  money: number;
}

export interface Player {
  id: number;
  telegram_id?: number | null;
  name: string;
  money: number;
  enterprises: PlayerEnterprise[];
  revenue: number;
}

export interface PlayerEnterprise {
  id: number;
  enterprise_id: number;
  enterprise_name: string;
  enterprise_emoji: string;
  profit: number;
  profit_cycle_interval?: number;
  factory_count: number;
  factory_profit_percent: number;
  effective_profit: number;
}

export interface Enterprise {
  id: number;
  name: string;
  emoji: string;
  price: number;
  profit: number;
  profit_cycle_interval: number;
  factory_price: number;
  factory_profit_percent: number;
}

export interface GameState {
  current_cycle: number;
  total_cycles: number;
  game_finished: boolean;
  players: Player[];
}

export interface EnterpriseModifier {
  enterprise_id: number;
  enterprise_name: string;
  enterprise_emoji: string;
  base_profit: number;
  modifier: number;
  effective_profit: number;
}

export interface DashboardPlayer {
  id: number;
  name: string;
  score: number;
  money: number;
  revenue: number;
  enterprises_count: number;
  factories_count: number;
  cycle_income: number;
  enterprise_modifiers: EnterpriseModifier[];
}

export interface DashboardData {
  players: DashboardPlayer[];
  game_finished: boolean;
  current_cycle: number;
  total_cycles: number;
  active_events: ActiveEventInfo[];
}

export interface ActiveEventInfo {
  id: number;
  name: string;
  description: string;
  profit_modifier: number;
  remaining_cycles: number;
  affected_all: boolean;
  affected_enterprises: { id: number; name: string; emoji: string }[];
}

export interface Settings {
  rules: string;
  budget: string;
  current_cycle: string;
  [key: string]: string;
}

export interface TimerState {
  timer_running: boolean;
  game_timer_end: number;
  cycle_timer_end: number;
  game_timer_remaining: number;
  cycle_timer_remaining: number;
  game_timer_duration: number;
  cycle_timer_duration: number;
}

export interface GameEvent {
  id: number;
  name: string;
  description: string;
  affected_enterprises: string;
  profit_modifier: number;
  duration_cycles: number;
  remaining_cycles: number;
  is_active: boolean;
}

export interface PlayerStockInfo {
  player_id: number;
  player_name: string;
  own_percentage: number;
  holders: { owner_id: number; owner_name: string; percentage: number }[];
  owned_in_others: { target_player_id: number; target_player_name: string; percentage: number; expected_income: number }[];
}

export interface StocksOverview {
  players: {
    player_id: number;
    player_name: string;
    own_percentage: number;
    holders: { owner_id: number; owner_name: string; percentage: number }[];
  }[];
  bank: {
    target_player_id: number;
    target_player_name: string;
    percentage: number;
  }[];
}

export interface WebAppStockData {
  own_percentage: number;
  owned_in_others: {
    target_player_id: number;
    target_player_name: string;
    percentage: number;
    target_budget: number;
    target_revenue_per_cycle: number;
    estimated_yield: number;
  }[];
  total_estimated_yield: number;
  remaining_cycles: number;
}

// WebApp (Mini App)
export interface WebAppPlayer {
  id: number;
  telegram_id?: number | null;
  name: string;
  money: number;
  revenue: number;
  current_cycle: number;
  enterprises: PlayerEnterprise[];
  prev_cycle_income?: number;
}

export interface PriceItem {
  id: number;
  name: string;
  emoji: string;
  price: number;
  profit: number;
  profit_cycle_interval: number;
  factory_price: number;
  factory_profit_percent: number;
}

export interface InAppNotification {
  id: number;
  type: string;
  emoji: string;
  title: string;
  message: string;
  created_at: string | null;
}

export interface GameLogEntry {
  id: number;
  timestamp: string;
  action_type: string;
  player_id: number | null;
  player_name: string | null;
  amount: number | null;
  description: string;
  cycle: number | null;
}
