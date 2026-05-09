import { Card } from '@tremor/react'

interface UbicacionData {
  colonia: string
  total: number
  negativos: number
  urgenciaAlta: number
}

interface Props {
  data: UbicacionData[]
}

export default function MapaCalor({ data }: Props) {
  // Ordenar por total de menciones
  const sortedData = [...data].sort((a, b) => b.total - a.total)
  const maxTotal = Math.max(...data.map(d => d.total), 1)

  return (
    <Card>
      <div>
        <h3 className="text-lg font-light text-gray-700">Mapa de Calor</h3>
        <p className="text-sm text-gray-400 font-light">Por zona</p>
      </div>

      <div className="mt-6 space-y-3">
        {sortedData.slice(0, 10).map((zona) => {
          const intensidad = zona.total / maxTotal
          const bgColor = intensidad > 0.7 
            ? 'bg-rose-50/60' 
            : intensidad > 0.4 
            ? 'bg-amber-50/60' 
            : 'bg-white/40'

          return (
            <div
              key={zona.colonia}
              className={`p-4 rounded-xl ${bgColor} border border-white/40 transition-all duration-200 hover:shadow-sm`}
            >
              <div className="flex justify-between items-center gap-3">
                <span className="font-medium text-gray-700 truncate" title={zona.colonia}>
                  {zona.colonia}
                </span>
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  {zona.total}
                </span>
              </div>
              
              {/* Barra de progreso suave */}
              <div className="mt-3 h-1.5 bg-gray-100/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 rounded-full transition-all duration-500"
                  style={{ width: `${intensidad * 100}%` }}
                />
              </div>

              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-rose-500/80">{zona.negativos} neg</span>
                {zona.urgenciaAlta > 0 && (
                  <span className="text-orange-500 font-medium">
                    {zona.urgenciaAlta} urg
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {data.length === 0 && (
        <div className="mt-4 text-center py-8 text-gray-500">
          No hay datos de ubicación disponibles
        </div>
      )}
    </Card>
  )
}
