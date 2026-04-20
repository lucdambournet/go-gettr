export interface Person {
  id: string;
  name: string;
  active?: boolean;
  is_parent?: boolean;
  avatar_color?: string;
  weekly_allowance?: number;
  notify_on_payout_request?: boolean;
  max_single_payout?: number | null;
}

export interface Chore {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  frequency?: string;
  icon?: string;
  active?: boolean;
  payout_per_completion?: number;
}

export interface ChoreLog {
  id: string;
  chore_id: string;
  person_id: string;
  week_start: string;
  day: string;
  completed: boolean;
}

export interface Streak {
  id: string;
  person_id: string;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  total_rewards_earned: number;
}

export interface Payout {
  id: string;
  person_id: string;
  amount: number;
  status: "pending" | "paid";
  requested_date: string;
  paid_date?: string;
}

export interface Notification {
  id: string;
  person_id?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_date: string;
  icon?: string;
}

export interface Achievement {
  id: string;
  person_id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  earned_date: string;
}

export interface PublicSettings {
  id: string;
  theme?: string;
  app_name?: string;
  app_icon?: string;
}
