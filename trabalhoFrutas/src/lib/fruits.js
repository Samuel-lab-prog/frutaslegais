const FRUIT_API_URL = "https://www.fruityvice.com/api/fruit/all";

export async function getFruitCatalog() {
  const response = await fetch(FRUIT_API_URL, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`A API Fruityvice respondeu com status ${response.status}.`);
  }

  const fruits = await response.json();
  if (!Array.isArray(fruits)) throw new Error("A resposta da API de frutas está inválida.");

  return fruits
    .filter((fruit) => Number.isInteger(Number(fruit.id)) && fruit.name && Number.isFinite(Number(fruit.nutritions?.calories)))
    .map((fruit) => ({
      id: Number(fruit.id),
      name: fruit.name,
      family: fruit.family,
      caloriesPer100g: Number(fruit.nutritions.calories),
      sugarPer100g: Number(fruit.nutritions.sugar),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function calculateIngredients(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 10) {
    throw new Error("Adicione de 1 a 10 frutas ao milkshake.");
  }

  const catalog = await getFruitCatalog();
  const ingredients = input.map((item) => {
    const fruitId = Number(item.fruitId);
    const grams = Number(item.grams);
    const fruit = catalog.find((candidate) => candidate.id === fruitId);

    if (!fruit) throw new Error("Escolha uma fruta disponível na API.");
    if (!Number.isFinite(grams) || grams < 1 || grams > 2000) {
      throw new Error("Cada porção deve ter entre 1 g e 2.000 g.");
    }

    return {
      fruitId: fruit.id,
      fruitName: fruit.name,
      grams: Math.round(grams),
      caloriesPer100g: fruit.caloriesPer100g,
      calories: Math.round((fruit.caloriesPer100g * Math.round(grams)) / 100 * 100) / 100,
    };
  });

  const totalCalories = Math.round(ingredients.reduce((total, item) => total + item.calories, 0) * 100) / 100;
  return { ingredients, totalCalories };
}
