import { Card, Badge, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Button } from '@tremor/react'
import { CheckIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useAlertas } from '../hooks/useFirestore'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'

export default function Alertas() {
  const { alertas, loading } = useAlertas()
  const { userData } = useAuth()

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
        <p className="text-gray-500">{alertas.length} alertas activas</p>
      </div>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Fecha</TableHeaderCell>
              <TableHeaderCell>Tema</TableHeaderCell>
              <TableHeaderCell>Ubicación</TableHeaderCell>
              <TableHeaderCell>Descripción</TableHeaderCell>
              <TableHeaderCell>Estado</TableHeaderCell>
              <TableHeaderCell>Acciones</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alertas.map((alerta) => (
              <TableRow key={alerta.id} className={!alerta.leida ? 'bg-rose-50' : ''}>
                <TableCell>
                  <Badge color={tipoAlertaColor[alerta.tipoAlerta as keyof typeof tipoAlertaColor] ?? 'gray'}>
                    {alerta.tipoAlerta.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {alerta.fechaGeneracion.toLocaleDateString('es-MX', { 
                    day: '2-digit', 
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </TableCell>
                <TableCell className="capitalize font-medium">
                  {alerta.tema}
                </TableCell>
                <TableCell>
                  {alerta.colonia ?? 'General'}
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="truncate" title={alerta.descripcion}>
                    {alerta.descripcion}
                  </p>
                </TableCell>
                <TableCell>
                  {alerta.leida ? (
                    <Badge color="gray">Leída</Badge>
                  ) : (
                    <Badge color="blue">Nueva</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {!alerta.leida && (
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={EyeIcon}
                        onClick={() => marcarLeida(alerta.id)}
                      >
                        Marcar leída
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="primary"
                      icon={CheckIcon}
                      onClick={() => resolverAlerta(alerta.id)}
                    >
                      Resolver
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {alertas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay alertas activas
          </div>
        )}
      </Card>
    </div>
  )
}
