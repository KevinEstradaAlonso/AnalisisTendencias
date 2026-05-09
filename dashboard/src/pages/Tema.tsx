import { useParams, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import GraficaTendencia from '../components/GraficaTendencia'
import MapaCalor from '../components/MapaCalor'
import { usePosts } from '../hooks/useFirestore'

export default function Tema() {
  const { tema } = useParams<{ tema: string }>()
  const navigate = useNavigate()
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  
  // Últimos 7 días - useMemo para evitar re-renders infinitos
  const { desde, hasta } = useMemo(() => {
    const h = new Date()
    const d = new Date(h.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { desde: d, hasta: h }
  }, [])
  
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

  const pillBase =
    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap backdrop-blur-sm'

  const sentimientoPill: Record<string, string> = {
    positivo: `${pillBase} bg-emerald-50/60 text-emerald-700 border-emerald-200/50`,
    negativo: `${pillBase} bg-rose-50/60 text-rose-700 border-rose-200/50`,
    neutral: `${pillBase} bg-gray-50/60 text-gray-700 border-gray-200/50`,
  }

  const urgenciaPill: Record<string, string> = {
    alta: `${pillBase} bg-red-50/60 text-red-700 border-red-200/50`,
    media: `${pillBase} bg-orange-50/60 text-orange-700 border-orange-200/50`,
    baja: `${pillBase} bg-gray-50/60 text-gray-700 border-gray-200/50`,
  }

  const formatEtiqueta = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-spinner w-12 h-12 animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="glass-button flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm">Regresar</span>
        </button>
        <div>
          <h1 className="text-3xl font-light text-gray-800 capitalize tracking-tight">{tema}</h1>
          <p className="text-gray-500 font-light">{postsTema.length} menciones · últimos 7 días</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficaTendencia tema={tema ?? ''} data={tendenciaData} />
        <MapaCalor data={mapaCalorData} />
      </div>

      <Card>
        <h3 className="text-lg font-light text-gray-700 mb-6">Menciones Recientes</h3>
        
        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Fecha</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-[520px]">Resumen</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Ubicación</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Sentimiento</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Urgencia</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Tono</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {postsTema.slice(0, 20).map((post) => (
                <TableRow key={post.id} className="hover:bg-white/40 transition-colors">
                  <TableCell className="align-top text-sm text-gray-600 whitespace-nowrap">
                    {post.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell className="align-top w-[520px] whitespace-normal">
                    <div 
                      className={`text-sm text-gray-700 cursor-pointer break-words whitespace-normal ${expandedPost === post.id ? '' : 'line-clamp-2'}`}
                      onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    >
                      {post.resumen || post.texto}
                    </div>
                    {post.texto.length > 100 && (
                      <button 
                        className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 font-medium"
                        onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                      >
                        {expandedPost === post.id ? 'Menos' : 'Más'}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm text-gray-600">
                    <span className="truncate block max-w-[120px]" title={post.ubicacion.colonia ?? 'No detectada'}>
                      {post.ubicacion.colonia ?? 'No detectada'}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <span
                      className={
                        sentimientoPill[post.clasificacion.sentimiento] ??
                        `${pillBase} bg-gray-50/60 text-gray-700 border-gray-200/50`
                      }
                      title={post.clasificacion.sentimiento}
                    >
                      {formatEtiqueta(post.clasificacion.sentimiento)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <span
                      className={
                        urgenciaPill[post.clasificacion.urgencia] ??
                        `${pillBase} bg-gray-50/60 text-gray-700 border-gray-200/50`
                      }
                      title={post.clasificacion.urgencia}
                    >
                      {formatEtiqueta(post.clasificacion.urgencia)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top text-sm text-gray-600 capitalize">
                    {post.clasificacion.tono}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  )
}
