# Diagnóstico Geral do Projeto `reg` (Capital Sexy - Gestão de Anunciantes)
**Data da Auditoria:** 08/09/2026  
**Última Atividade no Código:** ~6 a 8 meses atrás (Fev/Mar 2026)  
**Status de Build:** Compilando com sucesso em Next.js 16.1.6 (Turbopack)  

---

## 1. Estrutura do Projeto

### 1.1 Stack Tecnológica Principal
- **Framework Web:** [Next.js 16.1.6](https://nextjs.org) (App Router com Turbopack)
- **Linguagem:** TypeScript 5.3+
- **Estilização:** Tailwind CSS v3.4 + PostCSS + Autoprefixer
- **Banco de Dados:** MySQL (driver `mysql2` com pool de conexões)
- **Autenticação:** Cookies HTTP-Only com JWT assinado pela lib `jose` (HS256)
- **Upload & CDN:**
  - Fotos: **Bunny Storage** (armazenamento via REST API com manipulação `sharp`)
  - Vídeos: **Bunny Video Stream CDN** (criação e upload direto)
- **Drag & Drop (Ordenação de Mídias):** `@dnd-kit/core` e `@dnd-kit/sortable`
- **Ícones & Notificações:** `react-icons`, `sonner`

---

### 1.2 Mapa de Diretórios e Arquivos

```text
reg/
├── public/                 # Arquivos estáticos
├── src/
│   ├── app/                # App Router do Next.js
│   │   ├── (rotas públicas)
│   │   │   ├── page.tsx                    # Redireciona para /login
│   │   │   ├── login/page.tsx              # Login de anunciantes
│   │   │   ├── cadastro/page.tsx           # Tela estática (legada/mockada)
│   │   │   ├── esqueceu-senha/page.tsx     # Recuperação de senha
│   │   │   └── profile/[id]/page.tsx       # Perfil público aprovado
│   │   ├── (painel anunciante)
│   │   │   ├── dashboard/page.tsx          # Painel principal em abas (Perfil, Fotos, Vídeos)
│   │   │   └── dashboard/upload/page.tsx   # [Legado] Antiga tela de upload (react-beautiful-dnd)
│   │   ├── (painel admin)
│   │   │   ├── admin/page.tsx              # Painel administrativo de controle de usuários e status
│   │   │   ├── admin/login/page.tsx        # Login exclusivo de administradores
│   │   │   ├── admin/cadastrar/page.tsx    # Formulário para admin cadastrar novos anunciantes
│   │   │   ├── admin/alteracoes/[id]/      # Auditoria de alterações feitas pelo anunciante
│   │   │   ├── admin/perfil/[id]/          # Gerador e visualizador de Embed / Iframe HTML
│   │   │   └── admin/dashboard/page.tsx    # [Legado] Dashboard antigo chamando endpoints inexistentes
│   │   ├── api/                            # API Routes (Route Handlers)
│   │   │   ├── auth/                       # login, logout, forgot-password
│   │   │   ├── user/                       # profile (GET/POST), media (GET/POST/PUT)
│   │   │   ├── admin/                      # users, profiles, logs/[id], exportiframe
│   │   │   ├── profiles/[id]/              # GET dados do perfil, PUT aprovação/rejeição
│   │   │   │   └── media/                  # GET mídias do perfil aprovado
│   │   │   └── upload/                     # Upload de imagens e DELETE mídias ([id])
│   │   ├── layout.tsx & layout.js          # [Duplicado] Conflito de layout na raiz
│   │   └── globals.css                     # Estilos globais Tailwind
│   ├── components/
│   │   ├── dashboard/                      # ProfileTab, PhotosTab, VideosTab
│   │   ├── Alert.tsx                       # Componente de alertas reutilizável
│   │   └── RegistrationSuccess.tsx         # Modal/aviso de sucesso
│   ├── lib/
│   │   ├── db.ts                           # Instância da pool de conexão MySQL
│   │   ├── db-operations.ts                # Operações SQL (usuários, mídias, logs, auditoria)
│   │   ├── uploadBunny.ts                  # Utilitários de envio para Bunny CDN
│   │   ├── string-operations.ts            # Geração de slugs limpos (ex: para diretórios no Storage)
│   │   ├── getUpdatedFields.ts             # Função de diff para capturar campos alterados na auditoria
│   │   └── schema.sql                      # DDL do banco de dados (users, user_profiles, media, audit_logs)
│   ├── proxy.ts                            # Middleware/Proxy de segurança e controle de rotas por papel
│   └── types/                              # Tipagens TypeScript (db, user, MediaItem, UserProfileData)
├── next.config.mjs                         # Configurações do Next.js (images remotePatterns, serverActions)
├── tailwind.config.js                      # Configuração do Tailwind CSS
├── postcss.config.js & postcss.config.mjs   # [Conflitante] Dois arquivos de configuração PostCSS
└── package.json                            # Dependências e scripts
```

---

## 2. Regras de Negócio e Sistema

### 2.1 Perfis de Usuário (Roles) e Permissões
1. **Administrador (`admin`):**
   - Autenticação separada em `/admin/login` gerando cookie `admin_token`.
   - Gerencia a lista de anunciantes em `/admin`.
   - Cria novos anunciantes (usuário e senha provisória).
   - Aprova ou rejeita perfis (`pending` -> `approved` ou `rejected`).
   - Redefine senhas de usuários diretamente.
   - Audita alterações cadastrais realizadas pelos anunciantes (`audit_logs`).
   - Copia/Exporta o código iframe formatado (com microdados Schema.org para o portal principal).

2. **Anunciante (`anunciante`):**
   - Autenticação em `/login` gerando cookie `auth_token`.
   - No primeiro login (`status = 'primeiro acesso'`), o status é automaticamente alterado para `ativo`.
   - Edita apenas seus dados em `/dashboard`:
     - **Perfil Básico:** Nome, Sexo, Idade, Telefone e Descrição.
     - **Fotos:** Upload para Bunny Storage, reordenação via drag-and-drop, exclusão.
     - **Vídeos:** Upload para Bunny CDN Stream, reordenação via drag-and-drop, exclusão.
   - Qualquer alteração em dados de perfil já salvo gera logs de auditoria automáticos na tabela `audit_logs`.

### 2.2 Autenticação, Proteção e Sessões
- O arquivo `src/proxy.ts` protege todas as rotas listadas no matcher:
  - `/admin/:path*` e `/api/admin/:path*` exigem `admin_token` válido com `role === 'admin'`.
  - `/dashboard/:path*` e `/api/user/:path*` exigem `auth_token` válido com `role === 'anunciante'`.
- Tokens utilizam criptografia simétrica com `JWT_SECRET` e validade de 24 horas.

### 2.3 Mídias e Armazenamento
- **Imagens:** O backend redimensiona/converte usando `sharp` e salva em diretório estruturado no Bunny Storage (`{sexo}/{nome}/{slug}.webp`).
- **Vídeos:** São enviados diretamente para a biblioteca de vídeos do Bunny via API REST, gerando um `guid` e uma URL de thumbnail.
- **Posição:** O campo `position` na tabela `media` determina a ordem de exibição tanto no dashboard quanto no perfil público / iframe exportado.

---

## 3. O Que Precisa Ser Atualizado e Corrigido (Dívida Técnica de 8 meses)

### 3.1 Conflitos e Arquivos Duplicados
- [ ] **Remover `src/app/layout.js`**: Coexiste com `src/app/layout.tsx`. Manter apenas o arquivo `.tsx`.
- [ ] **Excluir `postcss.config.mjs`**: Tenta importar `"@tailwindcss/postcss"` (Tailwind v4), enquanto o projeto usa Tailwind v3 via `postcss.config.js`.

### 3.2 Limpeza e Alinhamento do `package.json`
- [ ] **Alinhar versões de React e Tipos:**
  - O projeto está com `"react": "^18.2.0"` e `"react-dom": "^18.2.0"`, mas tem `"@types/react": "^19.2.14"` e `"@types/react-dom": "^19.2.3"`. Essa divergência pode mascarar bugs ou gerar alertas de compatibilidade.
- [ ] **Eliminar dependências redundantes de Drag & Drop:**
  - O painel moderno já migrou para `@dnd-kit/core` e `@dnd-kit/sortable`.
  - Podem ser removidas: `react-beautiful-dnd`, `@hello-pangea/dnd` e `@types/react-beautiful-dnd`.
- [ ] **Remover pacotes duplicados em `dependencies` e `devDependencies`:**
  - `typescript`, `autoprefixer`, `postcss`, `tailwindcss`, `@types/node` constam nos dois blocos.
- [ ] **Corrigir script `init-db`:**
  - O comando `"init-db": "ts-node src/lib/init-db.ts"` falha porque o arquivo `init-db.ts` não existe (existe apenas `schema.sql`).

### 3.3 Código Morto e Páginas Órfãs
- [ ] **`src/app/admin/dashboard/page.tsx`**: Página antiga que faz fetch para `/api/admin/cadastros` (rota que não existe no backend). O dashboard administrativo oficial é `src/app/admin/page.tsx`. Pode ser removida ou redirecionada.
- [ ] **`src/app/dashboard/upload/page.tsx` & `StrictModeDroppable.tsx`**: Tela antiga baseada no `react-beautiful-dnd`. A funcionalidade atual está nas abas `PhotosTab` e `VideosTab` dentro de `src/app/dashboard/page.tsx`.
- [ ] **`src/lib/db.ts`**: Limpar funções mockadas em memória (`findUserById`, `findAllAnunciantes`, etc.) que não são utilizadas pelo sistema real.

### 3.4 Variáveis de Ambiente e `.env.example`
- [ ] **Atualizar `.env.example`**:
  - Atualmente contém configurações do Cloudflare R2 / S3 que foram substituídas pelo Bunny CDN.
  - Faltam no `.env.example`:
    - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
    - `JWT_SECRET`
    - `URL_BASE`
    - `BUNNY_STORAGE_HOST`, `BUNNY_STORAGE_NAME`, `BUNNY_STORAGE_ACCESS`, `BUNNY_STORAGE_URL`
    - `NEXT_PUBLIC_BUNNY_LIBRARY_ID`, `NEXT_PUBLIC_BUNNY_ACCESS_KEY`

### 3.5 Ajustes de Compatibilidade Next.js 16 (App Router)
- [ ] **Unwrapping de `params` em páginas com rotas dinâmicas:**
  - As rotas de API já recebem `context.params` assíncrono.
  - Nas páginas `src/app/admin/alteracoes/[id]/page.tsx`, `src/app/admin/perfil/[id]/page.tsx` e `src/app/profile/[id]/page.tsx`, `params` está sendo lido como prop síncrona. Em versões futuras do Next / React 19, deve ser desempacotado com `React.use(params)`.
