import { createContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export type UserRole = 'super_admin' | 'admin' | 'viewer'

export interface UserData {
  uid: string
  email: string
  municipioId: string
  rol: UserRole
  activo: boolean
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // Cargar datos del usuario desde Firestore
        const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData({
            uid: firebaseUser.uid,
            email: data.email,
            municipioId: data.municipioId,
            rol: data.rol,
            activo: data.activo,
          })
        }
      } else {
        setUserData(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
