import { Card, AreaChart } from '@tremor/react'

interface TendenciaData {
  fecha: string
  total: number
  negativos: number
  positivos: number
}

interface Props {
  tema: string
  data: TendenciaData[]
}

export default function GraficaTendencia({ tema, data }: Props) {
  return (
    <Card>
      <div>
        <h3 className="text-lg font-light text-gray-700 capitalize">
          Tendencia: {tema}
        </h3>
        <p className="text-sm text-gray-400 font-light">Últimos 7 días</p>
      </div>

      <AreaChart
        className="h-64 mt-6"
        data={data}
        index="fecha"
        categories={['negativos', 'positivos', 'total']}
        colors={['rose', 'emerald', 'indigo']}
        showLegend
        showGridLines={false}
        curveType="monotone"
        showAnimation={true}
      />
    </Card>
  )
}
