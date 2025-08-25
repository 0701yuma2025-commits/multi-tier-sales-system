'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database, UserRole } from '@/types/database'
import toast from 'react-hot-toast'

type User = Database['public']['Tables']['users']['Row']
type Agency = Database['public']['Tables']['agencies']['Row']

interface AuthContextType {
  user: User | null
  agency: Agency | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [agency, setAgency] = useState<Agency | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setLoading(false)
        return
      }

      // トークンを検証してユーザー情報を取得
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Token verification failed')
      }

      const data = await response.json()
      setUser(data.user)
      setAgency(data.agency)
    } catch (error) {
      localStorage.removeItem('auth_token')
      setUser(null)
      setAgency(null)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ログインに失敗しました')
      }

      localStorage.setItem('auth_token', data.token)
      setUser(data.user)
      setAgency(data.agency)

      toast.success('ログインしました')
      router.push('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ログインエラー')
      throw error
    }
  }

  async function signOut() {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('auth_token')
      setUser(null)
      setAgency(null)
      router.push('/login')
      toast.success('ログアウトしました')
    }
  }

  async function refreshSession() {
    await checkUser()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        agency,
        loading,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}