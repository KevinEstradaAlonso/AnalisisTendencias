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
      <h3 className="text-lg font-medium text-gray-900">Mapa de Calor por Zona</h3>
      <p className="text-sm text-gray-500">Concentración de menciones por colonia</p>

      <div className="mt-6 space-y-2">
        {sortedData.slice(0, 10).map((zona) => {
          const intensidad = zona.total / maxTotal
          const bgColor = intensidad > 0.7 
            ? 'bg-red-100' 
            : intensidad > 0.4 
            ? 'bg-orange-100' 
            : 'bg-yellow-50'

          return (
            <div
              key={zona.colonia}
              className={`p-3 rounded-lg ${bgColor} transition hover:shadow-md`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">{zona.colonia}</span>
                <span className="text-sm font-semibold text-gray-700">
                  {zona.total} menciones
                </span>
              </div>
              
              {/* Barra de progreso */}
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-full transition-all"
                  style={{ width: `${intensidad * 100}%` }}
                />
              </div>

              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                <span>{zona.negativos} negativos</span>
                {zona.urgenciaAlta > 0 && (
                  <span className="text-red-600 font-medium">
                    {zona.urgenciaAlta} urgentes
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
