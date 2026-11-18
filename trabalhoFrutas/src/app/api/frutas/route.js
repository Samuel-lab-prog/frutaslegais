import { NextResponse } from "next/server";
import { getFruitCatalog } from "@/lib/fruits";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getFruitCatalog());
  } catch (error) {
    console.error("Falha ao consultar Fruityvice:", error);
    return NextResponse.json({ error: "Não foi possível carregar as frutas. Tente novamente em instantes." }, { status: 502 });
  }
}
