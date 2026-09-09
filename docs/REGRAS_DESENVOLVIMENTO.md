# Diretrizes de Desenvolvimento e Arquitetura - reg (Capital Sexy)

Este documento estabelece o guia oficial de padrões, boas práticas e regras invioláveis para o desenvolvimento e manutenção do projeto.

---

## 1. Regra de Ouro: Preservação do Layout e Identidade Visual

Qualquer alteração, refatoração ou acréscimo de funcionalidade deve **obrigatoriamente preservar o layout atual**:

- **Identidade do Portal:** A estrutura de cabeçalho, tipografia, espaçamentos e paleta de cores (destaques em Indigo `#4F46E5`, superfícies em cinza suave `#F8FAFC`, cartões brancos e bordas sutis) não devem ser alterados.
- **Componentes do Dashboard:** As abas existentes (`Perfil`, `Fotos`, `Vídeos`), a grade de mídias e a barra superior do anunciante são os padrões definitivos.
- **Componentes do Painel Admin:** A tabela de listagem de usuários com contadores de fotos/vídeos, status de auditoria, badges coloridos (`approved`, `pending`, `rejected`) e botões de ação (`FaKey`, `FaExternalLinkAlt`, `FaCopy`) devem manter o mesmo design system.
- **Feedback ao Usuário:** Mensagens de sucesso, erro e carregamento devem continuar utilizando o componente `Alert` e a biblioteca `sonner` com toasts discretos e informativos.

---

## 2. Padrões de Arquitetura e Next.js 16

### 2.1 App Router e Turbopack
- O projeto roda sobre **Next.js 16.1.6** com **Turbopack**.
- Não utilizar convenções legadas do Pages Router.
- Manter convenções de `page.tsx`, `layout.tsx`, `route.ts`.

### 2.2 Tratamento de Rotas Dinâmicas (`[id]`)
No Next.js 16, os parâmetros de rota dinâmicos são fornecidos de forma assíncrona:
- **Em Route Handlers (`src/app/api/.../[id]/route.ts`):**
  ```typescript
  interface RouteContext {
    params: Promise<{ id: string }>;
  }

  export async function GET(request: NextRequest, context: RouteContext) {
    const { id } = await context.params;
    // ...
  }
  ```
- **Em Client Components (`src/app/.../[id]/page.tsx`):**
  ```typescript
  import { use } from 'react';

  export default function MinhaPagina({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // ...
  }
  ```

### 2.3 Middleware / Proxy
- A proteção de rotas é realizada em [src/proxy.ts](file:///c:/Users/felipepsantanna/Documents/GitHub/reg/src/proxy.ts) (convenção moderna do Next.js 16).
- Não criar `middleware.ts` para evitar alertas e conflitos com o proxy ativo.

---

## 3. Segurança, Permissões e Banco de Dados

### 3.1 Isolamento de Sessões
| Papel | Rota de Login | Cookie Gerado | Escopo de Acesso Permitido |
|---|---|---|---|
| `admin` | `/admin/login` | `admin_token` | `/admin/*`, `/api/admin/*` |
| `anunciante` | `/login` | `auth_token` | `/dashboard/*`, `/api/user/*`, `/api/upload/*` |

- As sessões são assinadas com JWT via biblioteca `jose` usando o segredo `JWT_SECRET`.
- Cookies sempre configurados com flags de proteção: `httpOnly: true`, `sameSite: 'strict'`, `secure` em produção.

### 3.2 Boas Práticas no MySQL
- **Prepared Statements Obrigatórios:** Toda consulta ou mutação deve usar parâmetros preparados (`pool.execute('SELECT * FROM users WHERE id = ?', [id])`). É expressamente proibida a concatenação direta de variáveis em strings SQL.
- **Criptografia de Senhas:** Hashes gerados com `bcryptjs` utilizando custo mínimo de salt 10.
- **Auditoria de Dados (`audit_logs`):** A função [getUpdatedFields.ts](file:///c:/Users/felipepsantanna/Documents/GitHub/reg/src/lib/getUpdatedFields.ts) deve sempre ser disparada em atualizações de cadastro para manter o histórico de alterações para o administrador.

---

## 4. Gerenciamento de Mídias e Bunny CDN

- **Upload de Fotos:** Rota `/api/upload`, processamento de imagem com `sharp` para otimização e envio para o Bunny Storage no formato `{sexo}/{nome}/{slug}.webp`.
- **Upload de Vídeos:** Utilização direta da API REST de Vídeo do Bunny CDN (`uploadBunny.ts`), gerando identificador único (`guid`) e thumbnail.
- **Drag & Drop:** Manter exclusivamente a suíte `@dnd-kit` (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`).
- **Remoção Segura:** Toda exclusão de mídia no banco de dados via `/api/upload/[id]` deve verificar a posse da mídia (`user_id`) e acionar a API do Bunny correspondente antes de apagar a linha da tabela.

---

## 5. Higiene de Código e Dependências

- Nunca versionar arquivos com nomes conflitantes no mesmo diretório (ex: `layout.js` e `layout.tsx`).
- Não reintroduzir bibliotecas depreciadas ou descontinuadas (como `react-beautiful-dnd`).
- Qualquer alteração deve ser validada executando `npm run build` com saída de código 0.
