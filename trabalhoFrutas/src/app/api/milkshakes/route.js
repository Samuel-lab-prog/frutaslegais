import { NextResponse } from "next/server";
import { calculateIngredients } from "@/lib/fruits";
import { db, ensureMilkshakeTable } from "@/lib/db";

export const runtime = "nodejs";

function serialize(row) {
  return {
    id: Number(row.id),
    name: row.nome,
    ingredients: row.ingredientes,
    totalCalories: Number(row.calorias_total),
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em,
  };
}

async function parseMilkshake(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { error: "Envie os dados do milkshake em JSON." };
  }

  const name = String(body.name ?? "").trim();
  if (!name || name.length > 80) return { error: "Informe um nome de até 80 caracteres." };
  if (!Array.isArray(body.ingredients) || body.ingredients.length < 1 || body.ingredients.length > 10) {
    return { error: "Adicione de 1 a 10 frutas ao milkshake." };
  }

  const ingredients = body.ingredients.map((item) => ({
    fruitId: Number(item.fruitId),
    grams: Number(item.grams),
  }));
  if (ingredients.some((item) => !Number.isInteger(item.fruitId) || !Number.isFinite(item.grams) || item.grams < 1 || item.grams > 2000)) {
    return { error: "Confira as frutas escolhidas e use porções entre 1 g e 2.000 g." };
  }

  try {
    return { name, ...await calculateIngredients(ingredients) };
  } catch (error) {
    console.error("Falha ao calcular calorias das frutas:", error);
    return { upstreamError: "Não foi possível consultar a API de frutas para calcular o milkshake." };
  }
}

export async function GET() {
  try {
    await ensureMilkshakeTable();
    const { rows } = await db.query(
      "SELECT id, nome, ingredientes, calorias_total, criado_em, atualizado_em FROM milkshakes ORDER BY criado_em DESC, id DESC",
    );
    return NextResponse.json(rows.map(serialize));
  } catch (error) {
    console.error("Falha ao listar milkshakes:", error);
    return NextResponse.json({ error: "Não foi possível carregar os milkshakes. Confira o PostgreSQL." }, { status: 503 });
  }
}

export async function POST(request) {
  const milkshake = await parseMilkshake(request);
  if (milkshake.error) return NextResponse.json({ error: milkshake.error }, { status: 400 });
  if (milkshake.upstreamError) return NextResponse.json({ error: milkshake.upstreamError }, { status: 502 });

  try {
    await ensureMilkshakeTable();
    const { rows } = await db.query(
      "INSERT INTO milkshakes (nome, ingredientes, calorias_total) VALUES ($1, $2, $3) RETURNING id, nome, ingredientes, calorias_total, criado_em, atualizado_em",
      [milkshake.name, JSON.stringify(milkshake.ingredients), milkshake.totalCalories],
    );
    return NextResponse.json(serialize(rows[0]), { status: 201 });
  } catch (error) {
    console.error("Falha ao salvar milkshake:", error);
    return NextResponse.json({ error: "Não foi possível salvar. Confira a conexão com o PostgreSQL." }, { status: 503 });
  }
}
