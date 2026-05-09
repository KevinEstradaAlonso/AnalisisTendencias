import { useEffect, useMemo, useState } from 'react'
import { Card, DonutChart, Legend } from '@tremor/react'

interface RadarData {
  tema: string
  total: number
  negativos: number
  positivos: number
  neutrales: number
}

interface Props {
  data: RadarData[]
  onTemaClick: (tema: string) => void
}

export default function RadarGeneral({ data, onTemaClick }: Props) {
  const colors = ['blue', 'teal', 'purple', 'pink', 'red', 'orange', 'yellow', 'green']

  const allTemas = useMemo(() => data.map((d) => d.tema), [data])
  const [disabledTemas, setDisabledTemas] = useState<Set<string>>(() => new Set())
  const [showAllTemas, setShowAllTemas] = useState(false)

  useEffect(() => {
    setDisabledTemas((prev) => {
      if (prev.size === 0) return prev
      const allowed = new Set(allTemas)
      const next = new Set(Array.from(prev).filter((t) => allowed.has(t)))
      return next.size === prev.size ? prev : next
    })
  }, [allTemas])

  const visibleData = useMemo(() => {
    if (disabledTemas.size === 0) return data
    return data.filter((d) => !disabledTemas.has(d.tema))
  }, [data, disabledTemas])

  const chartData = useMemo(
    () =>
      visibleData.map((d) => ({
        name: d.tema,
        value: d.total,
      })),
    [visibleData]
  )

  const toggleTema = (tema: string) => {
    setDisabledTemas((prev) => {
      const next = new Set(prev)
      if (next.has(tema)) next.delete(tema)
      else next.add(tema)
      return next
    })
  }

  const maxTemasCollapsed = 12
  const maxListCollapsed = 8
  const temasForToggles = showAllTemas ? allTemas : allTemas.slice(0, maxTemasCollapsed)
  const listData = showAllTemas ? data : data.slice(0, maxListCollapsed)

  return (
    <Card>
      <div>
        <h3 className="text-lg font-light text-gray-700">Radar de Temas</h3>
        <p className="text-sm text-gray-400 font-light">Distribución de menciones hoy</p>
      </div>
      
      <div className="mt-6">
        {chartData.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-gray-400 font-light">
            Selecciona al menos un tema para ver la gráfica
          </div>
        ) : (
          <DonutChart
            data={chartData}
            category="value"
            index="name"
            colors={colors}
            className="h-52"
            onValueChange={(v) => v && onTemaClick(v.name)}
            showAnimation={true}
          />
        )}

        <div className="mt-4">
          <div className="text-xs text-gray-500 font-light mb-2">Mostrar en gráfica</div>
          <div className="flex flex-wrap gap-2">
            {temasForToggles.map((tema) => {
              const checked = !disabledTemas.has(tema)
              return (
                <label
                  key={tema}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/40 border border-white/40 hover:bg-white/60 transition-colors text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={checked}
                    onChange={() => toggleTema(tema)}
                  />
                  <span className="capitalize">{tema}</span>
                </label>
              )
            })}
          </div>

          {allTemas.length > maxTemasCollapsed && (
            <button
              type="button"
              onClick={() => setShowAllTemas((v) => !v)}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {showAllTemas ? 'Ver menos' : `Ver todos los temas (${allTemas.length})`}
            </button>
          )}
        </div>

        <Legend
          categories={visibleData.map((d) => d.tema)}
          colors={colors}
          className="mt-4 justify-center flex-wrap"
        />
      </div>

      <div className="mt-6 space-y-2">
        {listData.map((tema) => (
          <button
            key={tema.tema}
            onClick={() => onTemaClick(tema.tema)}
            className="w-full p-4 text-left bg-white/40 rounded-xl hover:bg-white/60 transition-all duration-200 border border-white/40 group"
          >
            <div className="flex justify-between items-center gap-3">
              <span className="font-medium text-gray-700 capitalize truncate group-hover:text-indigo-600 transition-colors">
                {tema.tema}
              </span>
              <span className="text-sm text-gray-400 whitespace-nowrap">{tema.total}</span>
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-rose-500/80">{tema.negativos} neg</span>
              <span className="text-emerald-500/80">{tema.positivos} pos</span>
              <span className="text-gray-400">{tema.neutrales} neu</span>
            </div>
          </button>
        ))}

        {!showAllTemas && data.length > maxListCollapsed && (
          <button
            type="button"
            onClick={() => setShowAllTemas(true)}
            className="w-full p-3 text-center bg-white/30 rounded-xl hover:bg-white/50 transition-all duration-200 border border-white/40 text-sm text-gray-600"
          >
            Ver todos los temas
          </button>
        )}
      </div>
    </Card>
  )
}
