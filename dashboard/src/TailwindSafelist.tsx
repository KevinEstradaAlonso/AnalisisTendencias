export default function TailwindSafelist() {
  // Tailwind v4 + Tremor: Tremor construye clases dinámicas (fill-${color}-500).
  // Si Tailwind no las detecta estáticamente, los SVG quedan con fill por defecto (negro).
  // Este componente fuerza la generación de utilidades sin afectar el UI.
  return (
    <div className="hidden" aria-hidden>
      <div
        className={
          [
            // fills usados por DonutChart (palette background = 500)
            'fill-blue-500 fill-teal-500 fill-purple-500 fill-pink-500 fill-red-500 fill-orange-500 fill-yellow-500 fill-green-500',
            'dark:fill-blue-500 dark:fill-teal-500 dark:fill-purple-500 dark:fill-pink-500 dark:fill-red-500 dark:fill-orange-500 dark:fill-yellow-500 dark:fill-green-500',

            // legend dots / badges suelen usar bg/text también
            'bg-blue-500 bg-teal-500 bg-purple-500 bg-pink-500 bg-red-500 bg-orange-500 bg-yellow-500 bg-green-500',
            'text-blue-500 text-teal-500 text-purple-500 text-pink-500 text-red-500 text-orange-500 text-yellow-500 text-green-500',
            'stroke-blue-500 stroke-teal-500 stroke-purple-500 stroke-pink-500 stroke-red-500 stroke-orange-500 stroke-yellow-500 stroke-green-500',

            // Tremor tokens usados en charts
            'fill-tremor-content fill-tremor-content-emphasis stroke-tremor-border stroke-tremor-background',
            'dark:fill-dark-tremor-content dark:fill-dark-tremor-content-emphasis dark:stroke-dark-tremor-border dark:stroke-dark-tremor-background',
          ].join(' ')
        }
      />
    </div>
  )
}
