import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { CATEGORIES, CATEGORY_ICONS } from '../constants.js'
import AppModal from './AppModal.jsx'
import { useTranslation } from '../hooks/useTranslation.js'

function AddShoppingModal({ onClose, onAdd }) {
  const { t, tCat } = useTranslation()
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('units')
  const [category, setCategory] = useState('other')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({
      id: uuid(),
      name: name.trim(),
      quantity: parseFloat(quantity) || undefined,
      unit: unit || undefined,
      category,
      checked: false,
      addedBy: 'user',
      addedAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div style={{ width: 40, height: 4, background: 'var(--color-border)', borderRadius: 2, margin: '0 auto 20px' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 20 }}>
          {t('addToShoppingList')}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('itemNameLabel')} *</label>
            <input className="form-input" placeholder="e.g. Oat Milk" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t('quantityLabel')}</label>
              <input className="form-input" type="number" min="0" step="any" placeholder="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('unitLabel')}</label>
              <input className="form-input" placeholder="units" value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('categoryLabel')}</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {tCat(cat)}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('addToShoppingList')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ShoppingRow({ item, onCheckboxClick, onDelete, pending, onPantryYes, onPantrySkip, onCategoryChange, onPantryConfirm }) {
  const { t, tCat } = useTranslation()
  const showPrompt = !!pending

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-card)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        opacity: item.checked && !showPrompt ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}>
        <button
          onClick={() => onCheckboxClick(item)}
          style={{
            width: 24, height: 24, borderRadius: 6,
            border: `2px solid ${item.checked ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: item.checked ? 'var(--color-primary)' : 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.15s',
          }}
        >
          {item.checked && <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>✓</span>}
        </button>

        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 500, fontSize: 15,
            textDecoration: item.checked ? 'line-through' : 'none',
            color: item.checked ? 'var(--color-text-muted)' : 'var(--color-text)',
          }}>
            {item.name}
          </div>
          {(item.quantity || item.unit) && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {[item.quantity, item.unit].filter(Boolean).join(' ')}
            </div>
          )}
        </div>

        {item.addedBy === 'ai' && (
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
            color: 'var(--color-primary)', background: 'var(--color-primary-light)',
            padding: '2px 6px', borderRadius: 4,
          }}>AI</span>
        )}

        <button
          onClick={() => onDelete(item.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-muted)', padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      {pending?.step === 'ask' && (
        <div style={{
          padding: '10px 16px',
          background: 'var(--color-primary-light)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--color-primary)' }}>
            {t('addToPantryQuestion')}
          </span>
          <button className="btn btn-primary" style={{ padding: '4px 14px', fontSize: 13 }} onClick={() => onPantryYes(item)}>
            {t('yes')}
          </button>
          <button className="btn btn-ghost" style={{ padding: '4px 14px', fontSize: 13 }} onClick={() => onPantrySkip()}>
            {t('skip')}
          </button>
        </div>
      )}

      {pending?.step === 'category' && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--color-primary-light)',
          borderTop: '1px solid var(--color-border)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-primary)', marginBottom: 8 }}>
            {t('chooseCategory')}
          </div>
          <select
            className="form-select"
            style={{ marginBottom: 10 }}
            value={pending.category}
            onChange={e => onCategoryChange(e.target.value)}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_ICONS[cat]} {tCat(cat)}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={() => onPantryConfirm(item)}>
              {t('addToPantry')}
            </button>
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => onPantrySkip()}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShoppingTab({ shoppingList, onToggle, onDelete, onAdd, onDeleteAll, pantry, addPantryItem, updatePantryItem }) {
  const { t, tCat } = useTranslation()
  const [showAdd, setShowAdd] = useState(false)
  const [pendingPantry, setPendingPantry] = useState(null)
  const [modal, setModal] = useState(null)

  function handleCheckboxClick(item) {
    if (item.checked) {
      onToggle(item.id)
      if (pendingPantry?.id === item.id) setPendingPantry(null)
      return
    }
    onToggle(item.id)
    setPendingPantry({ id: item.id, step: 'ask', category: item.category })
  }

  function handlePantryYes(item) {
    const existing = pantry.find(p => p.name.toLowerCase() === item.name.toLowerCase())
    if (existing) {
      updatePantryItem({
        ...existing,
        quantity: (existing.quantity || 0) + (item.quantity || 1),
        lastUpdatedAt: new Date().toISOString(),
      })
      onDelete(item.id)
      setPendingPantry(null)
    } else {
      setPendingPantry(prev => ({ ...prev, step: 'category' }))
    }
  }

  function handlePantrySkip() {
    setPendingPantry(null)
  }

  function handleCategoryChange(category) {
    setPendingPantry(prev => ({ ...prev, category }))
  }

  function handlePantryConfirm(item) {
    addPantryItem({
      id: uuid(),
      name: item.name,
      category: pendingPantry.category,
      quantity: item.quantity || 1,
      unit: item.unit || 'units',
      source: 'manual',
      addedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    })
    onDelete(item.id)
    setPendingPantry(null)
  }

  function handleClearAll() {
    setModal({
      title: t('clearAll'),
      body: t('confirmClearShopping')(shoppingList.length),
      actions: [
        { label: t('delete'), style: 'danger', onClick: () => { onDeleteAll(); setModal(null) } },
        { label: t('cancel'), style: 'ghost', onClick: () => setModal(null) },
      ],
    })
  }

  const unchecked = shoppingList.filter(i => !i.checked)
  const checked = shoppingList.filter(i => i.checked)

  const grouped = {}
  unchecked.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  function renderRow(item) {
    return (
      <ShoppingRow
        key={item.id}
        item={item}
        onCheckboxClick={handleCheckboxClick}
        onDelete={onDelete}
        pending={pendingPantry?.id === item.id ? pendingPantry : null}
        onPantryYes={handlePantryYes}
        onPantrySkip={handlePantrySkip}
        onCategoryChange={handleCategoryChange}
        onPantryConfirm={handlePantryConfirm}
      />
    )
  }

  return (
    <>
      <div className="tab-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h1 className="page-title">{t('shoppingTitle')}</h1>
            {shoppingList.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--color-text-muted)',
                  padding: '2px 0', fontFamily: 'var(--font-body)',
                }}
              >
                {t('clearAll')}
              </button>
            )}
          </div>
          <p className="page-subtitle">
            {t('toGet')(unchecked.length)}{checked.length > 0 ? ` · ${checked.length} ${t('done').toLowerCase()}` : ''}
          </p>
        </div>

        {shoppingList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <h3>{t('listEmpty')}</h3>
            <p>{t('listEmptyHint')}</p>
          </div>
        ) : (
          <>
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="section-label">{CATEGORY_ICONS[category]} {tCat(category)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px' }}>
                  {items.map(renderRow)}
                </div>
              </div>
            ))}

            {checked.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 24 }}>✓ {t('done')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px' }}>
                  {checked.map(renderRow)}
                </div>
                <div style={{ padding: '16px 20px 0' }}>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', fontSize: 13 }}
                    onClick={() => checked.forEach(i => onDelete(i.id))}
                  >
                    {t('clearDone')}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        <div style={{ height: 20 }} />
      </div>

      <button className="fab" onClick={() => setShowAdd(true)}>+</button>

      {showAdd && (
        <AddShoppingModal onClose={() => setShowAdd(false)} onAdd={onAdd} />
      )}

      <AppModal
        isOpen={!!modal}
        title={modal?.title}
        actions={modal?.actions}
        onClose={() => setModal(null)}
      >
        {modal?.body}
      </AppModal>
    </>
  )
}
