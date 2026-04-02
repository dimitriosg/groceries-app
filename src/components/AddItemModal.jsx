import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { CATEGORIES, CATEGORY_ICONS, PANTRY_UNITS } from '../constants.js'
import BarcodeScanner from './BarcodeScanner.jsx'
import { useTranslation } from '../hooks/useTranslation.js'

export default function AddItemModal({ onClose, onAdd, pantry }) {
  const { t, tCat, tUnit } = useTranslation()
  const [scanning, setScanning] = useState(false)
  const [form, setForm] = useState({
    name: '',
    brand: '',
    category: 'other',
    quantity: '',
    unit: 'units',
    lowStockThreshold: '',
    expiryDate: '',
  })

  const handleScanResult = (product) => {
    setScanning(false)
    setForm({
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || 'other',
      quantity: product.quantity || '',
      unit: product.unit || 'units',
      lowStockThreshold: '',
      expiryDate: '',
    })
  }

  if (scanning) {
    return (
      <BarcodeScanner
        onResult={handleScanResult}
        onClose={() => setScanning(false)}
        pantry={pantry}
      />
    )
  }

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return

    const item = {
      id: uuid(),
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      category: form.category,
      quantity: parseFloat(form.quantity) || 1,
      unit: form.unit,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 1,
      expiryDate: form.expiryDate || undefined,
      addedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      source: 'manual',
    }

    onAdd(item)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div style={{ width: 40, height: 4, background: 'var(--color-border)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>
            {t('addPantryItem')}
          </h2>
          <button
            type="button"
            onClick={() => setScanning(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--color-primary-light)', color: 'var(--color-primary)',
              border: 'none', borderRadius: 20, padding: '7px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            📷 {t('scanBarcode')}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('itemNameLabel')} *</label>
            <input
              className="form-input"
              placeholder="e.g. Olive Oil"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('brandLabel')} {t('brandOptional')}</label>
            <input
              className="form-input"
              placeholder="e.g. Filippo Berio"
              value={form.brand}
              onChange={e => set('brand', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('categoryLabel')}</label>
            <select
              className="form-select"
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {tCat(cat)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t('quantityLabel')}</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                placeholder="1"
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('unitLabel')}</label>
              <select
                className="form-select"
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
              >
                {PANTRY_UNITS.map(u => <option key={u} value={u}>{tUnit(u)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t('lowStockAlert')}</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 2"
                value={form.lowStockThreshold}
                onChange={e => set('lowStockThreshold', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('expiryDateLabel')}</label>
              <input
                className="form-input"
                type="date"
                value={form.expiryDate}
                onChange={e => set('expiryDate', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {t('addToPantryBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
