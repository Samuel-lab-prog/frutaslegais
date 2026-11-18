# Fruta no Copo

Aplicação simples para montar milkshakes de frutas, estimar calorias e salvar receitas. Os dados nutricionais vêm da [API Fruityvice](https://www.fruityvice.com/), que informa os nutrientes por 100 g. As receitas salvas ficam em um banco PostgreSQL.

## Rodar localmente

Requer Node.js 20.9 ou superior, Bun ou npm e PostgreSQL instalado e iniciado.

```powershell
cd trabalhoFrutas
bun install
bun run dev
```

O comando `dev` verifica e cria o banco local automaticamente quando necessário. Copie `trabalhoFrutas/.env.example` para `trabalhoFrutas/.env.local` e configure usuário e senha do PostgreSQL. Acesse [http://localhost:3000](http://localhost:3000).

Também é possível executar `bun run db:setup` para preparar o banco sem iniciar a aplicação. A criação automática só é habilitada para conexões em `localhost`.

## Como funciona o cálculo

Cada fruta tem um valor de calorias por 100 g. Para cada porção, o sistema calcula `calorias por 100 g × quantidade em gramas ÷ 100` e soma os resultados. A estimativa inclui as frutas; leite, sorvete e outros complementos não estão incluídos.

## API usada e rotas do projeto

Fonte nutricional: [Fruityvice](https://www.fruityvice.com/), endpoint `GET https://www.fruityvice.com/api/fruit/all`. A API não exige chave. O Next.js consulta a API no servidor e entrega a lista à interface.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/frutas` | Lista as frutas disponíveis na Fruityvice |
| `GET` | `/api/milkshakes` | Lista as receitas salvas |
| `POST` | `/api/milkshakes` | Calcula e salva uma receita |
| `PATCH` | `/api/milkshakes/:id` | Edita uma receita e recalcula as calorias |
| `DELETE` | `/api/milkshakes/:id` | Exclui uma receita |

## Deploy

Configure `DATABASE_URL` no serviço de hospedagem e use `npm run build` para compilar e `npm run start` para iniciar. O serviço PostgreSQL remoto precisa existir antes do deploy; a inicialização automática do banco é limitada ao computador local.
