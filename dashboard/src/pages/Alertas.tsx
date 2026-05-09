import { useState } from 'react'
import { Card, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react'
import { CheckIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useAlertas } from '../hooks/useFirestore'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'

export default function Alertas() {
  const { alertas, loading } = useAlertas()
  const { userData } = useAuth()
  const [expandedAlerta, setExpandedAlerta] = useState<string | null>(null)

  const pillBase =
    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap backdrop-blur-sm'

  const tipoPill: Record<string, string> = {
    riesgo_viral: `${pillBase} bg-rose-50/60 text-rose-700 border-rose-200/50`,
    problema_cronico: `${pillBase} bg-amber-50/60 text-amber-700 border-amber-200/50`,
    umbral_superado: `${pillBase} bg-orange-50/60 text-orange-700 border-orange-200/50`,
  }

  const estadoPill: Record<string, string> = {
    nueva: `${pillBase} bg-blue-50/60 text-blue-700 border-blue-200/50`,
    leida: `${pillBase} bg-gray-50/60 text-gray-700 border-gray-200/50`,
  }

  const formatTipo = (value: string) => value.replaceAll('_', ' ')

  const marcarLeida = async (alertaId: string) => {
    if (!userData?.municipioId) return
    await updateDoc(doc(db, 'municipios', userData.municipioId, 'alertas', alertaId), {
      leida: true
    })
  }

  const resolverAlerta = async (alertaId: string) => {
    if (!userData?.municipioId) return
    await updateDoc(doc(db, 'municipios', userData.municipioId, 'alertas', alertaId), {
      resuelta: true,
      fecha_resolucion: new Date()
    })
  }

  const tipoAlertaColor = {
    riesgo_viral: 'rose',
    problema_cronico: 'amber',
    umbral_superado: 'orange',
  } as const

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-spinner w-12 h-12 animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-light text-gray-800 tracking-tight">Alertas</h1>
          <p className="text-gray-500 font-light">{alertas.length} alertas activas</p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Tipo</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Fecha</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-44">Tema</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Ubicación</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-[520px]">Descripción</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Estado</TableHeaderCell>
                <TableHeaderCell className="text-xs font-medium text-gray-500 uppercase tracking-wider w-44">Acciones</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alertas.map((alerta) => (
                <TableRow key={alerta.id} className={`transition-colors ${!alerta.leida ? 'bg-rose-50/40' : 'hover:bg-white/40'}`}>
                  <TableCell className="align-top">
                    <span
                      className={
                        tipoPill[alerta.tipoAlerta] ??
                        `${pillBase} bg-gray-50/60 text-gray-700 border-gray-200/50`
                      }
                      title={formatTipo(alerta.tipoAlerta)}
                    >
                      {formatTipo(alerta.tipoAlerta)}
                    </span>
                  </TableCell>
                  <TableCell className="align-top text-sm text-gray-600 whitespace-nowrap">
                    {alerta.fechaGeneracion.toLocaleDateString('es-MX', { 
                      day: '2-digit', 
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="align-top capitalize font-medium text-gray-700">
                    {alerta.tema}
                  </TableCell>
                  <TableCell className="align-top text-sm text-gray-600">
                    <span className="truncate block max-w-[100px]" title={alerta.colonia ?? 'General'}>
                      {alerta.colonia ?? 'General'}
                    </span>
                  </TableCell>
                  <TableCell className="align-top w-[520px]">
                    <div 
                      className={`text-sm text-gray-600 cursor-pointer break-words whitespace-normal ${expandedAlerta === alerta.id ? '' : 'line-clamp-2'}`}
                      onClick={() => setExpandedAlerta(expandedAlerta === alerta.id ? null : alerta.id)}
                    >
                      {alerta.descripcion}
                    </div>
                    {alerta.descripcion.length > 50 && (
                      <button 
                        className="text-xs text-indigo-500 hover:text-indigo-700 mt-1 font-medium"
                        onClick={() => setExpandedAlerta(expandedAlerta === alerta.id ? null : alerta.id)}
                      >
                        {expandedAlerta === alerta.id ? 'Menos' : 'Más'}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {alerta.leida ? (
                      <span className={estadoPill.leida}>Leída</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className={estadoPill.nueva}>Nueva</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex gap-2">
                    {!alerta.leida && (
                      <button
                        className="glass-button px-3 py-1.5 text-xs text-gray-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                        onClick={() => marcarLeida(alerta.id)}
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        Leída
                      </button>
                    )}
                    <button
                      className="glass-button px-3 py-1.5 text-xs bg-indigo-50/60 text-indigo-600 hover:bg-indigo-100/60 flex items-center gap-1.5 transition-colors"
                      onClick={() => resolverAlerta(alerta.id)}
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                      Resolver
                    </button>
                  </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        </div>

        {alertas.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100/50 flex items-center justify-center">
              <CheckIcon className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-light">Sin alertas activas</p>
          </div>
        )}
      </Card>
    </div>
  )
}
