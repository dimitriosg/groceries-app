import { useState } from 'react'

const SKILL_COLORS = {
  beginner: { bg: '#EAF3EC', text: '#3D7A4F' },
  intermediate: { bg: '#FFF3E0', text: '#E65100' },
  advanced: { bg: '#FFF0EE', text: '#D94F3D' },
}

function RecipeCard({ recipe, pantry, onAddMissing }) {
  const [expanded, setExpanded] = useState(false)

  const pantryNames = pantry.map(i => i.name.toLowerCase())
  const missingIngredients = recipe.ingredients.filter(
    ing => !pantryNames.some(p => p.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(p.split(' ')[0]))
  )
  const hasAll = missingIngredients.length === 0
  const skill = SKILL_COLORS[recipe.skillLevel] || SKILL_COLORS.beginner

  return (
    <div className="card" style={{ margin: '0 20px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>
            {recipe.title}
          </h3>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>⏱ {recipe.estimatedTimeMinutes} min</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>👥 {recipe.servings}</span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '1px 7px', borderRadius: 4,
              background: skill.bg, color: skill.text,
            }}>
              {recipe.skillLevel}
            </span>
            {hasAll ? (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                ✓ Ready to cook
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: 'var(--color-low-stock-bg)', color: 'var(--color-low-stock)' }}>
                {missingIngredients.length} missing
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
        >
          ⌄
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Ingredients
            </div>
            {recipe.ingredients.map((ing, i) => {
              const inPantry = pantryNames.some(p => p.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(p.split(' ')[0]))
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
                  <span style={{ color: inPantry ? 'var(--color-text)' : 'var(--color-expiry)', fontWeight: inPantry ? 400 : 500 }}>
                    {inPantry ? '✓' : '✗'} {ing.name}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{ing.quantity} {ing.unit}</span>
                </div>
              )
            })}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Steps
            </div>
            {recipe.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: 18 }}>{i + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          {!hasAll && (
            <button
              className="btn btn-primary"
              style={{ width: '100%', fontSize: 13 }}
              onClick={() => onAddMissing(missingIngredients)}
            >
              + Add {missingIngredients.length} missing to shopping list
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const SAMPLE_RECIPES = [
  {
    id: 'r1',
    title: 'Spaghetti alla Carbonara',
    cuisine: 'Italian',
    skillLevel: 'intermediate',
    servings: 2,
    estimatedTimeMinutes: 25,
    ingredients: [
      { name: 'Pasta (Spaghetti)', quantity: 200, unit: 'g' },
      { name: 'Pancetta', quantity: 100, unit: 'g' },
      { name: 'Eggs', quantity: 3, unit: 'units' },
      { name: 'Parmesan', quantity: 50, unit: 'g' },
      { name: 'Black Pepper', quantity: 1, unit: 'tsp' },
      { name: 'Sea Salt', quantity: 1, unit: 'tsp' },
    ],
    steps: [
      'Bring a large pot of salted water to a boil. Cook spaghetti until al dente.',
      'In a bowl, whisk together eggs, grated parmesan, and plenty of black pepper.',
      'Fry pancetta in a pan until crispy. Reserve the fat.',
      'Drain pasta, reserving a cup of pasta water.',
      'Off the heat, toss pasta with pancetta and fat, then quickly add egg mixture.',
      'Add pasta water gradually to create a creamy sauce. Season and serve immediately.',
    ],
    source: 'ai-generated',
  },
  {
    id: 'r2',
    title: 'Cherry Tomato Bruschetta',
    cuisine: 'Italian',
    skillLevel: 'beginner',
    servings: 2,
    estimatedTimeMinutes: 15,
    ingredients: [
      { name: 'Cherry Tomatoes', quantity: 200, unit: 'g' },
      { name: 'Garlic', quantity: 2, unit: 'units' },
      { name: 'Olive Oil', quantity: 3, unit: 'tbsp' },
      { name: 'Sea Salt', quantity: 0.5, unit: 'tsp' },
      { name: 'Sourdough Bread', quantity: 4, unit: 'slices' },
    ],
    steps: [
      'Halve the cherry tomatoes and mince the garlic.',
      'Toss tomatoes with olive oil, garlic, salt, and pepper. Let sit 10 minutes.',
      'Toast or grill the bread slices until golden.',
      'Rub toast with a cut garlic clove, then spoon the tomato mixture over.',
      'Drizzle with extra olive oil and serve immediately.',
    ],
    source: 'ai-generated',
  },
]

export default function RecipesTab({ pantry, onAddToShoppingList }) {
  const handleAddMissing = (ingredients) => {
    ingredients.forEach(ing => {
      onAddToShoppingList({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: 'other',
      })
    })
  }

  return (
    <div className="tab-content">
      <div className="page-header">
        <h1 className="page-title">Recipes</h1>
        <p className="page-subtitle">Based on your pantry</p>
      </div>

      <div style={{ padding: '8px 20px 12px', background: 'var(--color-primary-light)', margin: '0 20px', borderRadius: 10, fontSize: 13, color: 'var(--color-primary)' }}>
        💬 Ask the assistant for personalised recipe suggestions based on what you have.
      </div>

      <div className="section-label" style={{ marginTop: 20 }}>Suggested for you</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SAMPLE_RECIPES.map(recipe => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            pantry={pantry}
            onAddMissing={handleAddMissing}
          />
        ))}
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
