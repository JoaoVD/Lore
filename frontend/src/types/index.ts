export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  detail: string
  status_code: number
}
