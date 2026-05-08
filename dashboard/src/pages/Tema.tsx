import { useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge } from '@tremor/react'
import GraficaTendencia from '../components/GraficaTendencia'
import MapaCalor from '../components/MapaCalor'
import { usePosts } from '../hooks/useFirestore'

export default function Tema() {
  const { tema } = useParams<{ tema: string }>()
  
  // Últimos 7 días
  const hasta = new Date()
  const desde = new Date(hasta.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  const { posts, loading } = usePosts(desde, hasta)

  // Filtrar posts por tema
  const postsTema = useMemo(() => {
    return posts.filter(p => 
      p.clasificacion.temaPrincipal === tema || 
      p.clasificacion.temas.includes(tema ?? '')
    )
  }, [posts, tema])

  // Datos para gráfica de tendencia
  const tendenciaData = useMemo(() => {
    const porDia = new Map<string, { total: number; negativos: number; positivos: number }>()
    
    // Inicializar todos los días
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hasta.getTime() - i * 24 * 60 * 60 * 1000)
      const key = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      porDia.set(key, { total: 0, negativos: 0, positivos: 0 })
    }

    postsTema.forEach(post => {
      const key = post.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      const current = porDia.get(key)
      if (current) {
        current.total++
        if (post.clasificacion.sentimiento === 'negativo') current.negativos++
        else if (post.clasificacion.sentimiento === 'positivo') current.positivos++
      }
    })

    return Array.from(porDia.entries()).map(([fecha, stats]) => ({
      fecha,
      ...stats
    }))
  }, [postsTema, hasta])

  // Datos para mapa de calor
  const mapaCalorData = useMemo(() => {
    const porColonia = new Map<string, { total: number; negativos: number; urgenciaAlta: number }>()
    
    postsTema.forEach(post => {
      const colonia = post.ubicacion.colonia
      if (!colonia) return
      
      const current = porColonia.get(colonia) ?? { total: 0, negativos: 0, urgenciaAlta: 0 }
      current.total++
      if (post.clasificacion.sentimiento === 'negativo') current.negativos++
      if (post.clasificacion.urgencia === 'alta') current.urgenciaAlta++
      porColonia.set(colonia, current)
    })

    return Array.from(porColonia.entries())
      .map(([colonia, stats]) => ({ colonia, ...stats }))
  }, [postsTema])

  const sentimientoColor = {
    positivo: 'emerald',
    negativo: 'rose',
    neutral: 'gray',
  } as const

  const urgenciaColor = {
    alta: 'red',
    media: 'orange',
    baja: 'gray',
  } as const

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 capitalize">{tema}</h1>
        <p className="text-gray-500">{postsTema.length} menciones en los últimos 7 días</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficaTendencia tema={tema ?? ''} data={tendenciaData} />
        <MapaCalor data={mapaCalorData} />
      </div>

      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Menciones Recientes</h3>
        
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Fecha</TableHeaderCell>
              <TableHeaderCell>Resumen</TableHeaderCell>
              <TableHeaderCell>Ubicación</TableHeaderCell>
              <TableHeaderCell>Sentimiento</TableHeaderCell>
              <TableHeaderCell>Urgencia</TableHeaderCell>
              <TableHeaderCell>Tono</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {postsTema.slice(0, 20).map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  {post.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="truncate" title={post.texto}>
                    {post.resumen || post.texto.slice(0, 100)}
                  </p>
                </TableCell>
                <TableCell>
                  {post.ubicacion.colonia ?? 'No detectada'}
                </TableCell>
                <TableCell>
                  <Badge color={sentimientoColor[post.clasificacion.sentimiento as keyof typeof sentimientoColor]}>
                    {post.clasificacion.sentimiento}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge color={urgenciaColor[post.clasificacion.urgencia as keyof typeof urgenciaColor]}>
                    {post.clasificacion.urgencia}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">
                  {post.clasificacion.tono}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
