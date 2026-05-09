import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Badge, Card, Flex, Metric, Text } from '@tremor/react'
import RadarGeneral from '../components/RadarGeneral'
import AlertasPanel from '../components/AlertasPanel'
import MapaCalor from '../components/MapaCalor'
import { usePosts, useAlertas, type Alerta } from '../hooks/useFirestore'

export default function Dashboard() {
  const navigate = useNavigate()

  const [tendenciaDias, setTendenciaDias] = useState<7 | 30>(7)
  
  // Datos de hoy - useMemo para evitar re-renders infinitos
  const { inicioHoy, finHoy, hoy } = useMemo(() => {
    const hoy = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const fin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000)
    return { inicioHoy: inicio, finHoy: fin, hoy }
  }, []) // Solo se calcula una vez
  
  const { posts, loading: loadingPosts } = usePosts(inicioHoy, finHoy)

  const { desdeTendencia } = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const desdeTendencia = new Date(inicioHoy.getTime() - (tendenciaDias - 1) * dayMs)
    return { desdeTendencia }
  }, [inicioHoy, tendenciaDias])

  const { posts: postsTendencia, loading: loadingPostsTendencia } = usePosts(desdeTendencia, finHoy)
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

  const sentimientoHoy = useMemo(() => {
    const total = posts.length
    const negativos = posts.filter((p) => p.clasificacion.sentimiento === 'negativo').length
    const positivos = posts.filter((p) => p.clasificacion.sentimiento === 'positivo').length
    const neutrales = Math.max(total - negativos - positivos, 0)
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

    return {
      total,
      negativos,
      positivos,
      neutrales,
      pctNegativos: pct(negativos),
      pctPositivos: pct(positivos),
      pctNeutrales: pct(neutrales),
    }
  }, [posts])

  const tendenciaSentimientoData = useMemo(() => {
    const porDia = new Map<string, { negativos: number; neutrales: number; positivos: number; total: number }>()
    const dayMs = 24 * 60 * 60 * 1000

    for (let i = tendenciaDias - 1; i >= 0; i--) {
      const fecha = new Date(inicioHoy.getTime() - i * dayMs)
      const key = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      porDia.set(key, { negativos: 0, neutrales: 0, positivos: 0, total: 0 })
    }

    postsTendencia.forEach((post) => {
      const key = post.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
      const current = porDia.get(key)
      if (!current) return

      current.total++
      if (post.clasificacion.sentimiento === 'negativo') current.negativos++
      else if (post.clasificacion.sentimiento === 'positivo') current.positivos++
      else current.neutrales++
    })

    return Array.from(porDia.entries()).map(([fecha, stats]) => ({
      fecha,
      ...stats,
    }))
  }, [postsTendencia, tendenciaDias, inicioHoy])

  const rankingNegativos = useMemo(() => {
    const porTema = new Map<string, { total: number; negativos: number }>()

    posts.forEach((post) => {
      const tema = post.clasificacion.temaPrincipal
      const current = porTema.get(tema) ?? { total: 0, negativos: 0 }
      current.total++
      if (post.clasificacion.sentimiento === 'negativo') current.negativos++
      porTema.set(tema, current)
    })

    const rows = Array.from(porTema.entries()).map(([tema, v]) => {
      const pctNeg = v.total > 0 ? Math.round((v.negativos / v.total) * 100) : 0
      return { tema, total: v.total, negativos: v.negativos, pctNeg }
    })

    const topPorNumero = [...rows]
      .sort((a, b) => b.negativos - a.negativos || b.total - a.total || a.tema.localeCompare(b.tema))
      .slice(0, 5)

    const topPorPct = [...rows]
      .sort((a, b) => b.pctNeg - a.pctNeg || b.negativos - a.negativos || b.total - a.total)
      .slice(0, 5)

    return { topPorNumero, topPorPct }
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="!border-l-4 !border-l-indigo-300 h-full !pl-7 sm:!pl-9">
          <div className="space-y-2">
            <Text className="text-gray-500 text-sm font-medium">Menciones Totales</Text>
            <div className="flex items-baseline gap-2">
              <Metric className="text-gray-800">{metricas.totalPosts}</Metric>
              <span className="text-xs text-gray-400">hoy</span>
            </div>
          </div>
        </Card>

        <Card className="!border-l-4 !border-l-rose-300 h-full !pl-7 sm:!pl-9">
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

        <Card className="!border-l-4 !border-l-amber-300 h-full !pl-7 sm:!pl-9">
          <div className="space-y-2">
            <Text className="text-gray-500 text-sm font-medium">Urgencia Alta</Text>
            <Metric className="text-gray-800">{metricas.urgentes}</Metric>
          </div>
        </Card>

        <Card className="!border-l-4 !border-l-orange-300 h-full !pl-7 sm:!pl-9">
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
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <div>
                <h3 className="text-lg font-light text-gray-700">Sentimiento hoy</h3>
                <p className="text-sm text-gray-400 font-light">Distribución porcentual</p>
              </div>

              {sentimientoHoy.total === 0 ? (
                <div className="mt-6 text-center py-10 text-gray-400">
                  <p className="font-light">Sin menciones hoy</p>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-rose-50/50 border border-white/40">
                    <Text className="text-gray-500 text-xs font-medium">Negativo</Text>
                    <div className="mt-1 flex items-baseline gap-2">
                      <Metric className="text-gray-800">{sentimientoHoy.pctNegativos}%</Metric>
                      <span className="text-xs text-gray-400">({sentimientoHoy.negativos})</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50/60 border border-white/40">
                    <Text className="text-gray-500 text-xs font-medium">Neutral</Text>
                    <div className="mt-1 flex items-baseline gap-2">
                      <Metric className="text-gray-800">{sentimientoHoy.pctNeutrales}%</Metric>
                      <span className="text-xs text-gray-400">({sentimientoHoy.neutrales})</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-white/40">
                    <Text className="text-gray-500 text-xs font-medium">Positivo</Text>
                    <div className="mt-1 flex items-baseline gap-2">
                      <Metric className="text-gray-800">{sentimientoHoy.pctPositivos}%</Metric>
                      <span className="text-xs text-gray-400">({sentimientoHoy.positivos})</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-light text-gray-700">Tendencia de sentimiento</h3>
                  <p className="text-sm text-gray-400 font-light">Últimos {tendenciaDias} días</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTendenciaDias(7)}
                    className={
                      `px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                        tendenciaDias === 7
                          ? 'bg-white/70 border-white/60 text-gray-700'
                          : 'bg-white/40 border-white/40 text-gray-600 hover:bg-white/60'
                      }`
                    }
                  >
                    7d
                  </button>
                  <button
                    type="button"
                    onClick={() => setTendenciaDias(30)}
                    className={
                      `px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                        tendenciaDias === 30
                          ? 'bg-white/70 border-white/60 text-gray-700'
                          : 'bg-white/40 border-white/40 text-gray-600 hover:bg-white/60'
                      }`
                    }
                  >
                    30d
                  </button>
                </div>
              </div>

              {loadingPostsTendencia ? (
                <div className="mt-6 h-64 flex items-center justify-center">
                  <div className="glass-spinner w-10 h-10 animate-spin"></div>
                </div>
              ) : (
                <AreaChart
                  className="h-64 mt-6"
                  data={tendenciaSentimientoData}
                  index="fecha"
                  categories={['negativos', 'neutrales', 'positivos']}
                  colors={['rose', 'gray', 'emerald']}
                  stack={true}
                  showLegend
                  showGridLines={false}
                  curveType="monotone"
                  showAnimation={true}
                />
              )}
            </Card>
          </div>

          <RadarGeneral data={radarData} onTemaClick={handleTemaClick} />
          <MapaCalor data={mapaCalorData} />
        </div>
        <div className="space-y-6">
          <Card>
            <div>
              <h3 className="text-lg font-light text-gray-700">Top 5 temas más negativos</h3>
              <p className="text-sm text-gray-400 font-light">Hoy · por número y por porcentaje</p>
            </div>

            {posts.length === 0 ? (
              <div className="mt-6 text-center py-10 text-gray-400">
                <p className="font-light">Sin menciones hoy</p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 font-light mb-2">Por # de negativos</div>
                  <div className="space-y-2">
                    {rankingNegativos.topPorNumero.map((row) => (
                      <button
                        key={`num-${row.tema}`}
                        onClick={() => handleTemaClick(row.tema)}
                        className="w-full p-3 text-left bg-white/40 rounded-xl hover:bg-white/60 transition-all duration-200 border border-white/40"
                        title={row.tema}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-700 capitalize truncate">{row.tema}</span>
                          <Badge color="rose" size="sm">{row.negativos}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {row.pctNeg}% negativo · {row.total} total
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 font-light mb-2">Por % negativo</div>
                  <div className="space-y-2">
                    {rankingNegativos.topPorPct.map((row) => (
                      <button
                        key={`pct-${row.tema}`}
                        onClick={() => handleTemaClick(row.tema)}
                        className="w-full p-3 text-left bg-white/40 rounded-xl hover:bg-white/60 transition-all duration-200 border border-white/40"
                        title={row.tema}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-700 capitalize truncate">{row.tema}</span>
                          <Badge color="rose" size="sm">{row.pctNeg}%</Badge>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {row.negativos}/{row.total} negativos
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <AlertasPanel alertas={alertas} onAlertaClick={handleAlertaClick} />
        </div>
      </div>
    </div>
  )
}
