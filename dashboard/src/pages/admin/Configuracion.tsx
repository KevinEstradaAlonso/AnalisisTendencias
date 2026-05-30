import { useEffect, useMemo, useState } from 'react'
import { Card, Text } from '@tremor/react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'

type TemaPersonalizado = {
  nombre: string
  keywords: string[]
  activo: boolean
}

type FuenteConfig = {
  tipo: string
  url: string
  activa: boolean
}

const SOURCE_TYPE_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: 'twitter', label: 'X / Twitter', hint: 'Perfiles o búsquedas públicas de X.' },
  { value: 'facebook', label: 'Facebook', hint: 'Páginas públicas del municipio o medios locales.' },
  { value: 'google_maps', label: 'Google Maps', hint: 'Lugares y reseñas públicas.' },
]

function splitTokens(input: string) {
  return input
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function uniqueCaseInsensitive(values: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const key = v.trim().toLowerCase()
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v.trim())
  }
  return out
}

function normalizeFuenteTipo(value: string) {
  return value.trim().toLowerCase()
}

function uniqueFuentes(values: FuenteConfig[]) {
  const seen = new Set<string>()
  const out: FuenteConfig[] = []

  for (const fuente of values) {
    const tipo = normalizeFuenteTipo(fuente.tipo)
    const url = fuente.url.trim()
    if (!tipo || !url) continue

    const key = `${tipo}|${url.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ tipo, url, activa: Boolean(fuente.activa) })
  }

  return out
}

function parseTemas(raw: unknown): { globales: string[]; personalizados: TemaPersonalizado[] } {
  const empty = { globales: [] as string[], personalizados: [] as TemaPersonalizado[] }
  if (!raw) return empty

  // Formato legacy: temas: ["agua", "baches", ...]
  if (Array.isArray(raw)) {
    return {
      globales: uniqueCaseInsensitive(raw.map((t) => String(t ?? '')).filter(Boolean)),
      personalizados: [],
    }
  }

  // Formato nuevo: temas: { globales: [...], personalizados: [...] }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const globalesRaw = obj.globales
    const personalizadosRaw = obj.personalizados

    const globales = Array.isArray(globalesRaw)
      ? uniqueCaseInsensitive(globalesRaw.map((t) => String(t ?? '')).filter(Boolean))
      : []

    const personalizados: TemaPersonalizado[] = Array.isArray(personalizadosRaw)
      ? personalizadosRaw
          .map((p): TemaPersonalizado | null => {
            if (!p || typeof p !== 'object') return null
            const po = p as Record<string, unknown>
            const nombre = String(po.nombre ?? '').trim()
            if (!nombre) return null
            const keywords = Array.isArray(po.keywords)
              ? uniqueCaseInsensitive(po.keywords.map((k) => String(k ?? '')).filter(Boolean))
              : []
            const activo = typeof po.activo === 'boolean' ? po.activo : true
            return { nombre, keywords, activo }
          })
          .filter((x): x is TemaPersonalizado => Boolean(x))
      : []

    return { globales, personalizados }
  }

  return empty
}

function parseFuentes(raw: unknown): FuenteConfig[] {
  if (!Array.isArray(raw)) return []

  return uniqueFuentes(
    raw
      .map((item): FuenteConfig | null => {
        if (!item || typeof item !== 'object') return null
        const obj = item as Record<string, unknown>
        const tipo = normalizeFuenteTipo(String(obj.tipo ?? ''))
        const url = String(obj.url ?? '').trim()
        if (!tipo || !url) return null
        const activa = typeof obj.activa === 'boolean' ? obj.activa : true
        return { tipo, url, activa }
      })
      .filter((item): item is FuenteConfig => Boolean(item))
  )
}

export default function Configuracion() {
  const { userData } = useAuth()
  const municipioId = userData?.municipioId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const [fuentes, setFuentes] = useState<FuenteConfig[]>([])
  const [nuevaFuenteTipo, setNuevaFuenteTipo] = useState(SOURCE_TYPE_OPTIONS[0].value)
  const [nuevaFuenteUrl, setNuevaFuenteUrl] = useState('')
  const [nuevaFuenteActiva, setNuevaFuenteActiva] = useState(true)

  const [temasGlobales, setTemasGlobales] = useState<string[]>([])
  const [temasGlobalesInput, setTemasGlobalesInput] = useState('')
  const [candidatos, setCandidatos] = useState<string[]>([])

  const [personalizados, setPersonalizados] = useState<TemaPersonalizado[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoKeywords, setNuevoKeywords] = useState('')
  const [nuevoActivo, setNuevoActivo] = useState(true)

  const hasMunicipio = Boolean(municipioId)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setError('')
      setSuccess('')
      if (!municipioId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const snap = await getDoc(doc(db, 'municipios', municipioId))
        const data = snap.exists() ? snap.data() : {}
        const fuentes = parseFuentes((data as any)?.fuentes)
        const temas = parseTemas((data as any)?.temas)
        const candidatosRaw = (data as any)?.temas?.candidatos
        const candidatosIniciales = Array.isArray(candidatosRaw)
          ? uniqueCaseInsensitive(candidatosRaw.map((t: unknown) => String(t ?? '')).filter(Boolean))
          : []
        if (cancelled) return
        setFuentes(fuentes)
        setTemasGlobales(temas.globales)
        setPersonalizados(temas.personalizados)
        setCandidatos(candidatosIniciales)
      } catch (e) {
        if (cancelled) return
        setError('No se pudo cargar la configuración de temas.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [municipioId])

  const temasGlobalesNormalized = useMemo(() => uniqueCaseInsensitive(temasGlobales), [temasGlobales])
  const fuentesNormalizadas = useMemo(() => uniqueFuentes(fuentes), [fuentes])

  const addFuente = () => {
    setSuccess('')

    const tipo = normalizeFuenteTipo(nuevaFuenteTipo)
    const url = nuevaFuenteUrl.trim()
    if (!tipo || !url) return

    const next = uniqueFuentes([
      { tipo, url, activa: nuevaFuenteActiva },
      ...fuentes,
    ])

    setFuentes(next)
    setNuevaFuenteUrl('')
    setNuevaFuenteActiva(true)
  }

  const removeFuente = (tipo: string, url: string) => {
    setSuccess('')
    const targetTipo = normalizeFuenteTipo(tipo)
    const targetUrl = url.trim().toLowerCase()

    setFuentes((prev) =>
      prev.filter(
        (fuente) =>
          !(normalizeFuenteTipo(fuente.tipo) === targetTipo && fuente.url.trim().toLowerCase() === targetUrl)
      )
    )
  }

  const toggleFuente = (tipo: string, url: string) => {
    setSuccess('')
    const targetTipo = normalizeFuenteTipo(tipo)
    const targetUrl = url.trim().toLowerCase()

    setFuentes((prev) =>
      prev.map((fuente) => {
        const matches =
          normalizeFuenteTipo(fuente.tipo) === targetTipo && fuente.url.trim().toLowerCase() === targetUrl

        return matches ? { ...fuente, activa: !fuente.activa } : fuente
      })
    )
  }

  const addGlobales = () => {
    setSuccess('')
    const tokens = splitTokens(temasGlobalesInput)
    if (tokens.length === 0) return
    const next = uniqueCaseInsensitive([...temasGlobales, ...tokens])
    setTemasGlobales(next)
    setTemasGlobalesInput('')
  }

  const removeGlobal = (tema: string) => {
    setSuccess('')
    const key = tema.trim().toLowerCase()
    setTemasGlobales((prev) => prev.filter((t) => t.trim().toLowerCase() !== key))
    // Si era candidato, también lo quitamos de candidatos
    setCandidatos((prev) => prev.filter((c) => c.trim().toLowerCase() !== key))
  }

  const toggleCandidato = (tema: string) => {
    setSuccess('')
    const key = tema.trim().toLowerCase()
    setCandidatos((prev) => {
      const exists = prev.some((c) => c.trim().toLowerCase() === key)
      if (exists) return prev.filter((c) => c.trim().toLowerCase() !== key)
      return [...prev, tema.trim()]
    })
  }

  const addPersonalizado = () => {
    setSuccess('')
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    const keywords = uniqueCaseInsensitive(splitTokens(nuevoKeywords))
    const exists = personalizados.some((p) => p.nombre.trim().toLowerCase() === nombre.toLowerCase())
    if (exists) return
    setPersonalizados((prev) => [{ nombre, keywords, activo: nuevoActivo }, ...prev])
    setNuevoNombre('')
    setNuevoKeywords('')
    setNuevoActivo(true)
  }

  const removePersonalizado = (nombre: string) => {
    setSuccess('')
    const key = nombre.trim().toLowerCase()
    setPersonalizados((prev) => prev.filter((p) => p.nombre.trim().toLowerCase() !== key))
  }

  const togglePersonalizado = (nombre: string) => {
    setSuccess('')
    const key = nombre.trim().toLowerCase()
    setPersonalizados((prev) =>
      prev.map((p) => (p.nombre.trim().toLowerCase() === key ? { ...p, activo: !p.activo } : p))
    )
  }

  const save = async () => {
    setError('')
    setSuccess('')
    if (!municipioId) return

    setSaving(true)
    try {
      const payload = {
        fuentes: fuentesNormalizadas.map((fuente) => ({
          tipo: normalizeFuenteTipo(fuente.tipo),
          url: fuente.url.trim(),
          activa: Boolean(fuente.activa),
        })),
        temas: {
          globales: temasGlobalesNormalized,
          personalizados: personalizados.map((p) => ({
            nombre: p.nombre.trim(),
            keywords: uniqueCaseInsensitive(p.keywords),
            activo: Boolean(p.activo),
          })),
          candidatos: uniqueCaseInsensitive(candidatos),
        },
      }

      await setDoc(doc(db, 'municipios', municipioId), payload, { merge: true })
      setSuccess('Configuración guardada correctamente.')
    } catch (e) {
      setError('No se pudo guardar la configuración. Verifica permisos y vuelve a intentar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500">Configura los temas que usa la clasificación</p>
      </div>

      {!hasMunicipio && (
        <Card>
          <div className="text-sm text-gray-500">
            No se encontró un municipio asignado a tu usuario.
          </div>
        </Card>
      )}

      {hasMunicipio && (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-light text-gray-700">Temas</h2>
              <p className="text-sm text-gray-400 font-light">
                Se guardan en Firestore: <span className="font-mono text-xs">municipios/{municipioId}/temas</span>
              </p>
            </div>

            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="glass-button text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 text-sm text-rose-600 bg-rose-50/60 rounded-xl border border-rose-100">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 p-4 text-sm text-emerald-700 bg-emerald-50/60 rounded-xl border border-emerald-100">
              {success}
            </div>
          )}

          {loading ? (
            <div className="mt-8 flex items-center justify-center">
              <div className="glass-spinner w-10 h-10 animate-spin"></div>
            </div>
          ) : (
            <div className="mt-6 space-y-8">
              <div>
                <Text className="text-gray-600">Orígenes de redes sociales</Text>
                <p className="text-xs text-gray-400 mt-1">
                  Configura los perfiles, páginas o lugares que el worker debe scrapear para este municipio.
                </p>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px,1fr,auto] gap-3 items-start">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Tipo de fuente</label>
                    <select
                      value={nuevaFuenteTipo}
                      onChange={(e) => setNuevaFuenteTipo(e.target.value)}
                      className="block w-full px-4 py-3 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all text-gray-700"
                    >
                      {SOURCE_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-gray-400">
                      {SOURCE_TYPE_OPTIONS.find((option) => option.value === nuevaFuenteTipo)?.hint}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">URL o origen público</label>
                    <input
                      value={nuevaFuenteUrl}
                      onChange={(e) => setNuevaFuenteUrl(e.target.value)}
                      placeholder="https://x.com/municipio o https://www.facebook.com/..."
                      className="block w-full px-4 py-3 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  </div>

                  <div className="flex flex-col gap-3 lg:pt-7">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={nuevaFuenteActiva}
                        onChange={(e) => setNuevaFuenteActiva(e.target.checked)}
                      />
                      Activa
                    </label>
                    <button type="button" onClick={addFuente} className="glass-button text-sm text-gray-700">
                      Agregar
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {fuentesNormalizadas.length === 0 && (
                    <div className="text-sm text-gray-400">Aún no hay orígenes configurados.</div>
                  )}
                  {fuentesNormalizadas.map((fuente) => {
                    const option = SOURCE_TYPE_OPTIONS.find((item) => item.value === fuente.tipo)

                    return (
                      <div
                        key={`${fuente.tipo}-${fuente.url}`}
                        className="p-4 bg-white/40 rounded-xl border border-white/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-700">{option?.label ?? fuente.tipo}</div>
                            <div className="text-xs text-gray-400 mt-1 break-all">{fuente.url}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={fuente.activa}
                                onChange={() => toggleFuente(fuente.tipo, fuente.url)}
                              />
                              {fuente.activa ? 'Activa' : 'Pausada'}
                            </label>
                            <button
                              type="button"
                              onClick={() => removeFuente(fuente.tipo, fuente.url)}
                              className="text-sm text-gray-500 hover:text-rose-700 transition-colors"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-white/40 pt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Text className="text-gray-600">Temas globales</Text>
                  <p className="text-xs text-gray-400 mt-1">
                    Son los temas disponibles para clasificar. Puedes pegar varios separados por coma o salto de línea.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={temasGlobalesInput}
                      onChange={(e) => setTemasGlobalesInput(e.target.value)}
                      placeholder="agua, baches, seguridad_publica"
                      className="flex-1 px-4 py-3 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={addGlobales}
                      className="glass-button text-sm text-gray-700"
                    >
                      Agregar
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {temasGlobalesNormalized.map((t) => {
                      const esCandidato = candidatos.some((c) => c.trim().toLowerCase() === t.trim().toLowerCase())
                      return (
                        <div
                          key={t}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/40 border border-white/40 text-sm text-gray-700 group"
                        >
                          <span className="capitalize">{t}</span>
                          <button
                            type="button"
                            onClick={() => toggleCandidato(t)}
                            title={esCandidato ? 'Quitar de candidatos' : 'Marcar como candidato/a'}
                            className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all ${
                              esCandidato
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-gray-100/50 text-gray-400 border border-transparent opacity-0 group-hover:opacity-100 hover:bg-indigo-50 hover:text-indigo-500'
                            }`}
                          >
                            {esCandidato ? '🗳 Candidato' : 'Candidato'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGlobal(t)}
                            title="Quitar tema"
                            className="text-gray-400 hover:text-rose-600 transition-colors ml-1"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                    {temasGlobalesNormalized.length === 0 && (
                      <div className="text-sm text-gray-400">Aún no hay temas globales.</div>
                    )}
                  </div>
                </div>

                <div>
                  <Text className="text-gray-600">Temas personalizados</Text>
                  <p className="text-xs text-gray-400 mt-1">
                    Útiles para temas locales con palabras clave. Se pueden activar/desactivar.
                  </p>

                  <div className="mt-4 space-y-2">
                    <input
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Nombre (ej. feria_del_pueblo)"
                      className="block w-full px-4 py-3 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                    <input
                      value={nuevoKeywords}
                      onChange={(e) => setNuevoKeywords(e.target.value)}
                      placeholder="Keywords (coma o salto de línea)"
                      className="block w-full px-4 py-3 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={nuevoActivo}
                          onChange={(e) => setNuevoActivo(e.target.checked)}
                        />
                        Activo
                      </label>
                      <button type="button" onClick={addPersonalizado} className="glass-button text-sm text-gray-700">
                        Agregar
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {personalizados.length === 0 && (
                      <div className="text-sm text-gray-400">Aún no hay temas personalizados.</div>
                    )}
                    {personalizados.map((p) => (
                      <div
                        key={p.nombre}
                        className="p-4 bg-white/40 rounded-xl border border-white/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-700 capitalize truncate" title={p.nombre}>
                              {p.nombre}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {p.keywords.length > 0 ? p.keywords.join(', ') : 'Sin keywords'}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={p.activo}
                                onChange={() => togglePersonalizado(p.nombre)}
                              />
                              {p.activo ? 'Activo' : 'Apagado'}
                            </label>
                            <button
                              type="button"
                              onClick={() => removePersonalizado(p.nombre)}
                              className="text-sm text-gray-500 hover:text-rose-700 transition-colors"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
