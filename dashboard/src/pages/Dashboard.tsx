import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Metric, Text, Flex, Grid, Badge } from '@tremor/react'
import RadarGeneral from '../components/RadarGeneral'
import AlertasPanel from '../components/AlertasPanel'
import MapaCalor from '../components/MapaCalor'
import { usePosts, useAlertas, type Post, type Alerta } from '../hooks/useFirestore'

export default function Dashboard() {
  const navigate = useNavigate()
  
  // Datos de hoy - useMemo para evitar re-renders infinitos
  const { inicioHoy, finHoy, hoy } = useMemo(() => {
    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000)
    return { inicioHoy: inicio, finHoy: fin, hoy }
  }, []) // Solo se calcula una vez
  
  const { posts, loading: loadingPosts } = usePosts(inicioHoy, finHoy)
  const { alertas, loading: loadingAlertas } = useAlertas()

  // Calcular métricas
  const metricas = useMemo(() => {
    const totalPosts = posts.length
    const negativos = posts.filter(p => p.clasificacion.sentimiento === 'negativo').length
    const urgentes = posts.filter(p => p.clasificacion.urgencia === 'alta').length
    const riesgoViral = posts.filter(p => 
      p.clasificacion.tono === 'desesperado' || p.clasificacion.tono === 'enojado'
    ).length

    return { totalPosts, negativos, urgentes, riesgoViral }
  }, [posts])

  // Datos para radar por tema
  const radarData = useMemo(() => {
    const porTema = new Map<string, { total: number; negativos: number; positivos: number; neutrales: number }>()
    
    posts.forEach(post => {
      const tema = post.clasificacion.temaPrincipal
      const current = porTema.get(tema) ?? { total: 0, negativos: 0, positivos: 0, neutrales: 0 }
      current.total++
      if (post.clasificacion.sentimiento === 'negativo') current.negativos++
      else if (post.clasificacion.sentimiento === 'positivo') current.positivos++
      else current.neutrales++
      porTema.set(tema, current)
    })

    return Array.from(porTema.entries())
      .map(([tema, stats]) => ({ tema, ...stats }))
      .sort((a, b) => b.total - a.total)
  }, [posts])

  // Datos para mapa de calor
  const mapaCalorData = useMemo(() => {
    const porColonia = new Map<string, { total: number; negativos: number; urgenciaAlta: number }>()
    
    posts.forEach(post => {
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
  }, [posts])

  const handleTemaClick = (tema: string) => {
    navigate(`/tema/${encodeURIComponent(tema)}`)
  }

  const handleAlertaClick = (alerta: Alerta) => {
    navigate('/alertas', { state: { alertaId: alerta.id } })
  }

  if (loadingPosts || loadingAlertas) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light text-gray-800 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1 font-light">
            {hoy.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="glass-button px-4 py-2 text-sm text-gray-600">
          Última actualización: {hoy.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* KPIs - Liquid Glass */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-5">
        <Card className="!border-l-4 !border-l-indigo-300">
          <div className="space-y-2">
            <Text className="text-gray-500 text-sm font-medium">Menciones Totales</Text>
            <div className="flex items-baseline gap-2">
              <Metric className="text-gray-800">{metricas.totalPosts}</Metric>
              <span className="text-xs text-gray-400">hoy</span>
            </div>
          </div>
        </Card>

        <Card className="!border-l-4 !border-l-rose-300">
          <div className="space-y-2">
            <Text className="text-gray-500 text-sm font-medium">Menciones Negativas</Text>
            <Flex alignItems="baseline" className="gap-2">
              <Metric className="text-gray-800">{metricas.negativos}</Metric>
              {metricas.negativos > 0 && metricas.totalPosts > 0 && (
                <Badge color="rose" size="sm">
                  {Math.round((metricas.negativos / metricas.totalPosts) * 100)}%
                </Badge>
              )}
            </Flex>
          </div>
        </Card>

        <Card className="!border-l-4 !border-l-amber-300">
          <div className="space-y-2">
            <Text className="text-gray-500 text-sm font-medium">Urgencia Alta</Text>
            <Metric className="text-gray-800">{metricas.urgentes}</Metric>
          </div>
        </Card>

        <Card className="!border-l-4 !border-l-orange-300">
          <div className="space-y-2">
            <Flex justifyContent="between" alignItems="start">
              <Text className="text-gray-500 text-sm font-medium">Riesgo Viral</Text>
              {metricas.riesgoViral > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
              )}
            </Flex>
            <Metric className="text-gray-800">{metricas.riesgoViral}</Metric>
          </div>
        </Card>
      </Grid>

      {/* Contenido principal */}
      <Grid numItemsLg={3} className="gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RadarGeneral data={radarData} onTemaClick={handleTemaClick} />
          <MapaCalor data={mapaCalorData} />
        </div>
        <div>
          <AlertasPanel alertas={alertas} onAlertaClick={handleAlertaClick} />
        </div>
      </Grid>
    </div>
  )
}
