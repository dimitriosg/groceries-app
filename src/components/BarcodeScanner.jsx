import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser'
import { CATEGORIES } from '../constants.js'

// Map Open Food Facts categories to our app categories
function mapCategory(offCategories = '') {
  const c = offCategories.toLowerCase()
  if (c.includes('dairy') || c.includes('milk') || c.includes('cheese') || c.includes('yogurt')) return 'dairy'
  if (c.includes('meat') || c.includes('fish') || c.includes('poultry') || c.includes('seafood')) return 'meat & fish'
  if (c.includes('fruit') || c.includes('vegetable') || c.includes('produce') || c.includes('fresh')) return 'produce'
  if (c.includes('frozen')) return 'frozen'
  if (c.includes('beverage') || c.includes('drink') || c.includes('juice') || c.includes('water') || c.includes('coffee') || c.includes('tea')) return 'beverages'
  if (c.includes('bread') || c.includes('bakery') || c.includes('pastry')) return 'bakery'
  if (c.includes('snack') || c.includes('sweet') || c.includes('candy') || c.includes('chocolate') || c.includes('biscuit')) return 'snacks & sweets'
  if (c.includes('cereal') || c.includes('pasta') || c.includes('rice') || c.includes('grain') || c.includes('flour') || c.includes('legume')) return 'dry goods & grains'
  if (c.includes('canned') || c.includes('jarred') || c.includes('preserve') || c.includes('tinned')) return 'canned & jarred'
  if (c.includes('sauce') || c.includes('condiment') || c.includes('oil') || c.includes('vinegar') || c.includes('spice') || c.includes('seasoning')) return 'condiments & sauces'
  return 'other'
}

// Parse quantity string like "500g", "1L", "250 ml" into { quantity, unit }
function parseQuantity(str = '') {
  const match = str.match(/^([\d.]+)\s*(g|kg|ml|l|cl|oz|lb|units?)?/i)
  if (!match) return { quantity: 1, unit: 'units' }
  const qty = parseFloat(match[1])
  const rawUnit = (match[2] || 'units').toLowerCase()
  const unitMap = { l: 'l', cl: 'ml', oz: 'oz', lb: 'lb', unit: 'units', units: 'units' }
  return { quantity: qty, unit: unitMap[rawUnit] || rawUnit }
}

async function lookupBarcode(barcode) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  )
  if (!res.ok) throw new Error('Network error')
  const data = await res.json()
  if (data.status !== 1) return null

  const p = data.product
  const { quantity, unit } = parseQuantity(p.quantity)

  return {
    name: p.product_name || p.abbreviated_product_name || '',
    brand: p.brands ? p.brands.split(',')[0].trim() : undefined,
    category: mapCategory(p.categories || p.food_groups || ''),
    quantity,
    unit,
    barcode,
  }
}

export default function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [status, setStatus] = useState('scanning') // scanning | found | error | loading
  const [errorMsg, setErrorMsg] = useState('')
  const [scannedProduct, setScannedProduct] = useState(null)
  const [torchOn, setTorchOn] = useState(false)
  const trackRef = useRef(null)
  const hasScanned = useRef(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    let controls

    reader.decodeFromConstraints(
      {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      },
      videoRef.current,
      async (result, err, ctrl) => {
        if (!controls && ctrl) {
          controls = ctrl
          // Save track for torch
          const stream = videoRef.current?.srcObject
          if (stream) {
            trackRef.current = stream.getVideoTracks()[0]
          }
        }

        if (result && !hasScanned.current) {
          hasScanned.current = true
          setStatus('loading')
          const barcode = result.getText()
          try {
            const product = await lookupBarcode(barcode)
            if (product && product.name) {
              setScannedProduct(product)
              setStatus('found')
            } else {
              // Barcode not in database — let user enter manually
              setScannedProduct({ barcode, name: '', brand: '', category: 'other', quantity: 1, unit: 'units' })
              setStatus('found')
            }
          } catch {
            hasScanned.current = false
            setStatus('scanning')
          }
        }
      }
    ).catch(err => {
      setErrorMsg(
        err.message?.includes('Permission')
          ? 'Camera access denied. Please allow camera access in your browser settings.'
          : 'Could not start camera. Try reloading the page.'
      )
      setStatus('error')
    })

    return () => {
      controls?.stop()
      readerRef.current = null
    }
  }, [])

  const toggleTorch = async () => {
    if (!trackRef.current) return
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn(t => !t)
    } catch {
      // torch not supported on this device
    }
  }

  const handleRescan = () => {
    hasScanned.current = false
    setScannedProduct(null)
    setStatus('scanning')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#000',
      zIndex: 300,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Camera view */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'found' ? 'none' : 'block' }}
          muted
          playsInline
        />

        {/* Overlay with scan frame */}
        {status === 'scanning' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            {/* Dark overlay with cutout */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

            {/* Scan frame */}
            <div style={{
              position: 'relative',
              width: 260, height: 160,
              zIndex: 1,
            }}>
              {/* Corner markers */}
              {[
                { top: 0, left: 0, borderTop: '3px solid white', borderLeft: '3px solid white' },
                { top: 0, right: 0, borderTop: '3px solid white', borderRight: '3px solid white' },
                { bottom: 0, left: 0, borderBottom: '3px solid white', borderLeft: '3px solid white' },
                { bottom: 0, right: 0, borderBottom: '3px solid white', borderRight: '3px solid white' },
              ].map((style, i) => (
                <div key={i} style={{ position: 'absolute', width: 24, height: 24, ...style }} />
              ))}

              {/* Scan line animation */}
              <div style={{
                position: 'absolute',
                left: 4, right: 4,
                height: 2,
                background: 'var(--color-primary)',
                boxShadow: '0 0 8px var(--color-primary)',
                animation: 'scanLine 2s ease-in-out infinite',
              }} />
            </div>

            <p style={{ color: 'white', fontSize: 14, marginTop: 20, zIndex: 1, opacity: 0.9 }}>
              Point camera at a barcode
            </p>
          </div>
        )}

        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
          }}>
            <div style={{
              width: 48, height: 48,
              border: '3px solid rgba(255,255,255,0.2)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              marginBottom: 12,
            }} />
            <p style={{ color: 'white', fontSize: 14 }}>Looking up product...</p>
          </div>
        )}

        {status === 'error' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 32, gap: 16,
          }}>
            <span style={{ fontSize: 48 }}>📷</span>
            <p style={{ color: 'white', textAlign: 'center', fontSize: 15, lineHeight: 1.5 }}>{errorMsg}</p>
            <button
              className="btn btn-primary"
              onClick={onClose}
            >
              Go back
            </button>
          </div>
        )}

        {/* Top controls */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '16px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: 20,
              color: 'white', padding: '6px 14px',
              fontSize: 14, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            ✕ Cancel
          </button>
          <button
            onClick={toggleTorch}
            style={{
              background: torchOn ? 'rgba(255,220,0,0.3)' : 'rgba(255,255,255,0.15)',
              border: 'none', borderRadius: 20,
              color: 'white', padding: '6px 14px',
              fontSize: 14, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {torchOn ? '🔦 On' : '🔦 Off'}
          </button>
        </div>
      </div>

      {/* Product result sheet */}
      {status === 'found' && scannedProduct && (
        <ProductResultSheet
          product={scannedProduct}
          onConfirm={onResult}
          onRescan={handleRescan}
          onClose={onClose}
        />
      )}

      <style>{`
        @keyframes scanLine {
          0% { top: 4px; }
          50% { top: calc(100% - 6px); }
          100% { top: 4px; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function ProductResultSheet({ product, onConfirm, onRescan, onClose }) {
  const [form, setForm] = useState({
    name: product.name || '',
    brand: product.brand || '',
    category: product.category || 'other',
    quantity: product.quantity || 1,
    unit: product.unit || 'units',
    lowStockThreshold: 1,
    expiryDate: '',
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const notFound = !product.name

  const handleConfirm = () => {
    onConfirm({
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      category: form.category,
      quantity: parseFloat(form.quantity) || 1,
      unit: form.unit,
      lowStockThreshold: parseFloat(form.lowStockThreshold) || 1,
      expiryDate: form.expiryDate || undefined,
      barcode: product.barcode,
      source: 'barcode',
    })
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '20px 20px 0 0',
      padding: '20px 20px 32px',
      maxHeight: '75vh',
      overflowY: 'auto',
      animation: 'slideUp 0.2s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
            {notFound ? 'Barcode scanned' : 'Product found!'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {notFound ? 'Product not in database — fill in details' : 'Confirm or edit before adding'}
          </p>
        </div>
        <span style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600,
          background: notFound ? 'var(--color-low-stock-bg)' : 'var(--color-primary-light)',
          color: notFound ? 'var(--color-low-stock)' : 'var(--color-primary)',
        }}>
          {notFound ? '⚠ Not found' : '✓ Matched'}
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">Item name *</label>
        <input
          className="form-input"
          placeholder="e.g. Oat Milk"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          autoFocus={notFound}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Brand</label>
        <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Optional" />
      </div>

      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <input className="form-input" type="number" min="0" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Unit</label>
          <input className="form-input" value={form.unit} onChange={e => set('unit', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
          <label className="form-label">Low stock alert</label>
          <input className="form-input" type="number" min="0" step="any" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Expiry date</label>
          <input className="form-input" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button className="btn btn-ghost" style={{ flex: 0 }} onClick={onRescan}>
          🔄 Rescan
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleConfirm}
          disabled={!form.name.trim()}
        >
          Add to Pantry
        </button>
      </div>
    </div>
  )
}
