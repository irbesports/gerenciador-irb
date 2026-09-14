# Especificação de Segurança, Arquitetura e Tooling — Plataforma IRB

## Etapa 1.1: Security Hardening & Bloqueadores Técnicos

### 1. Modelo de Acesso e Matriz de Autorização (Deny by Default)

O frontend é tratado como **NÃO CONFIÁVEL**. Todas as validações críticas de permissão, campos protegidos e integridade de domínio são aplicadas em nível de banco de dados (API Rules) e server-side hooks (`pocketbase/hooks/*.js`).

| Entidade / Recurso           | Visitante (Público)           | Cliente / Piloto                                     | Colaborador (Admin/Comissário)             | Superuser (Skip Cloud) |
| :--------------------------- | :---------------------------- | :--------------------------------------------------- | :----------------------------------------- | :--------------------- |
| **users**                    | Criar (apenas role `cliente`) | Ver perfil próprio, editar nome/avatar próprio       | Ver todos, alterar perfis e roles          | Acesso Irrestrito      |
| **championships**            | Ver públicos                  | Ver públicos / inscritos                             | Criar, editar, configurar e excluir        | Acesso Irrestrito      |
| **championship_stages**      | Ver                           | Ver                                                  | Criar, editar, fechar etapas               | Acesso Irrestrito      |
| **stage_races**              | Ver                           | Ver                                                  | Criar, editar, configurar baterias         | Acesso Irrestrito      |
| **invoices**                 | Nenhum acesso                 | Listar/ver apenas as suas faturas                    | Criar, editar, faturar, cancelar           | Acesso Irrestrito      |
| **payments**                 | Nenhum acesso                 | Listar/ver apenas seus pagamentos                    | Conciliar, registrar pagamentos            | Acesso Irrestrito      |
| **moderation_cases**         | Nenhum acesso                 | Abrir protesto (`protesto_piloto`), ver se envolvido | Julgar, aplicar penalidade, alterar status | Acesso Irrestrito      |
| **moderation_case_messages** | Nenhum acesso                 | Responder casos em que está envolvido                | Julgar, enviar súmula oficial              | Acesso Irrestrito      |
| **notifications**            | Nenhum acesso                 | Listar, ler e marcar como lidas apenas as suas       | Criar notificações gerais/oficiais         | Acesso Irrestrito      |
| **race_imports (raw_json)**  | Nenhum acesso                 | Listar metadados autorizados                         | Importar telemetria iRacing, gerenciar     | Acesso Irrestrito      |
| **race_results**             | Ver resultados                | Ver resultados                                       | Calcular pontuação, publicar resultados    | Acesso Irrestrito      |

---

### 2. Política de Senhas & Autenticação

- **Comprimento Mínimo**: 15 caracteres para autenticação exclusiva por senha.
- **Comprimento Máximo Suportado**: pelo menos 128 caracteres.
- **Permissividade**: Aceita gerenciadores de senhas (1Password, Bitwarden, Apple Keychain) com suporte total a colagem (`paste`) e sem caracteres proibidos arbitrários.
- **Validação Server-side**: Validado diretamente no esquema do PocketBase (`min: 15` no campo `password`) e nos fluxos de registro.

---

### 3. Armazenamento de Tokens & Autenticação Web/Mobile

- **Web App (Atual)**:
  - O JS SDK do PocketBase utiliza `LocalAuthStore` persistido no `localStorage`.
  - **Mitigações Atuais**: Prevenção ativa de XSS, dependências auditadas, CSP estrito, higienização de inputs e headers de segurança.
  - **Evolução Futura Recomendada**: Para áreas administrativas ou financeiras de alto risco, migrar para arquitetura de BFF (Backend-for-Frontend) ou cookies `HttpOnly` com flags `SameSite=Strict` e `Secure`.
- **Mobile (Planejamento Futuro - iOS / Android)**:
  - Tokens sensíveis de autenticação **NÃO** devem ser gravados em armazenamento genérico desprotegido (como `AsyncStorage` puro ou `SharedPreferences` sem criptografia).
  - Implementação prevista com **iOS Keychain** (via Apple Security Framework / Keychain Services) e **Android Keystore** (via Android EncryptedSharedPreferences).
  - A interface `AsyncAuthStore` do SDK do PocketBase deverá ser implementada com adaptadores de criptografia de hardware do dispositivo.

---

### 4. CORS & Rate Limiting

- **CORS de Produção**:
  - Restrito às origens oficiais autorizadas:
    - `https://gerenciador-de-campeonatos-4ea54.goskip.app`
    - Previews autorizados da infraestrutura Skip Cloud associada
  - O uso de wildcard `*` em ambiente produtivo é proibido.
- **Rate Limiting (Proteção contra Brute Force / DoS)**:
  - **Prioridade 1 (Auth)**: `/api/collections/users/auth-with-password`, `/api/collections/users/request-password-reset`, `/api/collections/users/request-verification`
    - Parâmetro recomendado: Máximo de 5 tentativas por IP a cada 1 minuto para falhas de senha; 3 solicitações de reset por hora por e-mail.
  - **Prioridade 2 (Uploads & Import)**: `/api/collections/race_imports/records`, endpoints de anexos
    - Parâmetro recomendado: Máximo de 10 uploads por minuto por colaborador.
  - **Prioridade 3 (API Geral)**: 100 requisições por minuto por IP para rotas públicas.
  - **Camada de Borda**: Planejada para implementação em WAF / Cloudflare Edge Rules para proteção DDoS antes do alcance ao processo de banco SQLite.

---

### 5. Arquitetura de Cabeçalhos de Segurança (Security Headers)

Configuração obrigatória nos gateways de produção (HTTP Response Headers):

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://goskip.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://img.usecurling.com; connect-src 'self' https://*.goskip.dev https://*.internal.goskip.dev wss://*.goskip.dev; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

---

### 6. Pipeline de Ferramental de Segurança (Security Tooling)

Estrutura para execução em CI/CD:

1. **Dependency Scanning & Audit**: `npm audit` / `pnpm audit` e OSV-Scanner para identificar vulnerabilidades conhecidas (CVEs) no grafo de dependências.
2. **Secret Scanning**: Gitleaks e TruffleHog para prevenir commits acidentais de tokens, chaves ou senhas.
3. **SAST (Static Application Security Testing)**: Semgrep / CodeQL para análise estática contínua de vulnerabilidades de código e injeções.
4. **DAST & E2E Security Tests**: OWASP ZAP (Dynamic Application Security Testing) e suíte Playwright Security para testes automatizados de controle de acesso (BOLA/IDOR, privilégios horizontais e verticais).
