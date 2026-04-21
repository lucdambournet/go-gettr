export interface Profile {
  id: string;
  auth_user_id?: string | null;
  first_name: string;
  last_name: string;
  /** Computed by the API layer: first_name + ' ' + last_name */
  name: string;
  email: string;
  phone_number?: string | null;
  role: 'parent' | 'child';
  /** Computed by the API layer: role === 'parent' */
  is_parent: boolean;
  family_id: string | null;
  active?: boolean;
  avatar_color?: string;
  weekly_allowance?: number;
  notify_on_payout_request?: boolean;
  max_single_payout?: number | null;
  created_at?: string;
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
  profile_id: string;
  week_start: string;
  day: string;
  completed: boolean;
}

export interface Streak {
  id: string;
  profile_id: string;
  current_streak: number;
  longest_streak: number;
  last_checkin_date: string | null;
  total_rewards_earned: number;
}

export interface Payout {
  id: string;
  profile_id: string;
  amount: number;
  status: 'pending' | 'paid';
  requested_date: string;
  paid_date?: string;
}

export interface Notification {
  id: string;
  profile_id?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_date: string;
  icon?: string;
}

export interface Achievement {
  id: string;
  profile_id: string;
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

export interface Family {
  id: string;
  name: string;
  created_by: string | null;
  created_at?: string;
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  email: string;
  role: 'parent' | 'child';
  token: string;
  invited_by: string | null;
  status: 'pending' | 'accepted';
  expires_at: string;
  created_at?: string;
}
