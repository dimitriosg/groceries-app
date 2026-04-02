import { useState } from 'react'
import { CATEGORIES, CATEGORY_ICONS, PANTRY_UNITS } from '../constants.js'
import { useTranslation } from '../hooks/useTranslation.js'

export default function EditItemModal({ item, onClose, onSave, onDelete }) {
  const { t, tCat, tUnit } = useTranslation()
  const [form, setForm] = useState({
    name: item.name,
    brand: item.brand || '',
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    lowStockThreshold: item.lowStockThreshold,
    expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...item,
      ...form,
      brand: form.brand.trim() || undefined,
      quantity: parseFloat(form.quantity) || 0,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 1,
      expiryDate: form.expiryDate || undefined,
      lastUpdatedAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div style={{ width: 40, height: 4, background: 'var(--color-border)', borderRadius: 2, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>
            {t('editItem')}
          </h2>
          <button
            onClick={onDelete}
            style={{ background: 'var(--color-expiry-bg)', color: 'var(--color-expiry)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            {t('delete')}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('itemNameLabel')} *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">{t('brandLabel')} {t('brandOptional')}</label>
            <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">{t('categoryLabel')}</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
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
              <input className="form-input" type="number" min="0" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('unitLabel')}</label>
              <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                {PANTRY_UNITS.map(u => <option key={u} value={u}>{tUnit(u)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t('lowStockAlert')}</label>
              <input className="form-input" type="number" min="0" step="any" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('expiryDateLabel')}</label>
              <input className="form-input" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('saveChanges')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
