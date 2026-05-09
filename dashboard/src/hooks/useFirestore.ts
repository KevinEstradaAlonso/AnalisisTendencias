import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  DocumentData 
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'

export interface Post {
  id: string
  fuente: string
  urlOrigen: string
  texto: string
  fecha: Date
  clasificacion: {
    temas: string[]
    temaPrincipal: string
    sentimiento: string
    urgencia: string
    tipoInteraccion: string
    tono: string
    confianza: number
    keywordsDetectadas: string[]
  }
  ubicacion: {
    colonia: string | null
    calle: string | null
    referencia: string | null
    precision: string
  }
  contexto: {
    tiempoProblema: string
    afectacionEstimada: string
    solicitaAccion: boolean
    mencionaAutoridad: string[]
    evidenciaMencionada: boolean
  }
  resumen: string
}

export interface Alerta {
  id: string
  tema: string
  colonia: string | null
  fechaGeneracion: Date
  tipoAlerta: string
  descripcion: string
  totalPosts: number
  leida: boolean
  resuelta: boolean
}

export function usePosts(desde: Date, hasta: Date) {
  const { userData } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  
  // Usar timestamps para dependencias estables
  const desdeTime = desde.getTime()
  const hastaTime = hasta.getTime()

  useEffect(() => {
    if (!userData?.municipioId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'municipios', userData.municipioId, 'posts'),
      where('fecha', '>=', Timestamp.fromMillis(desdeTime)),
      where('fecha', '<=', Timestamp.fromMillis(hastaTime)),
      orderBy('fecha', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => convertPost(doc.id, doc.data()))
      setPosts(postsData)
      setLoading(false)
    }, (error) => {
      console.error('Error en posts:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userData?.municipioId, desdeTime, hastaTime])

  return { posts, loading }
}

export function useAlertas() {
  const { userData } = useAuth()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userData?.municipioId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'municipios', userData.municipioId, 'alertas'),
      where('resuelta', '==', false)
      // orderBy requiere índice compuesto - removido temporalmente
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertasData = snapshot.docs.map(doc => convertAlerta(doc.id, doc.data()))
      setAlertas(alertasData)
      setLoading(false)
    }, (error) => {
      console.error('Error en alertas:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [userData?.municipioId])

  return { alertas, loading }
}

function convertPost(id: string, data: DocumentData): Post {
  return {
    id,
    fuente: data.fuente,
    urlOrigen: data.url_origen,
    texto: data.texto,
    fecha: data.fecha?.toDate() ?? new Date(),
    clasificacion: {
      temas: data.clasificacion?.temas ?? [],
      temaPrincipal: data.clasificacion?.tema_principal ?? 'otro',
      sentimiento: data.clasificacion?.sentimiento ?? 'neutral',
      urgencia: data.clasificacion?.urgencia ?? 'baja',
      tipoInteraccion: data.clasificacion?.tipo_interaccion ?? 'queja',
      tono: data.clasificacion?.tono ?? 'neutral',
      confianza: data.clasificacion?.confianza ?? 0.5,
      keywordsDetectadas: data.clasificacion?.keywords_detectadas ?? [],
    },
    ubicacion: {
      colonia: data.ubicacion?.colonia ?? null,
      calle: data.ubicacion?.calle ?? null,
      referencia: data.ubicacion?.referencia ?? null,
      precision: data.ubicacion?.precision ?? 'no_detectada',
    },
    contexto: {
      tiempoProblema: data.contexto?.tiempo_problema ?? 'no_aplica',
      afectacionEstimada: data.contexto?.afectacion_estimada ?? 'no_especificada',
      solicitaAccion: data.contexto?.solicita_accion ?? false,
      mencionaAutoridad: data.contexto?.menciona_autoridad ?? [],
      evidenciaMencionada: data.contexto?.evidencia_mencionada ?? false,
    },
    resumen: data.resumen ?? '',
  }
}

function convertAlerta(id: string, data: DocumentData): Alerta {
  return {
    id,
    tema: data.tema,
    colonia: data.colonia ?? null,
    fechaGeneracion: data.fecha_generacion?.toDate() ?? new Date(),
    tipoAlerta: data.tipo_alerta,
    descripcion: data.descripcion,
    totalPosts: data.total_posts ?? 0,
    leida: data.leida ?? false,
    resuelta: data.resuelta ?? false,
  }
}
