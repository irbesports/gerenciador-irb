import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Flag, User as UserIcon, Shield, Check, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Por favor preencha seu nome completo.')
      return
    }
    if (!email.trim()) {
      setError('Por favor preencha seu e-mail.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.')
      return
    }
    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (!acceptTerms) {
      setError('Você precisa aceitar os termos do regulamento esportivo.')
      return
    }

    try {
      setIsSubmitting(true)
      await register({
        name,
        email,
        password,
      })

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Faça login com suas credenciais recém-criadas.',
      })

      navigate('/login')
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Falha ao registrar conta. Este e-mail já pode estar em uso.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#14141F]/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-lg bg-white border border-[#E5E7EB] shadow-xl rounded-2xl relative z-10 overflow-hidden">
        <div className="h-2 bg-[#E10600] w-full" />

        <CardHeader className="pt-8 pb-4 px-8 text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#14141F] flex items-center justify-center text-white shadow-md border border-[#2A2A3D]">
            <Flag className="w-6 h-6 text-[#E10600]" />
          </div>
          <div>
            <h1 className="font-racing text-2xl font-bold tracking-wider text-[#1E1E2F] uppercase">
              Criar Conta no <span className="text-[#E10600]">Racing Manager</span>
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Cadastre-se para pilotar ou gerenciar campeonatos oficiais
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

            {/* Info Card: Conta de Competidor / Piloto */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E10600] text-white flex items-center justify-center text-sm shrink-0 mt-0.5">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-racing font-bold text-sm text-[#1E1E2F] block">
                  Perfil de Piloto / Competidor
                </span>
                <span className="text-xs text-gray-500 leading-tight block mt-0.5">
                  Seu cadastro dará acesso a inscrições em campeonatos, protestos desportivos,
                  súmulas e histórico oficial de corridas.
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                Nome Completo
              </Label>
              <Input
                id="name"
                placeholder="Ex: Carlos Silva"
                className="bg-[#F5F5F7] border-gray-300 focus-visible:ring-[#E10600]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="reg-email"
                className="text-xs font-semibold uppercase tracking-wider text-gray-700"
              >
                E-mail
              </Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="carlos@exemplo.com"
                className="bg-[#F5F5F7] border-gray-300 focus-visible:ring-[#E10600]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-pass"
                  className="text-xs font-semibold uppercase tracking-wider text-gray-700"
                >
                  Senha (mín 8)
                </Label>
                <Input
                  id="reg-pass"
                  type="password"
                  placeholder="••••••••"
                  className="bg-[#F5F5F7] border-gray-300 focus-visible:ring-[#E10600]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="reg-confirm"
                  className="text-xs font-semibold uppercase tracking-wider text-gray-700"
                >
                  Confirmar Senha
                </Label>
                <Input
                  id="reg-confirm"
                  type="password"
                  placeholder="••••••••"
                  className="bg-[#F5F5F7] border-gray-300 focus-visible:ring-[#E10600]"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(Boolean(checked))}
                className="data-[state=checked]:bg-[#E10600] data-[state=checked]:border-[#E10600] mt-0.5"
              />
              <label
                htmlFor="terms"
                className="text-xs text-gray-600 leading-snug cursor-pointer select-none"
              >
                Concordo com os Termos de Uso e o Regulamento Desportivo Oficial da Liga.
              </label>
            </div>
          </CardContent>

          <CardFooter className="px-8 pb-8 flex flex-col gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#E10600] hover:bg-[#C00500] text-white font-medium py-2.5 h-auto text-sm shadow-md shadow-red-900/20 btn-checkered-sweep flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Criando conta...'
              ) : (
                <>
                  <span>Criar Conta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="text-center text-xs text-gray-500">
              Já possui uma conta?{' '}
              <Link to="/login" className="text-[#E10600] font-semibold hover:underline">
                Entrar
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
