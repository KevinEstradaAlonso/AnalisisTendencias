import { useMemo, useState } from 'react'
import { Card, DonutChart, BarChart, Legend } from '@tremor/react'
import { usePosts } from '../hooks/useFirestore'
import { useConfig } from '../hooks/useConfig'
import '../components/GraficaTendencia.css'

const PERIODOS = [
  { label: '7 días', dias: 7 },
  { label: '30 días', dias: 30 },
  { label: '60 días', dias: 60 },
  { label: '120 días', dias: 120 },
] as const

const DONUT_COLORS = ['indigo', 'violet', 'purple', 'fuchsia', 'pink', 'blue', 'cyan', 'teal']
const SENTIMIENTO_COLORS: Record<string, string> = {
  positivo: 'emerald',
  negativo: 'rose',
  neutral: 'gray',
}

export default function Candidatos() {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]['dias']>(7)
  const { candidatos, loading: configLoading } = useConfig()

  const { desde, hasta } = useMemo(() => {
    const h = new Date()
    const d = new Date(h.getTime() - periodo * 24 * 60 * 60 * 1000)
    return { desde: d, hasta: h }
  }, [periodo])

  const { posts, loading: postsLoading } = usePosts(desde, hasta)

  const candidatosLower = useMemo(
    () => candidatos.map((c) => c.trim().toLowerCase()),
    [candidatos]
  )

  // --- GRÁFICA 1: % de menciones por candidato (Donut) ---
  const donutData = useMemo(() => {
    const porCandidato = new Map<string, number>()

    posts.forEach((post) => {
      const tema = post.clasificacion.temaPrincipal?.trim().toLowerCase()
      if (!tema || !candidatosLower.includes(tema)) return
      porCandidato.set(tema, (porCandidato.get(tema) ?? 0) + 1)
    })

    const total = Array.from(porCandidato.values()).reduce((a, b) => a + b, 0)
    if (total === 0) return []

    return Array.from(porCandidato.entries())
      .map(([temaLower, count]) => {
        const nombreOriginal = candidatos.find((c) => c.trim().toLowerCase() === temaLower) ?? temaLower
        return {
          name: nombreOriginal,
          value: Math.round((count / total) * 100),
          menciones: count,
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [posts, candidatos, candidatosLower])

  // --- GRÁFICA 2: Sentimiento por candidato (Barras apiladas al 100%) ---
  const sentimientoData = useMemo(() => {
    const porCandidato = new Map<
      string,
      { total: number; positivos: number; negativos: number; neutrales: number }
    >()

    posts.forEach((post) => {
      const tema = post.clasificacion.temaPrincipal?.trim().toLowerCase()
      if (!tema || !candidatosLower.includes(tema)) return

      const current = porCandidato.get(tema) ?? { total: 0, positivos: 0, negativos: 0, neutrales: 0 }
      current.total++
      if (post.clasificacion.sentimiento === 'positivo') current.positivos++
      else if (post.clasificacion.sentimiento === 'negativo') current.negativos++
      else current.neutrales++
      porCandidato.set(tema, current)
    })

    if (porCandidato.size === 0) return []

    return Array.from(porCandidato.entries()).map(([temaLower, stats]) => {
      const nombreOriginal = candidatos.find((c) => c.trim().toLowerCase() === temaLower) ?? temaLower
      const total = stats.total || 1
      return {
        candidato: nombreOriginal,
        Positivo: Math.round((stats.positivos / total) * 100),
        Negativo: Math.round((stats.negativos / total) * 100),
        Neutral: Math.round((stats.neutrales / total) * 100),
        menciones: stats.total,
      }
    })
  }, [posts, candidatos, candidatosLower])

  const loading = configLoading || postsLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-gray-800 tracking-tight">Candidatos</h1>
          <p className="text-gray-500 font-light">
            {candidatos.length > 0
              ? `${candidatos.length} candidato${candidatos.length !== 1 ? 's' : ''} monitoreado${candidatos.length !== 1 ? 's' : ''}`
              : 'Sin candidatos configurados'}
          </p>
        </div>

        {/* Selector de período */}
        <div className="inline-flex p-1 rounded-2xl bg-white/45 border border-white/50 shadow-sm backdrop-blur-sm">
          {PERIODOS.map((op) => (
            <button
              key={op.dias}
              type="button"
              onClick={() => setPeriodo(op.dias)}
              className={`px-3 py-1.5 rounded-xl text-sm transition-all ${
                periodo === op.dias
                  ? 'bg-white text-gray-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {candidatos.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-400">
            <p className="font-light">No hay candidatos configurados.</p>
            <p className="text-sm mt-2">
              Ve a{' '}
              <a href="/admin/configuracion" className="text-indigo-500 hover:text-indigo-700 underline">
                Configuración
              </a>{' '}
              y marca los temas globales como candidatos.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Gráfica 1: % de menciones por candidato */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div>
                <h3 className="text-lg font-light text-gray-700">¿De quién se habla más?</h3>
                <p className="text-sm text-gray-400 font-light">
                  Distribución de menciones por candidato — {periodo} días
                </p>
              </div>

              {donutData.length === 0 ? (
                <div className="h-64 mt-6 flex items-center justify-center text-sm text-gray-400 font-light">
                  Sin menciones en este período
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center">
                  <DonutChart
                    data={donutData}
                    category="value"
                    index="name"
                    colors={DONUT_COLORS}
                    className="h-64"
                    showAnimation={true}
                    showLabel={true}
                  />
                  <Legend
                    categories={donutData.map((d) => d.name)}
                    colors={DONUT_COLORS}
                    className="mt-4 max-w-md"
                  />
                  <div className="mt-4 text-xs text-gray-400 space-y-1">
                    {donutData.map((d) => (
                      <div key={d.name} className="flex justify-between gap-8">
                        <span className="capitalize font-medium text-gray-600">{d.name}</span>
                        <span className="text-gray-500">{d.value}% ({d.menciones} menciones)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Gráfica 2: Sentimiento por candidato */}
            <Card>
              <div>
                <h3 className="text-lg font-light text-gray-700">Sentimiento por candidato</h3>
                <p className="text-sm text-gray-400 font-light">
                  % de menciones positivas, negativas y neutrales — {periodo} días
                </p>
              </div>

              {sentimientoData.length === 0 ? (
                <div className="h-64 mt-6 flex items-center justify-center text-sm text-gray-400 font-light">
                  Sin menciones en este período
                </div>
              ) : (
                <div className="grafica-tendencia-tooltip mt-6">
                  <BarChart
                    className="h-72"
                    data={sentimientoData}
                    index="candidato"
                    categories={['Positivo', 'Neutral', 'Negativo']}
                    colors={['emerald', 'gray', 'rose']}
                    stack={true}
                    showLegend
                    showGridLines={false}
                    showAnimation={true}
                    yAxisWidth={40}
                    valueFormatter={(v) => `${v}%`}
                  />
                  <div className="mt-4 space-y-2 text-xs text-gray-400">
                    {sentimientoData.map((s) => (
                      <div key={s.candidato} className="flex justify-between gap-4">
                        <span className="capitalize font-medium text-gray-600 w-28 truncate" title={s.candidato}>
                          {s.candidato}
                        </span>
                        <span className="text-emerald-600 w-16 text-right">{s.Positivo}% pos</span>
                        <span className="text-gray-500 w-16 text-right">{s.Neutral}% neu</span>
                        <span className="text-rose-600 w-16 text-right">{s.Negativo}% neg</span>
                        <span className="text-gray-500 w-16 text-right">({s.menciones})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
