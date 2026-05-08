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
  const chartData = data.map(d => ({
    name: d.tema,
    value: d.total,
  }))

  const colors = ['blue', 'cyan', 'indigo', 'violet', 'fuchsia', 'rose', 'amber', 'emerald']

  return (
    <Card>
      <h3 className="text-lg font-medium text-gray-900">Radar de Temas</h3>
      <p className="text-sm text-gray-500">Distribución de menciones por tema hoy</p>
      
      <div className="mt-6">
        <DonutChart
          data={chartData}
          category="value"
          index="name"
          colors={colors}
          className="h-60"
          onValueChange={(v) => v && onTemaClick(v.name)}
        />
        <Legend
          categories={data.map(d => d.tema)}
          colors={colors}
          className="mt-4 justify-center"
        />
      </div>

      <div className="mt-6 space-y-2">
        {data.map((tema) => (
          <button
            key={tema.tema}
            onClick={() => onTemaClick(tema.tema)}
            className="w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 capitalize">{tema.tema}</span>
              <span className="text-sm text-gray-500">{tema.total} menciones</span>
            </div>
            <div className="flex gap-4 mt-1 text-xs">
              <span className="text-red-600">{tema.negativos} negativos</span>
              <span className="text-green-600">{tema.positivos} positivos</span>
              <span className="text-gray-500">{tema.neutrales} neutrales</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}
