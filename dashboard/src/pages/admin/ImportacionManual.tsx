import { useMemo, useState } from 'react'
import { Card, Text } from '@tremor/react'
import { Timestamp, doc, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'

type JsonPostInput = {
  id?: string
  fuente: string
  urlOrigen: string
  texto: string
  fecha: string
  resumen?: string
  clasificacion?: {
    temas?: string[]
    temaPrincipal?: string
    sentimiento?: string
    urgencia?: string
    tipoInteraccion?: string
    tono?: string
    confianza?: number
    keywordsDetectadas?: string[]
  }
  ubicacion?: {
    colonia?: string | null
    calle?: string | null
    referencia?: string | null
    precision?: string
  }
  contexto?: {
    tiempoProblema?: string
    afectacionEstimada?: string
    solicitaAccion?: boolean
    mencionaAutoridad?: string[]
    evidenciaMencionada?: boolean
  }
}

type JsonAlertaInput = {
  id?: string
  tema: string
  colonia?: string | null
  fechaGeneracion: string
  tipoAlerta: string
  descripcion: string
  totalPosts?: number
  cambioPorcentaje?: number
  postsEnojados?: number
  postsDesesperados?: number
  urlOrigen?: string | null
  leida?: boolean
  resuelta?: boolean
  postsRelacionados?: string[]
}

type TemplatePayload = {
  municipioId?: string
  posts: JsonPostInput[]
  alertas: JsonAlertaInput[]
}

type ImportedPost = {
  id: string
  data: Record<string, unknown>
}

type ImportedAlerta = {
  id: string
  data: Record<string, unknown>
}

type PreviewPayload = {
  municipioId: string
  posts: ImportedPost[]
  alertas: ImportedAlerta[]
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function toIsoDate(value: unknown) {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item ?? '').trim()).filter(Boolean) : []
}

function normalizePost(post: JsonPostInput, index: number): ImportedPost {
  const id = post.id?.trim() || `manual-post-${index + 1}-${Date.now()}`
  const fecha = toIsoDate(post.fecha)
  if (!fecha) {
    throw new Error(`El post ${index + 1} tiene una fecha inválida.`)
  }

  return {
    id,
    data: {
      fuente: post.fuente.trim(),
      url_origen: post.urlOrigen.trim(),
      texto: post.texto.trim(),
      fecha: Timestamp.fromDate(fecha),
      resumen: (post.resumen ?? '').trim(),
      clasificacion: {
        temas: normalizeStringArray(post.clasificacion?.temas),
        tema_principal: String(post.clasificacion?.temaPrincipal ?? 'otro').trim() || 'otro',
        sentimiento: String(post.clasificacion?.sentimiento ?? 'neutral').trim() || 'neutral',
        urgencia: String(post.clasificacion?.urgencia ?? 'baja').trim() || 'baja',
        tipo_interaccion: String(post.clasificacion?.tipoInteraccion ?? 'queja').trim() || 'queja',
        tono: String(post.clasificacion?.tono ?? 'neutral').trim() || 'neutral',
        confianza: typeof post.clasificacion?.confianza === 'number' ? post.clasificacion.confianza : 0.5,
        keywords_detectadas: normalizeStringArray(post.clasificacion?.keywordsDetectadas),
      },
      ubicacion: {
        colonia: post.ubicacion?.colonia ?? null,
        calle: post.ubicacion?.calle ?? null,
        referencia: post.ubicacion?.referencia ?? null,
        precision: String(post.ubicacion?.precision ?? 'no_detectada').trim() || 'no_detectada',
      },
      contexto: {
        tiempo_problema: String(post.contexto?.tiempoProblema ?? 'no_aplica').trim() || 'no_aplica',
        afectacion_estimada: String(post.contexto?.afectacionEstimada ?? 'no_especificada').trim() || 'no_especificada',
        solicita_accion: Boolean(post.contexto?.solicitaAccion),
        menciona_autoridad: normalizeStringArray(post.contexto?.mencionaAutoridad),
        evidencia_mencionada: Boolean(post.contexto?.evidenciaMencionada),
      },
    },
  }
}

function normalizeAlerta(alerta: JsonAlertaInput, index: number): ImportedAlerta {
  const id = alerta.id?.trim() || `manual-alerta-${index + 1}-${Date.now()}`
  const fecha = toIsoDate(alerta.fechaGeneracion)
  if (!fecha) {
    throw new Error(`La alerta ${index + 1} tiene una fecha inválida.`)
  }

  return {
    id,
    data: {
      tema: alerta.tema.trim(),
      colonia: alerta.colonia ?? null,
      fecha_generacion: Timestamp.fromDate(fecha),
      tipo_alerta: alerta.tipoAlerta.trim(),
      descripcion: alerta.descripcion.trim(),
      total_posts: Number.isFinite(alerta.totalPosts) ? alerta.totalPosts : 0,
      cambio_porcentaje: Number.isFinite(alerta.cambioPorcentaje) ? alerta.cambioPorcentaje : 0,
      posts_enojados: Number.isFinite(alerta.postsEnojados) ? alerta.postsEnojados : 0,
      posts_desesperados: Number.isFinite(alerta.postsDesesperados) ? alerta.postsDesesperados : 0,
      url_origen: (alerta.urlOrigen ?? null) || null,
      leida: Boolean(alerta.leida),
      resuelta: Boolean(alerta.resuelta),
      posts_relacionados: normalizeStringArray(alerta.postsRelacionados),
    },
  }
}

function buildTemplate(): TemplatePayload {
  const today = new Date()
  const isoDate = today.toISOString()

  return {
    municipioId: 'municipio-demo',
    posts: [
      {
        id: 'post-demo-1',
        fuente: 'twitter',
        urlOrigen: 'https://x.com/usuario/status/1234567890',
        texto: 'Ejemplo de texto del post original.',
        fecha: isoDate,
        resumen: 'Resumen breve del post.',
        clasificacion: {
          temas: ['agua', 'servicios'],
          temaPrincipal: 'agua',
          sentimiento: 'negativo',
          urgencia: 'alta',
          tipoInteraccion: 'queja',
          tono: 'enojado',
          confianza: 0.92,
          keywordsDetectadas: ['falta', 'agua'],
        },
        ubicacion: {
          colonia: 'Centro',
          calle: 'Av. Principal',
          referencia: 'Frente al parque',
          precision: 'alta',
        },
        contexto: {
          tiempoProblema: 'dias',
          afectacionEstimada: 'alta',
          solicitaAccion: true,
          mencionaAutoridad: ['ayuntamiento'],
          evidenciaMencionada: false,
        },
      },
    ],
    alertas: [
      {
        id: 'alerta-demo-1',
        tema: 'agua',
        colonia: 'Centro',
        fechaGeneracion: isoDate,
        tipoAlerta: 'riesgo_viral',
        descripcion: 'Ejemplo de alerta generada a partir de un post manual.',
        totalPosts: 1,
        cambioPorcentaje: 0,
        postsEnojados: 1,
        postsDesesperados: 0,
        urlOrigen: 'https://x.com/usuario/status/1234567890',
        leida: false,
        resuelta: false,
        postsRelacionados: ['post-demo-1'],
      },
    ],
  }
}

export default function ImportacionManual() {
  const { userData } = useAuth()
  const [rawJson, setRawJson] = useState(JSON.stringify(buildTemplate(), null, 2))
  const [preview, setPreview] = useState<PreviewPayload | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)

  const template = useMemo(() => buildTemplate(), [])

  const processJson = () => {
    setError('')
    setSuccess('')

    try {
      const parsed = JSON.parse(rawJson) as Partial<TemplatePayload> | TemplatePayload[]
      const payload = Array.isArray(parsed)
        ? { municipioId: userData?.municipioId ?? '', posts: parsed as JsonPostInput[], alertas: [] }
        : parsed

      const municipioId = String(payload.municipioId ?? userData?.municipioId ?? '').trim()
      if (!municipioId) {
        throw new Error('El JSON debe incluir municipioId o debes tener uno asignado en tu sesión.')
      }

      const posts = Array.isArray(payload.posts) ? payload.posts : []
      const alertas = Array.isArray(payload.alertas) ? payload.alertas : []

      const normalizedPosts = posts.map((post, index) => normalizePost(post, index))
      const normalizedAlertas = alertas.map((alerta, index) => normalizeAlerta(alerta, index))

      setPreview({ municipioId, posts: normalizedPosts, alertas: normalizedAlertas })
      setSuccess(`JSON procesado correctamente: ${normalizedPosts.length} posts y ${normalizedAlertas.length} alertas listos para guardar.`)
    } catch (e) {
      setPreview(null)
      setError(e instanceof Error ? e.message : 'No se pudo procesar el JSON.')
    }
  }

  const saveToFirebase = async () => {
    if (!preview) return

    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await Promise.all([
        ...preview.posts.map((post) =>
          setDoc(doc(db, 'municipios', preview.municipioId, 'posts', post.id), post.data)
        ),
        ...preview.alertas.map((alerta) =>
          setDoc(doc(db, 'municipios', preview.municipioId, 'alertas', alerta.id), alerta.data)
        ),
      ])

      setSuccess('Datos guardados en Firebase correctamente.')
      setPreview(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar en Firebase.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inserción manual</h1>
          <p className="text-gray-500">Pega un JSON, valida la estructura y guarda posts o alertas en Firebase.</p>
        </div>

        <button
          type="button"
          onClick={() => downloadJson('plantilla-insercion-manual.json', template)}
          className="glass-button px-4 py-2 text-sm text-gray-700 hover:text-indigo-700"
        >
          Descargar plantilla JSON
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">JSON de entrada</h2>
              <Text>Puedes usar el template o pegar tu propio JSON.</Text>
            </div>
            <button
              type="button"
              onClick={processJson}
              disabled={processing}
              className="glass-button px-4 py-2 text-sm text-indigo-700 disabled:opacity-60"
            >
              Procesar
            </button>
          </div>

          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            className="w-full min-h-[560px] rounded-2xl border border-white/40 bg-white/70 p-4 font-mono text-xs text-gray-700 outline-none focus:ring-2 focus:ring-indigo-300"
            spellCheck={false}
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Vista previa</h2>
            {preview ? (
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong>Municipio:</strong> {preview.municipioId}</p>
                <p><strong>Posts:</strong> {preview.posts.length}</p>
                <p><strong>Alertas:</strong> {preview.alertas.length}</p>
                <p><strong>Usuario actual:</strong> {userData?.email ?? 'Sin sesión'}</p>
                <div className="rounded-xl bg-white/70 p-3 border border-white/40">
                  <p className="font-medium text-gray-700 mb-2">Primer post normalizado</p>
                  <pre className="overflow-auto text-xs text-gray-600 whitespace-pre-wrap">
{JSON.stringify(preview.posts[0]?.data ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Procesa el JSON para ver la normalización antes de guardar.</p>
            )}

            <button
              type="button"
              onClick={saveToFirebase}
              disabled={!preview || saving}
              className="mt-4 glass-button px-4 py-2 text-sm text-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar en Firebase'}
            </button>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Formato esperado</h2>
            <pre className="overflow-auto text-xs text-gray-600 whitespace-pre-wrap">
{JSON.stringify(
  {
    municipioId: 'municipio-id-opcional-si-la-sesion-ya-lo-tiene',
    posts: [{ fuente: 'twitter', urlOrigen: 'https://...', texto: '...', fecha: '2026-05-30T10:00:00.000Z' }],
    alertas: [{ tema: 'agua', tipoAlerta: 'riesgo_viral', fechaGeneracion: '2026-05-30T10:00:00.000Z' }],
  },
  null,
  2
)}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  )
}