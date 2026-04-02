import { writeFileSync, mkdirSync } from 'fs'

// Minimal valid 1x1 green PNG (placeholder — replace with proper icons later)
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

mkdirSync('public', { recursive: true })

writeFileSync('public/pwa-192x192.png', png1x1)
console.log('Generated public/pwa-192x192.png')

writeFileSync('public/pwa-512x512.png', png1x1)
console.log('Generated public/pwa-512x512.png')

writeFileSync('public/apple-touch-icon.png', png1x1)
console.log('Generated public/apple-touch-icon.png')
