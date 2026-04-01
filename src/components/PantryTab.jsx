import { useState } from 'react'
import { CATEGORY_ICONS } from '../constants.js'
import AddItemModal from './AddItemModal.jsx'
import EditItemModal from './EditItemModal.jsx'

function isLowStock(item) {
  return item.quantity <= item.lowStockThreshold
}

function isExpiringSoon(item) {
  if (!item.expiryDate) return false
  const days = (new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  return days <= 7
}

function isExpired(item) {
  if (!item.expiryDate) return false
  return new Date(item.expiryDate) < new Date()
}

function formatExpiry(dateStr) {
  const date = new Date(dateStr)
  const days = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Expired'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 7) return `${days}d`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function PantryCard({ item, onClick }) {
  const low = isLowStock(item)
  const expiring = isExpiringSoon(item)
  const expired = isExpired(item)
  const pct = Math.min(100, (item.quantity / (item.lowStockThreshold * 3)) * 100)

  return (
    <div
      className="card"
      onClick={() => onClick(item)}
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
        borderLeft: expired ? '3px solid var(--color-expiry)' : low ? '3px solid var(--color-low-stock)' : '3px solid transparent',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.name}
            </span>
            {(expired || expiring) && (
              <span className="badge badge-expiry">
                {expired ? '⚠️' : '⏱'} {formatExpiry(item.expiryDate)}
              </span>
            )}
            {low && !expired && (
              <span className="badge badge-low">
                ↓ Low
              </span>
            )}
          </div>
          {item.brand && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>{item.brand}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: low ? 'var(--color-low-stock)' : 'var(--color-text)' }}>
            {item.quantity}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 3 }}>{item.unit}</span>
        </div>
      </div>

      {/* Quantity bar */}
      <div style={{ marginTop: 10, height: 3, background: 'var(--color-surface-2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: expired ? 'var(--color-expiry)' : low ? 'var(--color-low-stock)' : 'var(--color-primary)',
          borderRadius: 2,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}

export default function PantryTab({ pantry, onAddItem, onUpdateItem, onDeleteItem, onDeleteAll, onDeleteCategory }) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const filtered = pantry.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.brand || '').toLowerCase().includes(search.toLowerCase())
  )

  // Group by category
  const grouped = {}
  filtered.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  const lowCount = pantry.filter(i => isLowStock(i)).length
  const expiringCount = pantry.filter(i => isExpiringSoon(i) || isExpired(i)).length

  function handleClearAll() {
    if (window.confirm(`Delete all ${pantry.length} pantry items? This cannot be undone.`)) {
      onDeleteAll()
    }
  }

  function handleDeleteCategory(category) {
    if (window.confirm(`Delete all items in ${category}?`)) {
      onDeleteCategory(category)
    }
  }

  return (
    <>
      <div className="tab-content">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h1 className="page-title">Pantry</h1>
            {pantry.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--color-text-muted)',
                  padding: '2px 0', fontFamily: 'var(--font-body)',
                }}
              >
                Clear all
              </button>
            )}
          </div>
          <p className="page-subtitle">
            {pantry.length} items
            {lowCount > 0 && <span style={{ color: 'var(--color-low-stock)', marginLeft: 8 }}>· {lowCount} low</span>}
            {expiringCount > 0 && <span style={{ color: 'var(--color-expiry)', marginLeft: 8 }}>· {expiringCount} expiring</span>}
          </p>
        </div>

        <div className="search-bar">
          <span style={{ fontSize: 16 }}>🔍</span>
          <input
            placeholder="Search pantry..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-muted)' }}>✕</button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🥡</div>
            <h3>{search ? 'Nothing found' : 'Pantry is empty'}</h3>
            <p>{search ? `No items matching "${search}"` : 'Tap + to add your first item'}</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="section-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}>
                <span>{CATEGORY_ICONS[category]} {category}</span>
                <button
                  onClick={() => handleDeleteCategory(category)}
                  title={`Delete all ${category} items`}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: 'var(--color-text-muted)',
                    padding: '0 2px', lineHeight: 1,
                  }}
                >
                  🗑
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px' }}>
                {items.map(item => (
                  <PantryCard key={item.id} item={item} onClick={setEditItem} />
                ))}
              </div>
            </div>
          ))
        )}

        <div style={{ height: 20 }} />
      </div>

      <button className="fab" onClick={() => setShowAdd(true)} title="Add item">
        +
      </button>

      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdd={onAddItem}
        />
      )}

      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(updated) => { onUpdateItem(updated); setEditItem(null) }}
          onDelete={() => { onDeleteItem(editItem.id); setEditItem(null) }}
        />
      )}
    </>
  )
}
