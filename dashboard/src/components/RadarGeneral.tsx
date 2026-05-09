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

  return (
    <Card>
      <div>
        <h3 className="text-lg font-light text-gray-700">Radar de Temas</h3>
        <p className="text-sm text-gray-400 font-light">Distribución de menciones hoy</p>
      </div>
      
      <div className="mt-6">
        <DonutChart
          data={chartData}
          category="value"
          index="name"
          colors={['blue', 'teal', 'purple', 'pink', 'red', 'orange', 'yellow', 'green']}
          className="h-52"
          onValueChange={(v) => v && onTemaClick(v.name)}
          showAnimation={true}
        />
        <Legend
          categories={data.map(d => d.tema)}
          colors={['blue', 'teal', 'purple', 'pink', 'red', 'orange', 'yellow', 'green']}
          className="mt-4 justify-center flex-wrap"
        />
      </div>

      <div className="mt-6 space-y-2">
        {data.map((tema) => (
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
      </div>
    </Card>
  )
}
