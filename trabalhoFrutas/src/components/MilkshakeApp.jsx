"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const newIngredient = (fruitId = "") => ({ fruitId: String(fruitId), grams: "100" });
const formatCalories = (value) => `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kcal`;

export default function MilkshakeApp() {
  const [fruits, setFruits] = useState([]);
  const [milkshakes, setMilkshakes] = useState([]);
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState([newIngredient()]);
  const [editingId, setEditingId] = useState(null);
  const [fruitError, setFruitError] = useState("");
  const [savedError, setSavedError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [fruitResult, shakeResult] = await Promise.allSettled([
      fetch("/api/frutas", { cache: "no-store" }),
      fetch("/api/milkshakes", { cache: "no-store" }),
    ]);

    if (fruitResult.status === "fulfilled") {
      const response = fruitResult.value;
      const result = await response.json();
      if (response.ok) {
        setFruits(result);
        setFruitError("");
        setIngredients((current) => current.map((item) => item.fruitId ? item : newIngredient(result[0]?.id)));
      } else {
        setFruitError(result.error || "Não foi possível carregar as frutas.");
      }
    } else {
      setFruitError("Não foi possível conectar à API de frutas.");
    }

    if (shakeResult.status === "fulfilled") {
      const response = shakeResult.value;
      const result = await response.json();
      if (response.ok) {
        setMilkshakes(result);
        setSavedError("");
      } else {
        setSavedError(result.error || "Não foi possível carregar os milkshakes.");
      }
    } else {
      setSavedError("Não foi possível conectar ao PostgreSQL.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const estimate = useMemo(() => ingredients.reduce((sum, item) => {
    const fruit = fruits.find((candidate) => candidate.id === Number(item.fruitId));
    const grams = Number(item.grams) || 0;
    return sum + (fruit ? fruit.caloriesPer100g * grams / 100 : 0);
  }, 0), [fruits, ingredients]);

  function updateIngredient(index, field, value) {
    setIngredients((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function resetForm() {
    setName("");
    setIngredients([newIngredient(fruits[0]?.id)]);
    setEditingId(null);
  }

  function editMilkshake(milkshake) {
    setEditingId(milkshake.id);
    setName(milkshake.name);
    setIngredients(milkshake.ingredients.map((item) => ({
      fruitId: String(item.fruitId),
      grams: String(item.grams),
    })));
    setFeedback("Editando milkshake. Salve para confirmar as alterações.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitMilkshake(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");

    try {
      const response = await fetch(editingId ? `/api/milkshakes/${editingId}` : "/api/milkshakes", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          ingredients: ingredients.map((item) => ({ fruitId: Number(item.fruitId), grams: Number(item.grams) })),
        }),
      });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(result?.error || "Não foi possível salvar o milkshake.");
      resetForm();
      await loadData();
      setFeedback(editingId ? "Milkshake atualizado." : "Milkshake salvo.");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMilkshake(id) {
    if (!window.confirm("Excluir este milkshake salvo?")) return;
    try {
      const response = await fetch(`/api/milkshakes/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Não foi possível excluir o milkshake.");
      }
      setMilkshakes((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
      setFeedback("Milkshake excluído.");
    } catch (error) {
      setFeedback(error.message);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <a href="#inicio" className="brand"><span className="brand-icon">✳</span> fruta no copo</a>
        <nav><a href="#montar">Montar</a><a href="#salvos">Salvos</a></nav>
      </header>

      <section className="intro" id="inicio">
        <p className="kicker">SUA MISTURA, SUAS MEDIDAS</p>
        <h1>Um milkshake<br /><span>do seu jeito.</span></h1>
        <p>Escolha as frutas, informe a quantidade e veja uma estimativa de calorias.</p>
      </section>

      <section className="workspace" id="montar">
        <form className="builder" onSubmit={submitMilkshake}>
          <div className="section-title"><div><p className="kicker">01 / MONTAGEM</p><h2>Monte o seu</h2></div></div>

          <label htmlFor="shake-name">Nome do milkshake</label>
          <input id="shake-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Ex.: Morango com banana" required />

          <div className="ingredients-heading"><span>Frutas e porções</span><span>kcal estimadas</span></div>
          <div className="ingredient-list">
            {ingredients.map((item, index) => {
              const fruit = fruits.find((candidate) => candidate.id === Number(item.fruitId));
              const calories = fruit ? fruit.caloriesPer100g * (Number(item.grams) || 0) / 100 : 0;
              return <div className="ingredient-row" key={index}>
                <label className="sr-only" htmlFor={`fruit-${index}`}>Fruta {index + 1}</label>
                <select id={`fruit-${index}`} value={item.fruitId} onChange={(event) => updateIngredient(index, "fruitId", event.target.value)} required disabled={!fruits.length}>
                  <option value="" disabled>Escolha uma fruta</option>
                  {fruits.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
                <label className="sr-only" htmlFor={`grams-${index}`}>Quantidade em gramas da fruta {index + 1}</label>
                <div className="grams-field"><input id={`grams-${index}`} type="number" min="1" max="2000" step="1" value={item.grams} onChange={(event) => updateIngredient(index, "grams", event.target.value)} required /><span>g</span></div>
                <span className="row-calories">{formatCalories(calories)}</span>
                {ingredients.length > 1 ? <button className="remove-button" type="button" aria-label={`Remover fruta ${index + 1}`} onClick={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button> : null}
              </div>;
            })}
          </div>

          <button className="add-button" type="button" disabled={ingredients.length >= 10 || !fruits.length} onClick={() => setIngredients((current) => [...current, newIngredient(fruits[0]?.id)])}>+ adicionar fruta</button>
          {fruitError ? <p className="message error" role="status">{fruitError}</p> : null}
          {savedError ? <p className="message error" role="status">{savedError}</p> : null}

          <div className="estimate"><span>Total estimado</span><strong>{formatCalories(estimate)}</strong><small>calculado pelas porções escolhidas</small></div>
          <div className="form-actions"><button className="save-button" type="submit" disabled={saving || !fruits.length}>{saving ? "Salvando…" : editingId ? "Atualizar milkshake" : "Salvar milkshake"}</button>{editingId ? <button type="button" className="cancel-button" onClick={resetForm}>Cancelar</button> : null}</div>
          {feedback ? <p className="message" role="status">{feedback}</p> : null}
        </form>

        <aside className="how-card">
          <p className="kicker">COMO FUNCIONA</p>
          <h2>Calorias sem mistério.</h2>
          <p>A API informa as calorias de cada fruta a cada 100 g. O cálculo acompanha a quantidade que você escolhe.</p>
          <div className="formula"><span>calorias da fruta</span><strong>kcal por 100 g × porção ÷ 100</strong></div>
          <p className="small-note">A estimativa considera somente as frutas. Leite, sorvete e outros complementos não entram no cálculo.</p>
        </aside>
      </section>

      <section className="saved-section" id="salvos">
        <div className="section-title"><div><p className="kicker">02 / SEU CADERNO</p><h2>Milkshakes salvos</h2></div><span className="saved-count">{milkshakes.length} {milkshakes.length === 1 ? "receita" : "receitas"}</span></div>
        {loading ? <p className="empty-state">Carregando receitas…</p> : milkshakes.length ? <div className="saved-grid">
          {milkshakes.map((milkshake) => <article className="saved-card" key={milkshake.id}>
            <div className="saved-card-top"><span className="kicker">RECEITA {String(milkshake.id).padStart(2, "0")}</span><strong>{formatCalories(milkshake.totalCalories)}</strong></div>
            <h3>{milkshake.name}</h3>
            <ul>{milkshake.ingredients.map((item, index) => <li key={`${item.fruitId}-${index}`}><span>{item.fruitName} · {item.grams} g</span><span>{formatCalories(item.calories)}</span></li>)}</ul>
            <div className="card-actions"><button type="button" onClick={() => editMilkshake(milkshake)}>Editar</button><button type="button" className="delete-link" onClick={() => deleteMilkshake(milkshake.id)}>Excluir</button></div>
          </article>)}
        </div> : <div className="empty-state"><strong>Nenhum milkshake salvo ainda.</strong><p>Monte uma combinação acima e guarde a receita aqui.</p></div>}
      </section>

      <footer><span>fruta no copo</span><span>Informações de frutas: Fruityvice API</span></footer>
    </main>
  );
}
