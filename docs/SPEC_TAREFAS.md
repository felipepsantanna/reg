# Especificação Técnica de Tarefas (SPEC) - Projeto `reg`

**Projeto:** reg (Capital Sexy - Gestão de Anunciantes)  
**Data:** 08/09/2026  
**Status:** Planejado  
**Regra Inegociável:** Preservação estrita do layout e identidade visual existentes.

---

## 1. Visão Geral e Objetivos

Este documento especifica tecnicamente todas as tarefas necessárias para eliminar a dívida técnica acumulada de ~8 meses, corrigir arquivos conflitantes, sanear dependências, remover código morto e alinhar a aplicação com os padrões atuais do **Next.js 16 (Turbopack)**, preparando o ambiente para novas evoluções sem alterar o visual.

---

## 2. Fases de Execução

### Fase 1: Higienização Imediata e Resolução de Conflitos de Arquivos
*Objetivo: Remover duplicidades de arquivos que competem no build do Next.js e PostCSS.*

- [x] **Tarefa 1.1: Remover `src/app/layout.js` duplicado**
  - **Contexto:** Existe `layout.js` e `layout.tsx` no mesmo nível de diretório.
  - **Ação:** Excluir `src/app/layout.js` e certificar que `src/app/layout.tsx` atende a todos os requisitos de importação de fontes e CSS global.
  - **Impacto no Layout:** Zero. O `layout.tsx` já é o arquivo ativo.

- [x] **Tarefa 1.2: Excluir `postcss.config.mjs` conflitante**
  - **Contexto:** `postcss.config.mjs` tenta carregar `@tailwindcss/postcss` (incompatível com Tailwind v3 instalado).
  - **Ação:** Deletar `postcss.config.mjs` e preservar o `postcss.config.js` existente.
  - **Critério de Aceite:** O PostCSS compila o Tailwind v3 sem warnings de plugins não encontrados.

---

### Fase 2: Saneamento de Dependências e `package.json`
*Objetivo: Limpar dependências duplicadas, remover pacotes obsoletos e alinhar tipagens.*

- [x] **Tarefa 2.1: Remover dependências legadas de Drag & Drop**
  - **Pacotes removidos:**
    - `react-beautiful-dnd`
    - `@hello-pangea/dnd`
    - `@types/react-beautiful-dnd`
  - **Justificativa:** O painel moderno utiliza exclusivamente `@dnd-kit/core` e `@dnd-kit/sortable`.
  
- [x] **Tarefa 2.2: Alinhar versões de React e `@types/react`**
  - **Contexto:** O `package.json` possuía `"react": "^18.2.0"` mas `"@types/react": "^19.2.14"`.
  - **Ação:** Tipos alinhados para `@types/react: ^18.3.18` e `@types/react-dom: ^18.3.5`.

- [x] **Tarefa 2.3: Desduplicar pacotes em `dependencies` vs `devDependencies`**
  - **Itens limpos:**
    - `autoprefixer`, `postcss`, `tailwindcss`, `typescript`, `@types/node` centralizados em `devDependencies`.

- [x] **Tarefa 2.4: Corrigir ou criar o script `init-db`**
  - **Contexto:** O script `"init-db": "ts-node src/lib/init-db.ts"` falhava porque o arquivo não existia.
  - **Ação:** Script criado em `src/lib/init-db.ts` lendo `schema.sql`.

---

### Fase 3: Limpeza de Código Morto e Telas Órfãs
*Objetivo: Manter apenas o código em produção, eliminando resquícios do desenvolvimento anterior.*

- [ ] **Tarefa 3.1: Remover ou redirecionar `src/app/admin/dashboard/page.tsx`**
  - **Contexto:** É uma tela desatualizada que chama `/api/admin/cadastros` (rota inexistente).
  - **Ação:** Remover o diretório `src/app/admin/dashboard/` ou redirecionar permanentemente para `/admin` (painel oficial).

- [x] **Tarefa 3.2: Remover tela legada `src/app/dashboard/upload/`**
  - **Contexto:** Utilizava o `react-beautiful-dnd` e foi substituída pelas abas no painel principal (`PhotosTab` e `VideosTab`).
  - **Ação:** Removidos `src/app/dashboard/upload/page.tsx` e `src/app/dashboard/StrictModeDroppable.tsx`.

- [ ] **Tarefa 3.3: Limpeza de funções mockadas em `src/lib/db.ts`**
  - **Contexto:** As funções `users = []`, `findUserById`, `findAllAnunciantes` e `updateAnuncianteStatus` trabalham com arrays em memória e nunca são chamadas.
  - **Ação:** Manter em `src/lib/db.ts` apenas a criação e exportação do pool do MySQL e a tipagem correspondente.

---

### Fase 4: Atualização de Variáveis de Ambiente e `.env.example`
*Objetivo: Permitir que qualquer novo desenvolvedor ou ambiente de CI/CD configure o projeto rapidamente.*

- [ ] **Tarefa 4.1: Atualizar `.env.example`**
  - Remover referências ao Cloudflare R2 / S3.
  - Documentar todas as variáveis ativas no código:
    ```env
    # Conexão MySQL
    MYSQL_HOST=localhost
    MYSQL_PORT=3306
    MYSQL_USER=seu_usuario
    MYSQL_PASSWORD=sua_senha
    MYSQL_DATABASE=nome_do_banco

    # Segurança e Autenticação
    JWT_SECRET=sua_chave_secreta_jwt
    URL_BASE=http://localhost:3000

    # Bunny CDN - Armazenamento de Fotos (Storage)
    BUNNY_STORAGE_HOST=https://storage.bunnycdn.com
    BUNNY_STORAGE_NAME=seu_storage_name
    BUNNY_STORAGE_ACCESS=sua_access_key
    BUNNY_STORAGE_URL=https://cdn.exemplo.com/

    # Bunny CDN - Stream de Vídeos (Video Library)
    NEXT_PUBLIC_BUNNY_LIBRARY_ID=123456
    NEXT_PUBLIC_BUNNY_ACCESS_KEY=sua_chave_api_video
    BUNNY_LIBRARY_ID=123456
    BUNNY_ACCESS_KEY=sua_chave_api_video
    ```

---

### Fase 5: Estabilização de Rotas Dinâmicas no Next.js 16
*Objetivo: Garantir conformidade com as novas diretrizes do App Router.*

- [ ] **Tarefa 5.1: Adequação de `params` em Client Components**
  - **Arquivos:**
    - `src/app/admin/alteracoes/[id]/page.tsx`
    - `src/app/admin/perfil/[id]/page.tsx`
    - `src/app/profile/[id]/page.tsx`
  - **Ação:** Alterar a assinatura das páginas para receber `params: Promise<{ id: string }>` e desempacotar com `React.use(params)` conforme a recomendação do Next.js 16.

---

## 3. Matriz de Risco e Preservação Visual

| Tarefa | Risco de Quebra Visual | Ação de Mitigação |
|---|---|---|
| Remoção de `layout.js` | Nenhum | `layout.tsx` preserva classes, fontes e tags HTML. |
| Remoção de `postcss.config.mjs` | Nenhum | Garante que o Tailwind v3 continue operando normalmente. |
| Remoção de `react-beautiful-dnd` | Nenhum | Componentes ativos já utilizam `@dnd-kit`. |
| Limpeza de rotas legadas | Nenhum | Rotas ativas no menu (`/admin`, `/dashboard`) permanecem intactas. |
| Ajuste de `params` assíncrono | Baixo | Garante compilação sem warnings no Turbopack. |

---

## 4. Plano de Validação e Testes

A cada fase executada, as seguintes validações devem ocorrer:
1. **Compilação Estática:** `npm run build` deve concluir com saída de código 0 e sem erros de TypeScript.
2. **Navegação do Anunciante:**
   - Acesso a `/login` -> redirecionamento para `/dashboard`.
   - Navegação entre as abas Perfil, Fotos e Vídeos.
   - Teste visual de reordenação por Drag & Drop de imagens e vídeos.
3. **Navegação do Administrador:**
   - Acesso a `/admin/login` -> redirecionamento para `/admin`.
   - Exibição correta da lista com contadores e status.
   - Abertura dos modais de alteração de senha e cópia de embed/iframe.
