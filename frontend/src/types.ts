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
  money: number;
  revenue: number;
  enterprises_count: number;
  factories_count: number;
}

export interface Settings {
  rules: string;
  budget: string;
  current_cycle: string;
  [key: string]: string;
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
