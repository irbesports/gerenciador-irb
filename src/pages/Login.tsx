import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Flag, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('rsanque@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Por favor preencha o e-mail e a senha.')
      return
    }

    try {
      setIsSubmitting(true)
      await login(email, password)
      // Navigate to Home IRB or dashboard based on user role/destination
      navigate('/')
    } catch (err: any) {
      console.error(err)
      setError('Credenciais inválidas. Verifique seu e-mail e senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] px-4 py-12 relative overflow-hidden">
      {/* Background motorsport accents */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#14141F]/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md bg-white border border-[#E5E7EB] shadow-xl rounded-2xl relative z-10 overflow-hidden">
        {/* Decorative carbon top banner */}
        <div className="h-2 bg-[#E10600] w-full" />

        <CardHeader className="pt-8 pb-6 px-8 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-xl bg-[#14141F] flex items-center justify-center text-white shadow-md border border-[#2A2A3D] group transition-transform hover:scale-105">
            <Flag className="w-7 h-7 text-[#E10600]" />
          </div>
          <div>
            <h1 className="font-racing text-2xl font-bold tracking-wider text-[#1E1E2F] uppercase">
              Racing <span className="text-[#E10600]">Manager</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Acesse a plataforma oficial de gestão de campeonatos
            </p>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="px-8 space-y-4">
            {error && (
              <Alert
                variant="destructive"
                className="py-2.5 text-xs bg-red-50 text-red-700 border-red-200"
              >
                <AlertCircle className="w-4 h-4 mr-1 shrink-0" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@racingmanager.com"
                  className="pl-9 bg-[#F5F5F7] border-gray-300 focus-visible:ring-[#E10600]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-gray-700"
                >
                  Senha
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 bg-[#F5F5F7] border-gray-300 focus-visible:ring-[#E10600]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {/* Quick Demo Credentials Helper */}
            <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 space-y-1">
              <div className="font-semibold text-gray-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Acesso Pré-configurado:
              </div>
              <div className="flex justify-between">
                <span>Colaborador (Admin):</span>
                <span className="font-mono font-medium text-gray-700">rsanque@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span>Cliente (Piloto):</span>
                <span className="font-mono font-medium text-gray-700">
                  piloto@racingmanager.com
                </span>
              </div>
              <div className="text-[11px] text-gray-500">Senha: Skip@Pass</div>
            </div>
          </CardContent>

          <CardFooter className="px-8 pb-8 flex flex-col gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#E10600] hover:bg-[#C00500] text-white font-medium py-2.5 h-auto text-sm shadow-md shadow-red-900/20 btn-checkered-sweep flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Autenticando...'
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="text-center text-xs text-gray-500">
              Não tem uma conta ainda?{' '}
              <Link to="/registro" className="text-[#E10600] font-semibold hover:underline">
                Criar conta
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
