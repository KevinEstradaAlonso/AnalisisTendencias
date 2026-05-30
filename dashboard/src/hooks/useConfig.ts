import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'

export interface MunicipioConfig {
  fuentes?: Array<{ tipo: string; url: string; activa: boolean }>
  temas?: {
    globales?: string[]
    personalizados?: Array<{ nombre: string; keywords: string[]; activo: boolean }>
    candidatos?: string[]
  }
}

export function useConfig() {
  const { userData } = useAuth()
  const [config, setConfig] = useState<MunicipioConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData?.municipioId) {
      setLoading(false)
      return
    }

    const unsub = onSnapshot(
      doc(db, 'municipios', userData.municipioId),
      (snap) => {
        if (snap.exists()) {
          setConfig(snap.data() as MunicipioConfig)
        } else {
          setConfig(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error('useConfig error:', err)
        setLoading(false)
      }
    )

    return () => unsub()
  }, [userData?.municipioId])

  const candidatos = config?.temas?.candidatos ?? []

  return { config, candidatos, loading }
}
