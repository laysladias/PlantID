# PlantID — como colocar tudo pra funcionar

## 1) Supabase (uma vez só) — SQL Editor, rode nesta ordem
1. `sql/1_estrutura_e_permissoes.sql`
2. `sql/2_catalogo_local.sql`
3. `sql/3_catalogo_expandido.sql`

## 2) Testar no seu computador (não precisa de Netlify)
1. Crie um arquivo `.env` na raiz (copie o `.env.example`) com as 3 variáveis:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PERENUAL_API_KEY`
2. `npm install`
3. `npm run dev` → abra o endereço que aparecer (http://localhost:5173)

## 3) Publicar (Netlify sem créditos → use Vercel, é grátis)
1. vercel.com → entrar com o GitHub → Add New → Project → escolher o repositório
2. Em Environment Variables, adicionar as 3 variáveis acima
3. Deploy. (O arquivo `vercel.json` já cuida das rotas.)
