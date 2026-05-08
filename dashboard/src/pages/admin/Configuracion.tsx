import { Card, Text } from '@tremor/react'

export default function Configuracion() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500">Configura las fuentes, temas y alertas de tu municipio</p>
      </div>

      <Card>
        <Text>
          Aquí podrás configurar:
        </Text>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          <li>• Fuentes de datos (Twitter, Facebook, Google Maps)</li>
          <li>• Temas globales y personalizados</li>
          <li>• Umbrales de alertas</li>
          <li>• Proveedor de IA preferido</li>
        </ul>
        <p className="mt-4 text-sm text-gray-500">
          Funcionalidad por implementar en siguiente iteración.
        </p>
      </Card>
    </div>
  )
}
