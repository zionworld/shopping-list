import { useEffect, useMemo, useState } from 'react'
import { Plus, Check, Trash2, ShoppingCart, History, X } from 'lucide-react'

type Item = {
  id: string
  name: string
  quantity: number
  expectedPrice: number
  actualPrice?: number
  purchased: boolean
  category?: string
}

type ShoppingList = {
  id: string
  name: string
  items: Item[]
}

type TripHistory = {
  id: string
  listName: string
  date: string
  expectedTotal: number
  actualTotal: number
  items: Item[]
}

const seedLists: ShoppingList[] = [
  { id: 'groceries', name: 'Groceries', items: [] },
  { id: 'costco', name: 'Costco', items: [] },
  { id: 'home-depot', name: 'Home Depot', items: [] },
]

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
})

function App() {
  const [lists, setLists] = useState<ShoppingList[]>(() => {
    const saved = localStorage.getItem('shopping-lists')
    return saved ? JSON.parse(saved) : seedLists
  })

  const [history, setHistory] = useState<TripHistory[]>(() => {
    const saved = localStorage.getItem('shopping-history')
    return saved ? JSON.parse(saved) : []
  })

  const [activeListId, setActiveListId] = useState(lists[0]?.id ?? 'groceries')
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [expectedPrice, setExpectedPrice] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    localStorage.setItem('shopping-lists', JSON.stringify(lists))
  }, [lists])

  useEffect(() => {
    localStorage.setItem('shopping-history', JSON.stringify(history))
  }, [history])

  const activeList = lists.find(l => l.id === activeListId) ?? lists[0]

  const expectedTotal = useMemo(() => {
    return activeList?.items.reduce((sum, item) => sum + item.expectedPrice * item.quantity, 0) ?? 0
  }, [activeList])

  const actualTotal = useMemo(() => {
    return activeList?.items.reduce((sum, item) => {
      if (!item.purchased) return sum
      const unit = item.actualPrice ?? item.expectedPrice
      return sum + unit * item.quantity
    }, 0) ?? 0
  }, [activeList])

  const purchasedCount = activeList?.items.filter(i => i.purchased).length ?? 0

  function updateActiveList(fn: (list: ShoppingList) => ShoppingList) {
    setLists(prev => prev.map(list => list.id === activeListId ? fn(list) : list))
  }

  function addItem() {
    const trimmed = itemName.trim()
    const price = Number(expectedPrice)
    if (!trimmed || Number.isNaN(price) || price < 0) return

    const newItem: Item = {
      id: crypto.randomUUID(),
      name: trimmed,
      quantity: Math.max(1, quantity),
      expectedPrice: price,
      purchased: false,
      category: category.trim() || undefined,
    }

    updateActiveList(list => ({ ...list, items: [newItem, ...list.items] }))
    setItemName('')
    setQuantity(1)
    setExpectedPrice('')
    setCategory('')
  }

  function togglePurchased(itemId: string) {
    updateActiveList(list => ({
      ...list,
      items: list.items.map(item =>
        item.id === itemId ? { ...item, purchased: !item.purchased } : item
      ),
    }))
  }

  function updateActualPrice(itemId: string, value: string) {
    const num = value === '' ? undefined : Number(value)
    updateActiveList(list => ({
      ...list,
      items: list.items.map(item =>
        item.id === itemId
          ? { ...item, actualPrice: num !== undefined && !Number.isNaN(num) ? num : undefined }
          : item
      ),
    }))
  }

  function removeItem(itemId: string) {
    updateActiveList(list => ({
      ...list,
      items: list.items.filter(item => item.id !== itemId),
    }))
  }

  function addList() {
    const trimmed = newListName.trim()
    if (!trimmed) return
    const id = crypto.randomUUID()
    setLists(prev => [...prev, { id, name: trimmed, items: [] }])
    setActiveListId(id)
    setNewListName('')
    setShowNewList(false)
  }

  function finishShopping() {
    if (!activeList || activeList.items.length === 0) return

    const trip: TripHistory = {
      id: crypto.randomUUID(),
      listName: activeList.name,
      date: new Date().toISOString(),
      expectedTotal,
      actualTotal,
      items: activeList.items,
    }

    setHistory(prev => [trip, ...prev])
    updateActiveList(list => ({
      ...list,
      items: list.items.filter(item => !item.purchased),
    }))
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Personal shopping assistant</p>
          <h1>My Shopping List</h1>
        </div>
        <button className="icon-button" onClick={() => setShowHistory(true)} aria-label="View history">
          <History size={20} />
        </button>
      </header>

      <main>
        <section className="list-tabs">
          {lists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className={list.id === activeListId ? 'tab active' : 'tab'}
            >
              {list.name}
            </button>
          ))}
          <button className="tab add-tab" onClick={() => setShowNewList(true)}>
            <Plus size={16} /> New
          </button>
        </section>

        <section className="summary-card">
          <div>
            <span>Expected</span>
            <strong>{currency.format(expectedTotal)}</strong>
          </div>
          <div>
            <span>Actual so far</span>
            <strong>{currency.format(actualTotal)}</strong>
          </div>
          <div>
            <span>Purchased</span>
            <strong>{purchasedCount}/{activeList?.items.length ?? 0}</strong>
          </div>
        </section>

        <section className="add-card">
          <h2>Add item</h2>
          <div className="form-grid">
            <input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="Milk"
              onKeyDown={e => e.key === 'Enter' && addItem()}
            />
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
              placeholder="Qty"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={expectedPrice}
              onChange={e => setExpectedPrice(e.target.value)}
              placeholder="Expected price"
            />
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Category (optional)"
            />
          </div>
          <button className="primary-button" onClick={addItem}>
            <Plus size={18} /> Add to {activeList?.name}
          </button>
        </section>

        <section className="items-section">
          <div className="section-heading">
            <h2>{activeList?.name}</h2>
            <span>{activeList?.items.length ?? 0} items</span>
          </div>

          {activeList?.items.length ? (
            <div className="items-list">
              {activeList.items.map(item => (
                <article key={item.id} className={item.purchased ? 'item-card purchased' : 'item-card'}>
                  <button
                    className={item.purchased ? 'check-button checked' : 'check-button'}
                    onClick={() => togglePurchased(item.id)}
                    aria-label={`Mark ${item.name} ${item.purchased ? 'not purchased' : 'purchased'}`}
                  >
                    {item.purchased && <Check size={18} />}
                  </button>

                  <div className="item-main">
                    <div className="item-title-row">
                      <div>
                        <h3>{item.name}</h3>
                        <p>
                          Qty {item.quantity} · Expected {currency.format(item.expectedPrice)} each
                          {item.category ? ` · ${item.category}` : ''}
                        </p>
                      </div>
                      <button className="delete-button" onClick={() => removeItem(item.id)}>
                        <Trash2 size={17} />
                      </button>
                    </div>

                    {item.purchased && (
                      <label className="actual-price">
                        Actual price each
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.actualPrice ?? ''}
                          onChange={e => updateActualPrice(item.id, e.target.value)}
                          placeholder={item.expectedPrice.toFixed(2)}
                        />
                      </label>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ShoppingCart size={36} />
              <h3>Your list is empty</h3>
              <p>Add your first item above.</p>
            </div>
          )}
        </section>

        <button
          className="finish-button"
          disabled={!activeList?.items.some(i => i.purchased)}
          onClick={finishShopping}
        >
          Finish shopping
        </button>
      </main>

      {showNewList && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-heading">
              <h2>Create a list</h2>
              <button className="icon-button" onClick={() => setShowNewList(false)}><X size={20} /></button>
            </div>
            <input
              autoFocus
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              placeholder="Example: Walmart"
              onKeyDown={e => e.key === 'Enter' && addList()}
            />
            <button className="primary-button" onClick={addList}>Create list</button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="modal-backdrop">
          <div className="modal history-modal">
            <div className="modal-heading">
              <h2>Shopping history</h2>
              <button className="icon-button" onClick={() => setShowHistory(false)}><X size={20} /></button>
            </div>

            {history.length ? history.map(trip => (
              <div className="history-card" key={trip.id}>
                <div>
                  <strong>{trip.listName}</strong>
                  <p>{new Date(trip.date).toLocaleDateString('en-CA')}</p>
                </div>
                <div className="history-totals">
                  <span>Expected {currency.format(trip.expectedTotal)}</span>
                  <strong>Actual {currency.format(trip.actualTotal)}</strong>
                </div>
              </div>
            )) : (
              <p className="history-empty">No completed shopping trips yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
