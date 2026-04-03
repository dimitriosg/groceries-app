import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { CATEGORIES, PANTRY_UNITS } from '../constants.js'
import { useTranslation } from '../hooks/useTranslation.js'

// Optimised hints: only scan barcode formats relevant for food products
const SCAN_HINTS = new Map()
SCAN_HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,   // Most common for EU/Greek products
  BarcodeFormat.EAN_8,    // Smaller EU barcodes
  BarcodeFormat.UPC_A,    // US products
  BarcodeFormat.UPC_E,    // Compact US
  BarcodeFormat.CODE_128, // General purpose
])
SCAN_HINTS.set(DecodeHintType.TRY_HARDER, true)

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

function parseOFFProduct(p, barcode) {
  const { quantity, unit } = parseQuantity(p.quantity)
  return {
    name: p.product_name_el   // Greek name first
      || p.product_name
      || p.abbreviated_product_name
      || '',
    brand: p.brands ? p.brands.split(',')[0].trim() : undefined,
    category: mapCategory(p.categories || p.food_groups || ''),
    quantity,
    unit,
    barcode,
    source: 'openfoodfacts',
  }
}

function fetchWithTimeout(url, ms, signal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  signal?.addEventListener('abort', () => controller.abort())
  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timer))
}

async function lookupBarcode(barcode, pantry, signal) {
  // 1. Check local pantry first (instant, no network)
  const localMatch = (pantry || []).find(item => item.barcode === barcode)
  if (localMatch) {
    return {
      name: localMatch.name,
      brand: localMatch.brand,
      category: localMatch.category,
      quantity: localMatch.quantity,
      unit: localMatch.unit,
      barcode,
      source: 'local',
    }
  }

  // 2. Try Greek Open Food Facts first
  try {
    const grRes = await fetchWithTimeout(
      `https://gr.openfoodfacts.org/api/v0/product/${barcode}.json`,
      3000,
      signal
    )
    const grData = await grRes.json()
    if (grData.status === 1 && (grData.product?.product_name || grData.product?.product_name_el || grData.product?.abbreviated_product_name)) {
      return parseOFFProduct(grData.product, barcode)
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // 3. Fall back to global Open Food Facts
  try {
    const worldRes = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      4000,
      signal
    )
    const worldData = await worldRes.json()
    if (worldData.status === 1 && (worldData.product?.product_name || worldData.product?.product_name_el || worldData.product?.abbreviated_product_name)) {
      return parseOFFProduct(worldData.product, barcode)
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err
  }

  // 4. Not found anywhere
  return { name: '', brand: '', category: 'other', quantity: 1, unit: 'units', barcode, source: 'not_found' }
}

export default function BarcodeScanner({ onResult, onClose, pantry }) {
  const { t } = useTranslation()
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const controlsRef = useRef(null)
  const trackRef = useRef(null)
  const hasScanned = useRef(false)
  const pantryRef = useRef(pantry)
  const abortControllerRef = useRef(null)

  const [status, setStatus] = useState('scanning') // scanning | detected | searching | not_found_pause | found | error
  const [errorMsg, setErrorMsg] = useState('')
  const [scannedProduct, setScannedProduct] = useState(null)
  const [detectedBarcode, setDetectedBarcode] = useState(null)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => { pantryRef.current = pantry }, [pantry])

  const startCamera = useCallback(async () => {
    setTorchOn(false)
    trackRef.current = null

    try {
      const reader = new BrowserMultiFormatReader(SCAN_HINTS)
      readerRef.current = reader

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
          // Capture controls on first callback
          if (!controlsRef.current && ctrl) {
            controlsRef.current = ctrl
            const stream = videoRef.current?.srcObject
            if (stream) trackRef.current = stream.getVideoTracks()[0]
          }

          if (result && !hasScanned.current) {
            hasScanned.current = true
            const barcode = result.getText()

            setDetectedBarcode(barcode)
            setStatus('detected')

            // Stop camera immediately — before any async work
            controlsRef.current?.stop()
            const stream = videoRef.current?.srcObject
            if (stream) {
              stream.getTracks().forEach(track => track.stop())
              videoRef.current.srcObject = null
            }
            controlsRef.current = null
            trackRef.current = null

            // Let React render the detected state before network request
            await new Promise(resolve => requestAnimationFrame(resolve))
            setStatus('searching')

            abortControllerRef.current = new AbortController()

            try {
              const product = await lookupBarcode(
                barcode,
                pantryRef.current,
                abortControllerRef.current.signal
              )

              if (!product.name) {
                setScannedProduct(product)
                setStatus('not_found_pause')
                await new Promise(resolve => setTimeout(resolve, 1500))
              } else {
                setScannedProduct(product)
              }
              setStatus('found')
            } catch (err) {
              if (err.name === 'AbortError') return
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
    } catch (err) {
      setErrorMsg('Could not start camera. Try reloading the page.')
      setStatus('error')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    startCamera()
    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [startCamera])

  const handleScanAgain = () => {
    abortControllerRef.current?.abort()
    hasScanned.current = false
    setDetectedBarcode(null)
    setScannedProduct(null)
    setStatus('scanning')
    startCamera()
  }

  const toggleTorch = async () => {
    if (!trackRef.current) return
    try {
      await trackRef.current.applyConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn(v => !v)
    } catch {
      // torch not supported on this device
    }
  }

  const isSearching = status === 'searching' || status === 'not_found_pause'

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
        {/* Video — always in DOM for ZXing, hidden when not scanning */}
        <video
          ref={videoRef}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: (status === 'scanning' || status === 'detected') ? 'block' : 'none',
          }}
          muted
          playsInline
        />

        {/* Scan frame — scanning + detected states */}
        {(status === 'scanning' || status === 'detected') && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{
              position: 'relative',
              width: 260, height: 160,
              zIndex: 1,
              animation: status === 'detected' ? 'framePulse 0.6s ease-in-out infinite' : 'none',
            }}>
              {[
                { top: 0, left: 0, borderTop: '3px solid #22c55e', borderLeft: '3px solid #22c55e' },
                { top: 0, right: 0, borderTop: '3px solid #22c55e', borderRight: '3px solid #22c55e' },
                { bottom: 0, left: 0, borderBottom: '3px solid #22c55e', borderLeft: '3px solid #22c55e' },
                { bottom: 0, right: 0, borderBottom: '3px solid #22c55e', borderRight: '3px solid #22c55e' },
              ].map((style, i) => (
                <div key={i} style={{ position: 'absolute', width: 24, height: 24, ...style }} />
              ))}
              {status === 'scanning' && (
                <div style={{
                  position: 'absolute',
                  left: 4, right: 4,
                  height: 2,
                  background: 'var(--color-primary)',
                  boxShadow: '0 0 8px var(--color-primary)',
                  animation: 'scanLine 2s ease-in-out infinite',
                }} />
              )}
            </div>

            {status === 'detected' ? (
              <div style={{ zIndex: 1, textAlign: 'center', marginTop: 20 }}>
                <p style={{ color: '#22c55e', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                  {t('barcodeDetected')}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                  {detectedBarcode}
                </p>
              </div>
            ) : (
              <p style={{ color: 'white', fontSize: 14, marginTop: 20, zIndex: 1, opacity: 0.9 }}>
                {t('pointCameraAtBarcode')}
              </p>
            )}
          </div>
        )}

        {/* Searching / not_found_pause overlay */}
        {isSearching && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
          }}>
            <div style={{
              width: 48, height: 48,
              border: '3px solid rgba(255,255,255,0.2)',
              borderTop: '3px solid white',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
              marginBottom: 20,
            }} />
            <p style={{ color: 'white', fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {status === 'not_found_pause' ? t('barcodeNotFound') : t('barcodeSearching')}
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 12,
              fontFamily: 'monospace',
              marginBottom: 24,
              letterSpacing: '0.1em',
            }}>
              {detectedBarcode}
            </p>
            {status === 'searching' && (
              <button
                onClick={handleScanAgain}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 20,
                  color: 'white',
                  padding: '8px 20px',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {t('scanAgain')}
              </button>
            )}
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
            <button className="btn btn-primary" onClick={onClose}>Go back</button>
          </div>
        )}

        {/* Top controls — visible when not in found/error state */}
        {status !== 'found' && status !== 'error' && (
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
        )}
      </div>

      {/* Product result sheet */}
      {status === 'found' && scannedProduct && (
        <ProductResultSheet
          product={scannedProduct}
          onConfirm={onResult}
          onRescan={handleScanAgain}
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
        @keyframes framePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
    </div>
  )
}

function ProductResultSheet({ product, onConfirm, onRescan, onClose }) {
  const { t, tCat, tUnit } = useTranslation()
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
        <label className="form-label">{t('itemNameLabel')} *</label>
        <input
          className="form-input"
          placeholder="e.g. Oat Milk"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          autoFocus={notFound}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t('brandLabel')}</label>
        <input className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Optional" />
      </div>

      <div className="form-group">
        <label className="form-label">{t('categoryLabel')}</label>
        <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{tCat(cat)}</option>
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
            {[...new Set([...(form.unit ? [form.unit] : []), ...PANTRY_UNITS])].map(u => (
              <option key={u} value={u}>{tUnit(u)}</option>
            ))}
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
        <button className="btn btn-ghost" style={{ flex: 0 }} onClick={onRescan}>
          🔄 {t('scanAgain')}
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleConfirm}
          disabled={!form.name.trim()}
        >
          {t('addToPantryBtn')}
        </button>
      </div>
    </div>
  )
}
