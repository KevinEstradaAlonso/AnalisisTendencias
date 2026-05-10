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

export default function Configuracion() {
  const { userData } = useAuth()
  const municipioId = userData?.municipioId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const [temasGlobales, setTemasGlobales] = useState<string[]>([])
  const [temasGlobalesInput, setTemasGlobalesInput] = useState('')

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
        const temas = parseTemas((data as any)?.temas)
        if (cancelled) return
        setTemasGlobales(temas.globales)
        setPersonalizados(temas.personalizados)
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
        temas: {
          globales: temasGlobalesNormalized,
          personalizados: personalizados.map((p) => ({
            nombre: p.nombre.trim(),
            keywords: uniqueCaseInsensitive(p.keywords),
            activo: Boolean(p.activo),
          })),
        },
      }

      await setDoc(doc(db, 'municipios', municipioId), payload, { merge: true })
      setSuccess('Temas guardados correctamente.')
    } catch (e) {
      setError('No se pudieron guardar los temas. Verifica permisos y vuelve a intentar.')
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
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  {temasGlobalesNormalized.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => removeGlobal(t)}
                      title="Quitar"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/40 border border-white/40 hover:bg-white/60 transition-colors text-sm text-gray-700"
                    >
                      <span className="capitalize">{t}</span>
                      <span className="text-gray-400">×</span>
                    </button>
                  ))}
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
          )}
        </Card>
      )}
    </div>
  )
}
