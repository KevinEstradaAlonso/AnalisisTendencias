import { Card, Text } from '@tremor/react'

export default function Usuarios() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <p className="text-gray-500">Administra los usuarios de tu municipio</p>
      </div>

      <Card>
        <Text>
          Aquí podrás gestionar los usuarios de tu municipio: crear, editar y desactivar cuentas.
        </Text>
        <p className="mt-4 text-sm text-gray-500">
          Funcionalidad por implementar en siguiente iteración.
        </p>
      </Card>
    </div>
  )
}
