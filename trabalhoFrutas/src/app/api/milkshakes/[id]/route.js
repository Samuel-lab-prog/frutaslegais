import { NextResponse } from "next/server";
import { db, ensureMilkshakeTable } from "@/lib/db";
import { calculateIngredients } from "@/lib/fruits";

export const runtime = "nodejs";

const validId = (id) => /^\d+$/.test(String(id));
const serialize = (row) => ({
  id: Number(row.id),
  name: row.nome,
  ingredients: row.ingredientes,
  totalCalories: Number(row.calorias_total),
  createdAt: row.criado_em,
  updatedAt: row.atualizado_em,
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Milkshake inválido." }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Envie os dados do milkshake em JSON." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const input = Array.isArray(body.ingredients)
    ? body.ingredients.map((item) => ({ fruitId: Number(item.fruitId), grams: Number(item.grams) }))
    : [];
  if (!name || name.length > 80) return NextResponse.json({ error: "Informe um nome de até 80 caracteres." }, { status: 400 });
  if (input.length < 1 || input.length > 10 || input.some((item) => !Number.isInteger(item.fruitId) || !Number.isFinite(item.grams) || item.grams < 1 || item.grams > 2000)) {
    return NextResponse.json({ error: "Adicione de 1 a 10 frutas com porções entre 1 g e 2.000 g." }, { status: 400 });
  }

  let calculated;
  try {
    calculated = await calculateIngredients(input);
  } catch (error) {
    console.error("Falha ao calcular edição do milkshake:", error);
    return NextResponse.json({ error: "Não foi possível consultar a API de frutas para calcular o milkshake." }, { status: 502 });
  }

  try {
    await ensureMilkshakeTable();
    const { rows } = await db.query(
      "UPDATE milkshakes SET nome = $1, ingredientes = $2, calorias_total = $3, atualizado_em = NOW() WHERE id = $4 RETURNING id, nome, ingredientes, calorias_total, criado_em, atualizado_em",
      [name, JSON.stringify(calculated.ingredients), calculated.totalCalories, id],
    );
    if (!rows[0]) return NextResponse.json({ error: "Milkshake não encontrado." }, { status: 404 });
    return NextResponse.json(serialize(rows[0]));
  } catch (error) {
    console.error("Falha ao editar milkshake:", error);
    return NextResponse.json({ error: "Não foi possível editar. Confira o PostgreSQL." }, { status: 503 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Milkshake inválido." }, { status: 400 });
  try {
    await ensureMilkshakeTable();
    const { rowCount } = await db.query("DELETE FROM milkshakes WHERE id = $1", [id]);
    if (!rowCount) return NextResponse.json({ error: "Milkshake não encontrado." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Falha ao excluir milkshake:", error);
    return NextResponse.json({ error: "Não foi possível excluir. Confira o PostgreSQL." }, { status: 503 });
  }
}
