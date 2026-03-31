import { v4 as uuid } from 'uuid'

export function applyActions(state, actions) {
  let next = { ...state, pantry: [...state.pantry], shoppingList: [...state.shoppingList] }

  for (const action of actions) {
    switch (action.type) {
      case 'ADD_TO_SHOPPING_LIST':
        // Avoid duplicate names
        const exists = next.shoppingList.find(
          i => i.name.toLowerCase() === action.item.name.toLowerCase()
        )
        if (!exists) {
          next.shoppingList = [
            ...next.shoppingList,
            {
              ...action.item,
              id: uuid(),
              checked: false,
              addedBy: 'ai',
              addedAt: new Date().toISOString()
            }
          ]
        }
        break

      case 'UPDATE_PANTRY_ITEM':
        next.pantry = next.pantry.map(i =>
          i.id === action.id
            ? { ...i, ...action.changes, lastUpdatedAt: new Date().toISOString() }
            : i
        )
        break

      case 'REMOVE_FROM_PANTRY':
        next.pantry = next.pantry.filter(i => i.id !== action.id)
        break

      case 'ADD_TO_PANTRY':
        next.pantry = [
          ...next.pantry,
          {
            ...action.item,
            id: uuid(),
            addedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString()
          }
        ]
        break

      case 'REMOVE_FROM_SHOPPING_LIST':
        next.shoppingList = next.shoppingList.filter(i => i.id !== action.id)
        break

      case 'CHECK_SHOPPING_ITEM':
        next.shoppingList = next.shoppingList.map(i =>
          i.id === action.id ? { ...i, checked: action.checked } : i
        )
        break

      default:
        break
    }
  }

  return next
}
