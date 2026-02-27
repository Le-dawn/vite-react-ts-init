import type { UserResponse } from '@/service/user'

export const AUTH_TOKEN_KEY = 'access_token'
export const REFRESH_TOKEN_KEY = 'refresh_token'
export const USER_INFO_KEY = 'user_info'

export const getAuthToken = (): string => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export const getRefreshToken = (): string => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

export const setRefreshToken = (token: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export const removeRefreshToken = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export const getUserInfo = (): UserResponse | null => {
  if (typeof window === 'undefined') return null
  const userInfo = localStorage.getItem(USER_INFO_KEY)
  if (userInfo) {
    try {
      return JSON.parse(userInfo)
    } catch {
      return null
    }
  }
  return null
}

export const setUserInfo = (userInfo: UserResponse): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
}

export const removeUserInfo = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_INFO_KEY)
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken() && !!getRefreshToken()
}

export const clearAuth = (): void => {
  removeAuthToken()
  removeRefreshToken()
  removeUserInfo()
}

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}