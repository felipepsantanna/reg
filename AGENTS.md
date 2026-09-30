# Regras e Diretrizes do Projeto `reg` (Capital Sexy)

Este arquivo define os padrões e restrições mandatórios para o desenvolvimento no repositório `reg`. Qualquer agente ou desenvolvedor deve seguir rigorosamente estas diretrizes.

---

## 1. Diretriz Primária: Preservação Estrita do Layout Atual

- **O layout, identidade visual e experiência do usuário (UX) atuais devem ser 100% preservados.**
- Não faça redesigns, alterações arbitrárias de cores, fontes, espaçamentos ou temas (Tailwind CSS).
- Manter o padrão visual estabelecido:
  - Header fixo com logo Capital Sexy (marca em Indigo/Cinza).
  - Navegação em abas no Dashboard (`Perfil`, `Fotos`, `Vídeos`) com botões arredondados e estados ativos sutis.
  - Cards, formulários e listas com cantos arredondados, fundos brancos/cinza claro (`#F8FAFC`, `bg-gray-100`, `bg-white`) e sombras suaves (`shadow-sm`, `shadow-md`).
  - Feedbacks de notificação via componente `Alert` e `sonner` (`toast.success`, `toast.error`, `toast.loading`).
- Qualquer nova funcionalidade visual deve reaproveitar exatamente os componentes, classes e tokens Tailwind já existentes no projeto.

---

## 2. Padrões de Arquitetura e Next.js 16

- **App Router:** Respeitar a estrutura do Next.js 16 com Turbopack.
- **Rotas Dinâmicas (`[id]`):**
  - Em **Route Handlers** (`route.ts`): Tratar sempre `context: { params: Promise<{ id: string }> }` e realizar o `await context.params`.
  - Em **Client Components** (`page.tsx` com `'use client'`): Desempacotar `params` através de `React.use(params)` conforme padrão React 19 / Next.js 16.
- **Interceptors / Proxy:**
  - Manter `src/proxy.ts` (convenção Next.js 16 substituta ao `middleware.ts`) para controle de autorização e rotas protegidas.
- **Organização de Código:**
  - Componentes de página em `src/app/`.
  - Componentes reutilizáveis em `src/components/`.
  - Conexão e queries SQL em `src/lib/`.
  - Tipos e interfaces em `src/types/`.

---

## 3. Segurança e Autenticação

- **Cookies e Tokens:**
  - Anunciantes utilizam exclusivamente o cookie `auth_token` gerado no login normal.
  - Administradores utilizam exclusivamente o cookie `admin_token` gerado em `/admin/login`.
  - Nunca expor `admin_token` para rotas de anunciantes ou misturar papéis (`role`).
  - Segredo JWT deve sempre vir de `process.env.JWT_SECRET`.
- **Banco de Dados (MySQL):**
  - Utilizar sempre queries parametrizadas (Prepared Statements via `pool.execute(query, [params])`) para impedir injeção de SQL.
  - Nunca concatenar strings em queries SQL.
  - Senhas sempre com hash `bcryptjs` (salt rounds 10).
- **Auditoria Obrigatória:**
  - Qualquer atualização em `user_profiles` deve executar `getUpdatedFields` e registrar os campos modificados na tabela `audit_logs`.

---

## 4. Integração com Bunny CDN

- **Fotos:** Envio para o Bunny Storage com sanitização de nomes e slugs (`sexo/nome/hash.webp`).
- **Vídeos:** Envio para o Bunny Video Stream API.
- **Exclusão:** Toda exclusão no banco deve garantir a remoção correspondente do arquivo ou vídeo na CDN para evitar custos com armazenamento órfão.
- **Drag & Drop:** Utilizar exclusivamente a suíte `@dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`). Não reintroduzir `react-beautiful-dnd`.

---

## 5. Higiene do Código e Dependências

- Nunca manter arquivos de layout duplicados (ex: `layout.js` junto de `layout.tsx`).
- Manter o `package.json` enxuto, sem pacotes duplicados em `dependencies` e `devDependencies`.
- Antes de concluir qualquer tarefa, validar se o comando `npm run build` passa sem erros e sem alertas críticos.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
