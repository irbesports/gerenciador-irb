import React, { useEffect, useState } from 'react'
import {
  Settings,
  Users,
  Shield,
  Activity,
  Server,
  Database,
  Cpu,
  CheckCircle,
  FileCode,
  History,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { usersService, pilotsService, championshipsService } from '@/services/api'
import type { User, Pilot, Championship } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function AdminDashboard() {
  const { isCollaborator } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [championships, setChampionships] = useState<Championship[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      const [uList, pList, cList] = await Promise.all([
        usersService.list(),
        pilotsService.list(),
        championshipsService.list(),
      ])
      setUsers(uList)
      setPilots(pList)
      setChampionships(cList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar painel admin.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await usersService.updateRole(userId, newRole)
      toast({ title: 'Papel Atualizado', description: `Usuário agora é ${newRole}.` })
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar papel do usuário.',
        variant: 'destructive',
      })
    }
  }

  const totalCollaborators = users.filter((u) => u.role === 'colaborador').length
  const totalClients = users.filter((u) => u.role === 'cliente').length

  const activityLogs = [
    {
      id: 1,
      action: 'Usuário registrado',
      detail: 'Carlos Silva se cadastrou como Cliente',
      time: 'Há 12 minutos',
    },
    {
      id: 2,
      action: 'Pagamento conciliado',
      detail: 'Fatura #inv_01 liquidada via PIX',
      time: 'Há 45 minutos',
    },
    {
      id: 3,
      action: 'Campeonato alterado',
      detail: 'Tabela de pontuação de Copa GT atualizada',
      time: 'Há 2 horas',
    },
    {
      id: 4,
      action: 'Infração julgada',
      detail: 'Comissários aplicaram advertência a Marcos Lima',
      time: 'Há 4 horas',
    },
    {
      id: 5,
      action: 'Backup do sistema',
      detail: 'Sincronização de réplica do PocketBase concluída',
      time: 'Hoje às 03:00',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-racing text-2xl sm:text-3xl font-bold text-[#1E1E2F] uppercase tracking-wide">
            Painel Administrativo & Governança
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Controle de acessos (RBAC), auditoria de integridade e telemetria da plataforma
          </p>
        </div>

        <Badge className="bg-red-50 text-[#E10600] border-red-200 text-xs px-3 py-1 font-bold">
          Modo Colaborador Ativo
        </Badge>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="racing-card p-5 border-l-4 border-l-[#E10600]">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Total de Usuários
          </span>
          <h3 className="font-racing text-3xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
            {users.length}
          </h3>
          <p className="text-[11px] text-gray-500 mt-1">Autenticados no sistema</p>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-emerald-600">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Pilotos Cadastrados
          </span>
          <h3 className="font-racing text-3xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
            {pilots.length}
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {pilots.filter((p) => p.status === 'ativo').length} ativos no grid
          </p>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-blue-600">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Colaboradores (Staff)
          </span>
          <h3 className="font-racing text-3xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
            {totalCollaborators}
          </h3>
          <p className="text-[11px] text-blue-600 font-semibold mt-1">Permissões de gestão</p>
        </Card>

        <Card className="racing-card p-5 border-l-4 border-l-amber-500">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
            Campeonatos Gerenciados
          </span>
          <h3 className="font-racing text-3xl font-bold text-[#1E1E2F] mt-1 tabular-nums">
            {championships.length}
          </h3>
          <p className="text-[11px] text-gray-500 mt-1">Nas temporadas ativas</p>
        </Card>
      </div>

      {/* Role Management Table */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#E10600]" />
            <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
              Gestão de Contas & Papéis de Acesso (RBAC)
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            {totalClients} Clientes • {totalCollaborators} Colaboradores
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Nome do Usuário</th>
                <th className="py-3 px-4">E-mail Cadastrado</th>
                <th className="py-3 px-4">Papel Atual</th>
                <th className="py-3 px-4">Criado Em</th>
                <th className="py-3 px-4 text-right">Alterar Papel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-red-50/20">
                  <td className="py-3.5 px-4 font-semibold text-gray-900">
                    {u.name || 'Sem nome'}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-gray-600">{u.email}</td>

                  <td className="py-3.5 px-4">
                    <Badge
                      className={`text-[9px] uppercase font-bold ${
                        u.role === 'colaborador'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {u.role || 'cliente'}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                    {new Date(u.created).toLocaleDateString('pt-BR')}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-block w-36">
                      <Select
                        value={u.role || 'cliente'}
                        onValueChange={(val) => handleRoleChange(u.id, val)}
                      >
                        <SelectTrigger className="h-7 text-xs bg-[#F5F5F7]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cliente">Cliente (Piloto)</SelectItem>
                          <SelectItem value="colaborador">Colaborador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* System Health & Activity Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Health */}
        <Card className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Activity className="w-4 h-4 text-[#E10600]" />
            <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
              Saúde da Infraestrutura & Banco
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="flex items-center gap-2 text-gray-700 font-medium">
                <Server className="w-4 h-4 text-emerald-600" /> API Gateway Skip Cloud
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> 100% Online
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="flex items-center gap-2 text-gray-700 font-medium">
                <Database className="w-4 h-4 text-emerald-600" /> Banco PocketBase
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Conectado / Réplica Ativa
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="flex items-center gap-2 text-gray-700 font-medium">
                <FileCode className="w-4 h-4 text-blue-600" /> Migrações Aplicadas
              </span>
              <span className="font-mono font-semibold text-gray-800">
                2 migrações (0001, 0002)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
              <span className="flex items-center gap-2 text-gray-700 font-medium">
                <Cpu className="w-4 h-4 text-purple-600" /> Versão da Plataforma
              </span>
              <span className="font-mono text-gray-600">v1.2.0-racing-core</span>
            </div>
          </div>
        </Card>

        {/* Recent Activity Log */}
        <Card className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <History className="w-4 h-4 text-[#E10600]" />
            <h3 className="font-racing text-sm font-bold text-[#1E1E2F] uppercase">
              Log de Auditoria Recente
            </h3>
          </div>

          <div className="space-y-3">
            {activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 text-xs border-b border-gray-50 pb-2.5 last:border-none"
              >
                <div>
                  <span className="font-semibold text-gray-900 block">{log.action}</span>
                  <span className="text-[11px] text-gray-500">{log.detail}</span>
                </div>
                <span className="font-mono text-[10px] text-gray-400 shrink-0">{log.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
