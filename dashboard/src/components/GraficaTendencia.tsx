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
      <h3 className="text-lg font-medium text-gray-900 capitalize">
        Tendencia: {tema}
      </h3>
      <p className="text-sm text-gray-500">Últimos 7 días</p>

      <AreaChart
        className="h-72 mt-4"
        data={data}
        index="fecha"
        categories={['negativos', 'positivos', 'total']}
        colors={['rose', 'emerald', 'blue']}
        showLegend
        showGridLines={false}
      />
    </Card>
  )
}
