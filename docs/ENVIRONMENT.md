# Configuração de Variáveis de Ambiente — Plataforma IRB

## Diretrizes de Segurança para Variáveis de Ambiente

1. **Frontend (`VITE_*`)**:
   - As variáveis com prefixo `VITE_` são embutidas em texto claro no pacote estático durante o build (`npm run build`).
   - NUNCA declare chaves secretas, tokens privados, certificados ou senhas administrativas com o prefixo `VITE_`.
   - O frontend deve conhecer estritamente endpoints públicos, como `VITE_POCKETBASE_URL`.

2. **Backend / Servidor (`pb_hooks` e Migrações)**:
   - Segredos operacionais (`ADMIN_INITIAL_PASSWORD`, `PB_SUPERUSER_TOKEN`, API Keys externas) pertencem exclusivamente ao cofre de segredos da infraestrutura (Skip Cloud Secrets) ou variáveis de ambiente de runtime injetadas via `$secrets.get()` / `$os.getenv()`.
   - Nenhum segredo deve constar no código-fonte versionado no Git.

## Exemplo de Variáveis Utilizadas no Projeto

```bash
# Frontend (público)
VITE_POCKETBASE_URL="https://gerenciador-de-campeonatos-4ea54.shrd00.internal.goskip.dev"

# Backend (segredos de runtime — nunca expostos ao bundle)
# ADMIN_INITIAL_PASSWORD="<gerado_dinamicamente_ou_injetado_via_secrets>"
# DEMO_CLIENT_PASSWORD="<gerado_dinamicamente_ou_injetado_via_secrets>"
```
