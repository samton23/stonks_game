export interface Player {
  id: number;
  telegram_id: number;
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
  players: Player[];
}

export interface DashboardPlayer {
  id: number;
  name: string;
  score: number;
  enterprises_count: number;
  factories_count: number;
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

// WebApp (Mini App)
export interface WebAppPlayer {
  id: number;
  telegram_id: number;
  name: string;
  money: number;
  revenue: number;
  current_cycle: number;
  enterprises: PlayerEnterprise[];
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
