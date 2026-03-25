export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  plan: 'free' | 'pro' | 'business'
  created_at: string
}

export interface UpgradeError {
  error: string
  message: string
  current_plan: 'free' | 'pro' | 'business'
  limit: number | null
  current_count: number | null
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  detail: string
  status_code: number
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
}

export interface Subscription {
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'inactive'
  plan: 'free' | 'pro' | 'business'
  stripe_subscription_id?: string
  current_period_end?: string
}

export type MemberRole = 'owner' | 'editor' | 'viewer'

export interface ProjectMember {
  user_id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: MemberRole
}

export interface GoogleDriveIntegration {
  id: string
  project_id: string
  google_email: string
  folder_id: string | null
  folder_name: string | null
  last_synced_at: string | null
  created_at: string
}

export interface DriveFolder {
  id: string
  name: string
}
