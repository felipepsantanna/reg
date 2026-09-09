# Regras de Desenvolvimento do Projeto reg

## Diretrizes Mandatórias

1. **Preservar o Layout Atual Incondicionalmente:**
   - Todo componente novo ou refatorado deve manter o layout, estrutura e estilo visual pré-existentes.
   - Proibido alterar o esquema de cores, tipografia ou componentes base sem autorização explícita.
   - Manter a paleta: Indigo (`text-indigo-600`, `bg-indigo-600`), cinzas neutros (`#F8FAFC`, `bg-gray-100`, `border-gray-200`) e branco.

2. **Padrões de Código e Framework:**
   - Manter Next.js 16 (App Router) e TypeScript com tipagem segura.
   - Rotas dinâmicas: desempacotar `params` assíncronos (`await context.params` em APIs; `React.use(params)` em Client Components).
   - Manter `src/proxy.ts` como middleware central de autorização.
   - Manter `@dnd-kit` como biblioteca padrão de ordenação por arrasto.

3. **Banco de Dados e Segurança:**
   - MySQL via `mysql2/promise` com pool de conexões.
   - Queries parametrizadas obrigatórias em qualquer interação com o banco.
   - Senhas criptografadas com `bcryptjs`.
   - Isolamento total de sessões: `admin_token` vs `auth_token`.
   - Manter a rotina de auditoria (`audit_logs`) ativa para alterações de perfil.

4. **Higiene e Qualidade:**
   - Não reintroduzir dependências legadas (`react-beautiful-dnd`, `@hello-pangea/dnd`).
   - Evitar arquivos duplicados (`layout.js`, `postcss.config.mjs`).
   - Toda alteração deve passar no `npm run build` sem quebras.
