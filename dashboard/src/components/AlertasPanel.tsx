import { Card } from '@tremor/react'
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

const pillBase =
  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap backdrop-blur-sm'

const pillByColor: Record<'rose' | 'amber' | 'orange', string> = {
  rose: `${pillBase} bg-rose-50/60 text-rose-700 border-rose-200/50`,
  amber: `${pillBase} bg-amber-50/60 text-amber-700 border-amber-200/50`,
  orange: `${pillBase} bg-orange-50/60 text-orange-700 border-orange-200/50`,
}

const iconWrapByColor: Record<'rose' | 'amber' | 'orange', string> = {
  rose: 'p-2 rounded-lg bg-rose-100/50',
  amber: 'p-2 rounded-lg bg-amber-100/50',
  orange: 'p-2 rounded-lg bg-orange-100/50',
}

const iconByColor: Record<'rose' | 'amber' | 'orange', string> = {
  rose: 'w-4 h-4 text-rose-500',
  amber: 'w-4 h-4 text-amber-500',
  orange: 'w-4 h-4 text-orange-500',
}

export default function AlertasPanel({ alertas, onAlertaClick }: Props) {
  if (alertas.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-light text-gray-700">Alertas Activas</h3>
        <div className="mt-6 text-center py-10 text-gray-400">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100/50 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-light">Sin alertas activas</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-light text-gray-700">Alertas Activas</h3>
        <span className={pillByColor.rose}>{alertas.length}</span>
      </div>

      <div className="mt-5 space-y-3">
        {alertas.slice(0, 5).map((alerta) => {
          const config = tipoAlertaConfig[alerta.tipoAlerta] ?? tipoAlertaConfig.umbral_superado
          const Icon = config.icon
          const colorKey = (config.color as 'rose' | 'amber' | 'orange')

          return (
            <button
              key={alerta.id}
              onClick={() => onAlertaClick(alerta)}
              className={`w-full p-4 text-left rounded-xl transition-all duration-200 ${
                alerta.leida 
                  ? 'bg-white/40 hover:bg-white/60' 
                  : 'bg-rose-50/60 hover:bg-rose-50/80'
              } border border-white/40 hover:shadow-sm`}
            >
              <div className="flex items-start gap-3">
                <div className={iconWrapByColor[colorKey]}>
                  <Icon className={iconByColor[colorKey]} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={pillByColor[colorKey]}>{config.label}</span>
                    <span className="text-xs text-gray-400">
                      {alerta.fechaGeneracion.toLocaleDateString('es-MX')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-gray-700 capitalize truncate">
                    {alerta.tema}
                    {alerta.colonia && ` · ${alerta.colonia}`}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-1">
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
