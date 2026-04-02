import { getSystemPrompt } from '../constants.js'

export async function callAssistant(userMessage, appState, conversationHistory, lang = 'en') {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY in .env')

  const contextBlock = `## Current App State
\`\`\`json
${JSON.stringify(appState, null, 2)}
\`\`\``

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: getSystemPrompt(lang),
      messages: [
        ...conversationHistory,
        {
          role: 'user',
          content: `${contextBlock}\n\nUser: ${userMessage}`
        }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  return parseAssistantResponse(data.content[0].text)
}

export function parseAssistantResponse(text) {
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
  let actions = []
  if (jsonMatch) {
    try {
      actions = JSON.parse(jsonMatch[1]).actions || []
    } catch {
      actions = []
    }
  }
  const displayText = text.replace(/```json[\s\S]*?```/, '').trim()
  return { displayText, actions }
}
