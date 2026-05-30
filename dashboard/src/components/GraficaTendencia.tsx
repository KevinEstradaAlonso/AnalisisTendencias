import { Card, BarChart } from '@tremor/react'
import './GraficaTendencia.css'

interface TendenciaData {
  fecha: string
  pctNegativos: number
  pctNeutrales: number
  pctPositivos: number
}

interface Props {
  tema: string
  data: TendenciaData[]
}

export default function GraficaTendencia({ tema, data }: Props) {
  console.log('GraficaTendencia data:', data)
  
  return (
    <Card>
      <div>
        <h3 className="text-lg font-light text-gray-700 capitalize">
          Tendencia: {tema}
        </h3>
        <p className="text-sm text-gray-400 font-light">Distribución de sentimientos (%) - Suma 100% por día</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-64 mt-6 flex items-center justify-center text-gray-400">
          Sin datos disponibles
        </div>
      ) : (
        <div className="grafica-tendencia-tooltip">
          <BarChart
            className="h-80 mt-6"
            data={data}
            index="fecha"
            categories={['pctNegativos', 'pctNeutrales', 'pctPositivos']}
            colors={['rose', 'gray', 'emerald']}
            stack={true}
            showLegend
            showGridLines={false}
            showAnimation={true}
            yAxisWidth={40}
          />
        </div>
      )}
    </Card>
  )
}
