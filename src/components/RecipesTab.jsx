import { useState } from 'react'
import AppModal from './AppModal.jsx'
import { useTranslation } from '../hooks/useTranslation.js'

const SKILL_COLORS = {
  beginner: { bg: '#EAF3EC', text: '#3D7A4F' },
  intermediate: { bg: '#FFF3E0', text: '#E65100' },
  advanced: { bg: '#FFF0EE', text: '#D94F3D' },
}

function RecipeCard({ recipe, pantry, onAddMissing, onDeleteRequest, selecting, selected, onToggleSelect }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const pantryNames = pantry.map(i => i.name.toLowerCase())
  const missingIngredients = recipe.ingredients.filter(
    ing => !pantryNames.some(p => p.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(p.split(' ')[0]))
  )
  const hasAll = missingIngredients.length === 0
  const skill = SKILL_COLORS[recipe.skillLevel] || SKILL_COLORS.beginner

  return (
    <div
      className="card"
      style={{
        margin: '0 20px',
        padding: '16px',
        outline: selected ? '2px solid var(--color-primary)' : 'none',
        transition: 'outline 0.1s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        {selecting ? (
          <button
            onClick={() => onToggleSelect(recipe.id)}
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: selected ? 'var(--color-primary)' : 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', marginTop: 2,
            }}
          >
            {selected && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
          </button>
        ) : null}

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
              {t(recipe.skillLevel)}
            </span>
            {hasAll ? (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                ✓ {t('readyToCook')}
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: 'var(--color-low-stock-bg)', color: 'var(--color-low-stock)' }}>
                {t('missing')(missingIngredients.length)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {!selecting && (
            <button
              onClick={() => onDeleteRequest(recipe.id, recipe.title)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, color: 'var(--color-text-muted)', padding: '2px 4px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
          <button
            onClick={() => !selecting && setExpanded(e => !e)}
            style={{
              background: 'none', border: 'none', cursor: selecting ? 'default' : 'pointer',
              fontSize: 20, color: 'var(--color-text-muted)',
              transition: 'transform 0.2s',
              transform: expanded && !selecting ? 'rotate(180deg)' : 'none',
            }}
          >
            ⌄
          </button>
        </div>
      </div>

      {expanded && !selecting && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {t('ingredients')}
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
              {t('steps')}
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
              {t('addMissingToList')(missingIngredients.length)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function RecipesTab({ pantry, recipes, onAddToShoppingList, onDeleteRecipe, onDeleteRecipes, onDeleteAllRecipes }) {
  const { t } = useTranslation()
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState([])
  const [modal, setModal] = useState(null)

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function exitSelectMode() {
    setSelecting(false)
    setSelected([])
  }

  function handleDeleteRequest(id, title) {
    setModal({
      title: t('delete'),
      body: t('confirmDeleteRecipe')(title),
      actions: [
        { label: t('delete'), style: 'danger', onClick: () => { onDeleteRecipe(id); setModal(null) } },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function handleDeleteSelected() {
    setModal({
      title: t('deleteSelected'),
      body: t('confirmDeleteRecipes')(selected.length),
      actions: [
        {
          label: t('delete'), style: 'danger',
          onClick: () => { onDeleteRecipes(selected); exitSelectMode(); setModal(null) },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  function handleClearAll() {
    setModal({
      title: t('clearAll'),
      body: t('confirmClearRecipes')(recipes.length),
      actions: [
        {
          label: t('delete'), style: 'danger',
          onClick: () => { onDeleteAllRecipes(); exitSelectMode(); setModal(null) },
        },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  const handleAddMissing = (ingredients) => {
    ingredients.forEach(ing => {
      onAddToShoppingList({ name: ing.name, quantity: ing.quantity, unit: ing.unit, category: 'other' })
    })
  }

  return (
    <div className="tab-content">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h1 className="page-title">{t('recipesTitle')}</h1>
          <div style={{ display: 'flex', gap: 12 }}>
            {recipes.length > 0 && (
              <>
                <button
                  onClick={() => {
                    if (selecting) { exitSelectMode() } else { setSelecting(true) }
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: selecting ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-body)', padding: '2px 0', fontWeight: selecting ? 600 : 400,
                  }}
                >
                  {selecting ? t('done') : t('select')}
                </button>
                {!selecting && (
                  <button
                    onClick={handleClearAll}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--color-text-muted)',
                      fontFamily: 'var(--font-body)', padding: '2px 0',
                    }}
                  >
                    {t('clearAll')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <p className="page-subtitle">
          {t('recipesCount')(recipes.length)}
          {selecting && selected.length > 0 && (
            <span style={{ color: 'var(--color-primary)', marginLeft: 8 }}>{t('selectedCount')(selected.length)}</span>
          )}
        </p>
      </div>

      {recipes.length > 0 && (
        <div style={{ padding: '8px 20px 12px', background: 'var(--color-primary-light)', margin: '0 20px', borderRadius: 10, fontSize: 13, color: 'var(--color-primary)' }}>
          💬 {t('askAssistantRecipes')}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👨‍🍳</div>
          <h3>{t('noRecipesYet')}</h3>
          <p>{t('noRecipesHint')}</p>
        </div>
      ) : (
        <>
          <div className="section-label" style={{ marginTop: 20 }}>{t('suggestedForYou')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                pantry={pantry}
                onAddMissing={handleAddMissing}
                onDeleteRequest={handleDeleteRequest}
                selecting={selecting}
                selected={selected.includes(recipe.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        </>
      )}

      {selecting && selected.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--tab-height) + var(--safe-bottom) + 12px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 40px)',
          maxWidth: 440,
          zIndex: 50,
        }}>
          <button
            className="btn btn-primary"
            style={{ width: '100%', background: 'var(--color-expiry)' }}
            onClick={handleDeleteSelected}
          >
            {t('deleteOf')(selected.length, recipes.length)}
          </button>
        </div>
      )}

      <div style={{ height: 20 }} />

      <AppModal
        isOpen={!!modal}
        title={modal?.title}
        actions={modal?.actions}
        onClose={() => setModal(null)}
      >
        {modal?.body}
      </AppModal>
    </div>
  )
}
