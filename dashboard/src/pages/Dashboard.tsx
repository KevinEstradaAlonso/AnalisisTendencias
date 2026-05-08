import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Metric, Text, Flex, Grid, Badge } from '@tremor/react'
import RadarGeneral from '../components/RadarGeneral'
import AlertasPanel from '../components/AlertasPanel'
import MapaCalor from '../components/MapaCalor'
import { usePosts, useAlertas, type Post, type Alerta } from '../hooks/useFirestore'

export default function Dashboard() {
  const navigate = useNavigate()
  
  // Datos de hoy
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000)
  
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen del día: {hoy.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPIs */}
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card decoration="top" decorationColor="blue">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Menciones Totales</Text>
              <Metric>{metricas.totalPosts}</Metric>
            </div>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="rose">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Menciones Negativas</Text>
              <Metric>{metricas.negativos}</Metric>
            </div>
            {metricas.negativos > 0 && (
              <Badge color="rose">
                {Math.round((metricas.negativos / metricas.totalPosts) * 100)}%
              </Badge>
            )}
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="orange">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Urgencia Alta</Text>
              <Metric>{metricas.urgentes}</Metric>
            </div>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="red">
          <Flex justifyContent="between" alignItems="center">
            <div>
              <Text>Riesgo Viral</Text>
              <Metric>{metricas.riesgoViral}</Metric>
            </div>
            {metricas.riesgoViral > 0 && (
              <Badge color="red">Atención</Badge>
            )}
          </Flex>
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
