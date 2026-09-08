import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { User, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  role: UserRole
  isCollaborator: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<User>
  register: (data: {
    name: string
    email: string
    password: string
    role: UserRole
  }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const mapRecordToUser = (record: any): User | null => {
    if (!record) return null
    return {
      id: record.id,
      collectionId: record.collectionId || '_pb_users_auth_',
      collectionName: record.collectionName || 'users',
      email: record.email || '',
      name: record.name || record.email?.split('@')[0] || 'Usuário',
      avatar: record.avatar,
      role: (record.role as UserRole) || 'cliente',
      created: record.created || new Date().toISOString(),
      updated: record.updated || new Date().toISOString(),
    }
  }

  const refreshUser = async () => {
    try {
      if (pb.authStore.isValid && pb.authStore.record) {
        const fresh = await pb.collection('users').getOne(pb.authStore.record.id)
        setUser(mapRecordToUser(fresh))
      } else {
        setUser(null)
      }
    } catch {
      setUser(mapRecordToUser(pb.authStore.record))
    }
  }

  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      setUser(mapRecordToUser(pb.authStore.record))
      refreshUser().finally(() => setIsLoading(false))
    } else {
      setUser(null)
      setIsLoading(false)
    }

    const unsubscribe = pb.authStore.onChange((_token, model) => {
      setUser(mapRecordToUser(model))
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string): Promise<User> => {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    const u = mapRecordToUser(authData.record)!
    setUser(u)
    return u
  }

  const register = async (data: {
    name: string
    email: string
    password: string
    role: UserRole
  }) => {
    await pb.collection('users').create({
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      name: data.name,
      role: data.role,
    })
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  const role = user?.role || 'cliente'
  const isCollaborator = role === 'colaborador'

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isCollaborator,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
