import { useEffect, useState } from 'react'
import axios from 'axios'
import { ArrowDown, ArrowUp, Boxes, Check, ChevronDown, CircleHelp, LoaderCircle, LogOut, MoreHorizontal, PackagePlus, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import './App.css'

const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000/api').replace(/\/$/, '')
const SESSION_KEY = 'stockroom-session'
const CURRENCY = import.meta.env.VITE_CURRENCY || 'PHP'

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })
api.interceptors.request.use((config) => {
  const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
  if (session?.access_token) config.headers.Authorization = `Bearer ${session.access_token}`
  return config
})

function unwrapProducts(response) {
  const data = response?.data
  const rows = Array.isArray(data) ? data : data?.products ?? data?.data ?? data?.result ?? []
  return Array.isArray(rows) ? rows : []
}

function App() {
  const [session, setSession] = useState(() => JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'))
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [editingProduct, setEditingProduct] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!session?.access_token) return undefined
    let cancelled = false
    async function fetchInventory() {
      setLoading(true)
      try {
        const response = await api.get('/products')
        if (!cancelled) setProducts(unwrapProducts(response))
      } catch (requestError) {
        if (!cancelled) setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not load products. Check the API URL and connection.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchInventory()
    return () => { cancelled = true }
  }, [session])

  async function loadProducts() {
    setLoading(true)
    try {
      const response = await api.get('/products')
      setProducts(unwrapProducts(response))
    } finally {
      setLoading(false)
    }
  }

  async function handleAuthentication(event, mode) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const credentials = {
      username: form.get('username')?.trim(),
      email: form.get('email')?.trim(),
      password: form.get('password'),
    }
    if (mode === 'register' && credentials.password !== form.get('confirm_password')) {
      setError('The passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await api.post(`/auth/${mode}`, credentials)
      const tokens = response.data?.data
      if (!tokens?.access_token) throw new Error('The API did not return an access token.')
      const nextSession = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        username: response.data?.user?.username || credentials.username,
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.message || requestError.message || (mode === 'register' ? 'Account creation failed.' : 'Login failed.'))
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    if (session?.access_token) {
      api.post('/auth/logout', { refresh_token: session.refresh_token }, { headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => {})
    }
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
    setProducts([])
  }

  async function saveProduct(product) {
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, product)
        await loadProducts()
      } else {
        await api.post('/products', product)
        await loadProducts()
      }
      setDialogOpen(false)
      setEditingProduct(null)
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not save this product.')
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete “${product.product_name}”? This cannot be undone.`)) return
    try {
      await api.delete(`/products/${product.id}`)
      await loadProducts()
    } catch (requestError) {
      setError(requestError.response?.data?.error || requestError.response?.data?.message || 'Could not delete this product.')
    }
  }

  if (!session) return <LoginScreen onAuthenticate={handleAuthentication} busy={loading} error={error} />

  const filteredProducts = products
    .filter((product) => `${product.product_name} ${product.description}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sortOrder === 'newest' ? new Date(b.created_at) - new Date(a.created_at) : a.product_name.localeCompare(b.product_name))
  const inventoryValue = products.reduce((total, product) => total + Number(product.price) * Number(product.quantity), 0)
  const lowStock = products.filter((product) => Number(product.quantity) > 0 && Number(product.quantity) <= 10).length

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#inventory" aria-label="Stockroom home"><span className="brand-mark"><Boxes size={19} /></span><span>stockroom<span className="brand-period">.</span></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch"><span className="workspace-avatar">N</span><span className="workspace-copy"><strong>Northstar Goods</strong><small>Free workspace</small></span><ChevronDown size={15} /></button>
        <div className="nav-section-label">MANAGE</div>
        <a className="nav-item active" href="#inventory"><Boxes size={17} />Inventory<span className="nav-count">{products.length}</span></a>
        <div className="sidebar-bottom">
          <div className="help-line"><CircleHelp size={16} /><span>Need a hand?</span></div>
          <div className="profile-row"><div className="profile-avatar">{session.username?.charAt(0).toUpperCase() || 'U'}</div><span className="profile-copy"><strong>{session.username}</strong><small>Signed in</small></span><button className="icon-button logout-button" title="Log out" aria-label="Log out" onClick={logout}><LogOut size={16} /></button></div>
        </div>
      </aside>

      <section className="main-area" id="inventory">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Inventory</strong></div><div className="topbar-right"><span className="connection-pill live-pill"><span className="connection-dot" />API connected</span><span className="topbar-divider" /><button className="topbar-profile" title="Log out" onClick={logout}><span className="profile-avatar small">{session.username?.charAt(0).toUpperCase() || 'U'}</span><ChevronDown size={14} /></button></div></header>

        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow">CATALOG / 01</div><h1>Inventory</h1><p className="page-subtitle">A clear view of what you have and what needs attention.</p></div><button className="primary-button" onClick={() => { setEditingProduct(null); setDialogOpen(true) }}><Plus size={17} strokeWidth={2.4} />Add product</button></div>

          {error && <div className="error-banner" role="alert"><span>{error}</span><button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          <section className="metrics" aria-label="Inventory summary"><Metric label="PRODUCTS" value={products.length.toString().padStart(2, '0')} note="In your catalog" icon={<Boxes size={17} />} /><Metric label="IN STOCK VALUE" value={formatCurrency(inventoryValue)} note="Based on current quantity" icon={<Check size={17} />} /><Metric label="LOW STOCK" value={lowStock.toString().padStart(2, '0')} note="10 units or fewer" icon={<ArrowDown size={17} />} alert={lowStock > 0} /></section>

          <section className="inventory-section"><div className="section-heading"><div><h2>All products <span className="section-count">{products.length}</span></h2><p>Manage the items in your catalog.</p></div><button className="icon-button more-button" aria-label="More inventory options"><MoreHorizontal size={20} /></button></div>
            <div className="table-toolbar"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products..." aria-label="Search products" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}</label><button className="sort-button" onClick={() => setSortOrder(sortOrder === 'newest' ? 'name' : 'newest')}>{sortOrder === 'newest' ? 'Newest first' : 'Name A–Z'}{sortOrder === 'newest' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}</button></div>
            <div className="table-wrap"><table><thead><tr><th className="product-col">PRODUCT</th><th>PRICE</th><th>QUANTITY</th><th>STATUS</th><th className="date-col">ADDED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {loading ? <tr><td colSpan="6" className="table-state"><LoaderCircle className="spinner" size={20} />Loading inventory...</td></tr> : filteredProducts.length === 0 ? <tr><td colSpan="6" className="table-state"><span className="empty-icon"><PackagePlus size={20} /></span><strong>{query ? 'No matches found' : 'Your catalog is empty'}</strong><span>{query ? 'Try a different search.' : 'Add your first product to get started.'}</span></td></tr> : filteredProducts.map((product, index) => <ProductRow key={product.id} product={product} index={index} onEdit={() => { setEditingProduct(product); setDialogOpen(true) }} onDelete={() => deleteProduct(product)} />)}
            </tbody></table></div>
            <footer className="table-footer"><span>Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products</span><span><ShieldCheck size={14} /> Protected inventory</span></footer>
          </section>
          <div className="page-footnote"><span>STOCKROOM INVENTORY</span><span>LAST SYNCED JUST NOW</span></div>
        </div>
      </section>
      {dialogOpen && <ProductDialog product={editingProduct} onClose={() => { setDialogOpen(false); setEditingProduct(null) }} onSave={saveProduct} />}
    </main>
  )
}

function LoginScreen({ onAuthenticate, busy, error }) {
  const [mode, setMode] = useState('login')
  const registering = mode === 'register'

  return (
    <main className="login-shell">
      <div className="login-art">
        <div className="login-art-top"><a className="brand light-brand" href="#"><span className="brand-mark"><Boxes size={19} /></span><span>stockroom<span className="brand-period">.</span></span></a><span className="art-index">INVENTORY / 06</span></div>
        <div className="art-copy"><div className="art-rule" /><p>GOOD THINGS,<br />IN THEIR PLACE.</p><span>A quieter way to keep track of what you make, move, and sell.</span></div>
        <div className="art-bottom"><div className="art-bars">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div><span>PRODUCT MANAGEMENT, MADE CLEAR</span></div>
      </div>
      <section className="login-panel">
        <div className="login-form-wrap"><div className="login-kicker">YOUR WORKSPACE</div><h1>{registering ? 'Create account.' : 'Welcome back.'}</h1><p className="login-intro">{registering ? 'Create an account to manage the product inventory.' : 'Sign in with your account to manage inventory.'}</p>
          <form className="login-form" onSubmit={(event) => onAuthenticate(event, mode)}>
            <label>Username<input required type="text" name="username" autoComplete="username" minLength="3" maxLength="100" placeholder="Choose a username" /></label>
            {registering && <label>Email<input required type="email" name="email" autoComplete="email" maxLength="255" placeholder="you@example.com" /></label>}
            <label>Password<input required type="password" name="password" autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 8 : undefined} placeholder={registering ? 'At least 8 characters' : 'Enter your password'} /></label>
            {registering && <label>Confirm password<input required type="password" name="confirm_password" autoComplete="new-password" minLength="8" placeholder="Enter your password again" /></label>}
            {error && <div className="login-error" role="alert">{error}</div>}
            <button className="primary-button login-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spinner" size={16} /> : null}{registering ? 'Create account' : 'Sign in'} <ArrowUp size={15} /></button>
          </form>
          <p className="auth-switch">{registering ? 'Already have an account?' : 'New to Stockroom?'} <button type="button" onClick={() => setMode(registering ? 'login' : 'register')}>{registering ? 'Sign in' : 'Create account'}</button></p>
          <div className="login-secure"><ShieldCheck size={15} /><span>Authenticated through LavaLust API</span></div>
        </div>
        <footer className="login-footer"><span>STOCKROOM © 2026</span><span>PRIVATE BY DESIGN</span></footer>
      </section>
    </main>
  )
}

function Metric({ label, value, note, icon, alert }) {
  return <article className={`metric ${alert ? 'metric-alert' : ''}`}><div className="metric-top"><span>{label}</span><span className="metric-icon">{icon}</span></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></article>
}

function ProductRow({ product, index, onEdit, onDelete }) {
  const quantity = Number(product.quantity)
  const status = quantity === 0 ? 'Out of stock' : quantity <= 10 ? 'Low stock' : 'In stock'
  return <tr style={{ '--row-index': index }}><td><div className="product-cell"><div className={`product-thumb thumb-${index % 4}`}><PackagePlus size={19} strokeWidth={1.65} /></div><span><strong>{product.product_name}</strong><small>{product.description || 'No description'}</small></span></div></td><td className="price-cell">{formatCurrency(product.price)}</td><td><span className="quantity-cell">{quantity.toString().padStart(2, '0')} <small>units</small></span></td><td><span className={`stock-status ${quantity === 0 ? 'status-out' : quantity <= 10 ? 'status-low' : 'status-in'}`}><i />{status}</span></td><td className="date-cell">{product.created_at ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(product.created_at)) : '—'}</td><td><div className="row-actions"><button className="icon-button" title="Edit product" aria-label={`Edit ${product.product_name}`} onClick={onEdit}><Pencil size={15} /></button><button className="icon-button delete-action" title="Delete product" aria-label={`Delete ${product.product_name}`} onClick={onDelete}><Trash2 size={15} /></button></div></td></tr>
}

function ProductDialog({ product, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    const values = new FormData(event.currentTarget)
    await onSave({ product_name: values.get('product_name').trim(), description: values.get('description').trim(), price: Number(values.get('price')), quantity: Number(values.get('quantity')) })
    setSaving(false)
  }
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><header><div><span className="dialog-kicker">CATALOG ITEM</span><h2 id="dialog-title">{product ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></header><form onSubmit={submit}><label>Product name<input name="product_name" required maxLength="100" defaultValue={product?.product_name || ''} placeholder="e.g. Studio headphones" /></label><label>Description<textarea name="description" rows="3" required defaultValue={product?.description || ''} placeholder="A short description of this item" /></label><div className="form-grid"><label>Price<input name="price" type="number" min="0" step="0.01" required defaultValue={product?.price ?? ''} placeholder="0.00" /></label><label>Quantity<input name="quantity" type="number" min="0" step="1" required defaultValue={product?.quantity ?? ''} placeholder="0" /></label></div><footer><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving && <LoaderCircle className="spinner" size={15} />}{product ? 'Save changes' : 'Add product'}</button></footer></form></section></div>
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY }).format(Number(value) || 0)
}

export default App
