import { Card, Badge } from '@tremor/react'
import { ExclamationTriangleIcon, FireIcon, ClockIcon } from '@heroicons/react/24/outline'
import type { Alerta } from '../hooks/useFirestore'

interface Props {
  alertas: Alerta[]
  onAlertaClick: (alerta: Alerta) => void
}

const tipoAlertaConfig: Record<string, { icon: typeof FireIcon; color: string; label: string }> = {
  riesgo_viral: { icon: FireIcon, color: 'rose', label: 'Riesgo Viral' },
  problema_cronico: { icon: ClockIcon, color: 'amber', label: 'Problema Crónico' },
  umbral_superado: { icon: ExclamationTriangleIcon, color: 'orange', label: 'Umbral Superado' },
}

export default function AlertasPanel({ alertas, onAlertaClick }: Props) {
  if (alertas.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-medium text-gray-900">Alertas Activas</h3>
        <div className="mt-4 text-center py-8 text-gray-500">
          <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No hay alertas activas</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Alertas Activas</h3>
        <Badge color="rose">{alertas.length}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {alertas.slice(0, 5).map((alerta) => {
          const config = tipoAlertaConfig[alerta.tipoAlerta] ?? tipoAlertaConfig.umbral_superado
          const Icon = config.icon

          return (
            <button
              key={alerta.id}
              onClick={() => onAlertaClick(alerta)}
              className={`w-full p-3 text-left rounded-lg border transition ${
                alerta.leida 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-rose-50 border-rose-200'
              } hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 text-${config.color}-500 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge color={config.color as 'rose' | 'amber' | 'orange'} size="xs">
                      {config.label}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {alerta.fechaGeneracion.toLocaleDateString('es-MX')}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900 capitalize">
                    {alerta.tema}
                    {alerta.colonia && ` - ${alerta.colonia}`}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {alerta.descripcion}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {alertas.length > 5 && (
        <div className="mt-4 text-center">
          <a href="/alertas" className="text-sm text-primary-600 hover:underline">
            Ver todas las alertas ({alertas.length})
          </a>
        </div>
      )}
    </Card>
  )
}
