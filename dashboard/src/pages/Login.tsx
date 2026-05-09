import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch (err) {
      setError('Credenciales inválidas. Verifica tu email y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-10 glass-card animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">PC</span>
          </div>
          <h1 className="text-2xl font-light text-gray-800 tracking-tight">Pulso Ciudadano</h1>
          <p className="text-gray-400 mt-2 font-light">Monitoreo de opinión pública</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 text-sm text-rose-600 bg-rose-50/60 rounded-xl border border-rose-100">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 py-3 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all placeholder:text-gray-400"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 py-3 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all placeholder:text-gray-400"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200/50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="glass-spinner w-4 h-4 animate-spin"></span>
                Iniciando...
              </span>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
