import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, Input, Text } from '@fluentui/react-components'
import { HomeRegular, MailRegular, PersonRegular } from '@fluentui/react-icons'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { api, type Vehicle } from './api'
import type { SupportedCurrency } from './api/types'

const ADMIN_EMAIL = 'admin@starterdealership.test'
const ADMIN_PASSWORD = 'Admin123!'
const ADMIN_STORAGE_KEY = 'starter-dealership-admin'
const FALLBACK_VEHICLE_IMAGE = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80'
const CURRENCY_OPTIONS = ['USD', 'NGN', 'EUR', 'GBP', 'AED', 'ZAR', 'CAD', 'JPY'] as const
const CATEGORY_OPTIONS = ['SUV', 'Sedan', 'Truck', 'Coupe', 'Hatchback', 'Van', 'Wagon', 'Convertible', 'Luxury']

type ExchangeRates = Record<string, number>

function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>({ NGN: 1 })
  const [updatedAt, setUpdatedAt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    fetch('https://open.er-api.com/v6/latest/NGN', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Exchange rates are unavailable.')
        return response.json() as Promise<{ result: string; base_code: string; time_last_update_utc: string; rates: ExchangeRates }>
      })
      .then((result) => {
        if (result.result !== 'success' || result.base_code !== 'NGN' || !result.rates) {
          throw new Error('Exchange rates returned an unexpected response.')
        }
        setRates(result.rates)
        setUpdatedAt(new Date(result.time_last_update_utc).toLocaleString())
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Exchange rates are unavailable.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { rates, updatedAt, isLoading, error }
}

function convertPrice(price: number, sourceCurrency: string, targetCurrency: SupportedCurrency, rates: ExchangeRates) {
  const sourceRate = rates[sourceCurrency]
  const targetRate = rates[targetCurrency]
  if (!sourceRate || !targetRate) return null
  return (price / sourceRate) * targetRate
}

function formatPrice(price: number, sourceCurrency: string, targetCurrency: SupportedCurrency, rates: ExchangeRates) {
  const convertedPrice = convertPrice(price, sourceCurrency, targetCurrency, rates)
  if (convertedPrice === null) return `${sourceCurrency} ${price.toLocaleString()}`

  return new Intl.NumberFormat(targetCurrency === 'NGN' ? 'en-NG' : 'en-US', {
    style: 'currency',
    currency: targetCurrency,
    maximumFractionDigits: 0,
  }).format(convertedPrice)
}

type VehicleFormState = {
  id: string
  vin: string
  year: string
  make: string
  model: string
  trim: string
  price: string
  mileage: string
  status: Vehicle['status']
  description: string
  category: string
  fuel: string
  location: string
  image: string
  deal: string
  currency: (typeof CURRENCY_OPTIONS)[number]
}

const getVehicleImage = (vehicle?: Pick<Vehicle, 'image'> | null) => {
  const candidate = vehicle?.image?.trim()
  return candidate && candidate.length > 0 ? candidate : FALLBACK_VEHICLE_IMAGE
}

const createEmptyForm = (): VehicleFormState => ({
  id: '',
  vin: '',
  year: new Date().getFullYear().toString(),
  make: '',
  model: '',
  trim: '',
  price: '',
  mileage: '',
  status: 'Available',
  description: '',
  category: '',
  fuel: '',
  location: '',
  image: '',
  deal: '',
  currency: 'NGN',
})

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>('NGN')
  const exchangeRates = useExchangeRates()
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ADMIN_STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_STORAGE_KEY, String(isAdmin))
    }
  }, [isAdmin])

  const navItems = [
    { to: '/', label: 'Home', icon: HomeRegular },
    { to: '/inventory', label: 'Inventory' },
    { to: '/contact', label: 'Contact', icon: MailRegular },
    { to: '/admin', label: isAdmin ? 'Admin' : 'Admin login', icon: PersonRegular },
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">SD</div>
          <div>
            <Text as="span" size={300} weight="semibold">Starter Dealership</Text>
            <div className="brand-subtitle">Premium vehicles</div>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
              {Icon ? <Icon /> : null}
              {label}
            </NavLink>
          ))}
        </nav>

        {isAdmin ? (
          <Button appearance="secondary" onClick={() => setIsAdmin(false)}>Sign out</Button>
        ) : (
          <Link to="/contact?intent=test-drive" className="topbar-action-link">Book a test drive</Link>
        )}
      </header>

      <main className="page-shell">
        <Routes>
          <Route path="/" element={<HomePage displayCurrency={displayCurrency} exchangeRates={exchangeRates.rates} />} />
          <Route path="/inventory" element={<InventoryPage
            displayCurrency={displayCurrency}
            setDisplayCurrency={setDisplayCurrency}
            exchangeRates={exchangeRates.rates}
            ratesUpdatedAt={exchangeRates.updatedAt}
            ratesLoading={exchangeRates.isLoading}
            ratesError={exchangeRates.error}
          />} />
          <Route path="/inventory/:vehicleId" element={<VehicleDetailPage displayCurrency={displayCurrency} exchangeRates={exchangeRates.rates} />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin" element={isAdmin ? <AdminPage /> : <AdminLoginPage onLogin={() => setIsAdmin(true)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function AdminLoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalizedEmail = email.trim()
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    const credentialsMatch = normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD
    setEmail('')
    setPassword('')

    if (!normalizedEmail || !emailIsValid || !password) {
      setError(!normalizedEmail ? 'Enter your email address.' : !emailIsValid ? 'Enter a valid email address.' : 'Enter your password.')
      return
    }

    if (credentialsMatch) {
      onLogin()
      return
    }

    setError('The email or password was not recognized. Please try again.')
  }

  return (
    <section className="admin-login-page">
      <div className="admin-login-visual" role="img" aria-label="Premium vehicle at the dealership">
        <div className="admin-login-visual-copy">
          <span className="admin-login-kicker">STAFF PORTAL</span>
          <h1>Good inventory starts here.</h1>
          <p>Keep your vehicle listings accurate, current, and ready for every customer.</p>
        </div>
      </div>

      <div className="admin-login-panel">
        <div className="admin-login-heading">
          <span className="admin-login-mark"><PersonRegular /></span>
          <span className="eyebrow">Dealership operations</span>
          <h2>Welcome back</h2>
          <p>Sign in with your staff account to manage inventory.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form" noValidate>
          <div className="admin-field">
            <label htmlFor="admin-email">Email address</label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(_, data) => setEmail(data.value)}
              placeholder="name@dealership.com"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">Password</label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(_, data) => setPassword(data.value)}
              placeholder="Enter your password"
            />
          </div>
          {error ? <div className="admin-login-error" role="alert">{error}</div> : null}
          <Button appearance="primary" type="submit" className="admin-login-submit">Sign in to admin</Button>
        </form>

        <div className="admin-login-footer">
          <span>Authorized dealership staff only</span>
          <Link to="/inventory">Return to inventory</Link>
        </div>
      </div>
    </section>
  )
}

function HomePage({ displayCurrency, exchangeRates }: { displayCurrency: SupportedCurrency; exchangeRates: ExchangeRates }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  useEffect(() => {
    api.getVehicles().then(setVehicles)
  }, [])

  const featured = useMemo(() => vehicles.slice(0, 3), [vehicles])

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">New season arrivals</span>
          <h1>Drive the next chapter with confidence.</h1>
          <p>
            Shop certified, market-ready vehicles with transparent pricing, premium financing,
            and a service team that keeps your next move simple.
          </p>
          <div className="cta-row">
            <Link to="/inventory" className="primary-button">Browse inventory</Link>
            <Link to="/contact" className="secondary-button">Speak with sales</Link>
          </div>
          <div className="hero-metrics">
            <div>
              <strong>4.9/5</strong>
              <span>Customer rating</span>
            </div>
            <div>
              <strong>180+</strong>
              <span>Vehicles ready</span>
            </div>
            <div>
              <strong>24h</strong>
              <span>Trade-in turnaround</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <img
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80"
            alt="Luxury SUV on a city road"
          />
        </div>
      </section>

      <section className="content-section">
        <div className="section-header">
          <div>
            <span className="eyebrow">Featured deals</span>
            <h2>Handpicked for your next upgrade</h2>
          </div>
          <Link to="/inventory" className="inline-link">View all vehicles</Link>
        </div>

        <div className="vehicle-grid">
          {featured.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} displayCurrency={displayCurrency} exchangeRates={exchangeRates} />
          ))}
        </div>
      </section>
    </div>
  )
}

function InventoryPage({
  displayCurrency,
  setDisplayCurrency,
  exchangeRates,
  ratesUpdatedAt,
  ratesLoading,
  ratesError,
}: {
  displayCurrency: SupportedCurrency
  setDisplayCurrency: (currency: SupportedCurrency) => void
  exchangeRates: ExchangeRates
  ratesUpdatedAt: string
  ratesLoading: boolean
  ratesError: string
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [minimumPrice, setMinimumPrice] = useState('')
  const [maximumPrice, setMaximumPrice] = useState('')

  useEffect(() => {
    api.getVehicles().then(setVehicles)
  }, [])

  const categories = useMemo(() => Array.from(new Set(vehicles
    .map((vehicle) => vehicle.category.trim())
    .filter(Boolean))).sort((left, right) => left.localeCompare(right)), [vehicles])

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    const minimum = minimumPrice === '' ? null : Number(minimumPrice)
    const maximum = maximumPrice === '' ? null : Number(maximumPrice)

    return vehicles.filter((vehicle) => {
      const searchableText = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} ${vehicle.vin}`.toLocaleLowerCase()
      if (normalizedSearch && !searchableText.includes(normalizedSearch)) return false
      if (selectedStatus && vehicle.status !== selectedStatus) return false
      if (selectedCategory && vehicle.category.trim().toLocaleLowerCase() !== selectedCategory.toLocaleLowerCase()) return false

      if (minimum !== null || maximum !== null) {
        const convertedPrice = convertPrice(vehicle.price, vehicle.currency, displayCurrency, exchangeRates)
        if (convertedPrice === null || (minimum !== null && convertedPrice < minimum) || (maximum !== null && convertedPrice > maximum)) return false
      }

      return true
    })
  }, [vehicles, search, selectedStatus, selectedCategory, minimumPrice, maximumPrice, displayCurrency, exchangeRates])

  return (
    <div className="page-stack">
      <section className="content-section">
        <div className="section-header">
          <div>
            <span className="eyebrow">Inventory</span>
            <h2>New and certified options</h2>
          </div>
        </div>

        <div className="inventory-controls row-surface">
          <label className="inventory-control inventory-search">
            <span>Search inventory</span>
            <Input value={search} onChange={(_, data) => setSearch(data.value)} placeholder="Make, model, year, or VIN" />
          </label>
          <label className="inventory-control">
            <span>Category</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="inventory-control">
            <span>Status</span>
            <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="Available">Available</option>
              <option value="Pending">Pending</option>
              <option value="Low Stock">Low Stock</option>
            </select>
          </label>
          <label className="inventory-control">
            <span>Display currency</span>
            <select value={displayCurrency} onChange={(event) => setDisplayCurrency(event.target.value as SupportedCurrency)}>
              {CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </label>
          <label className="inventory-control">
            <span>Minimum price ({displayCurrency})</span>
            <Input type="number" min="0" value={minimumPrice} onChange={(_, data) => setMinimumPrice(data.value)} placeholder="No minimum" disabled={ratesLoading || Boolean(ratesError)} />
          </label>
          <label className="inventory-control">
            <span>Maximum price ({displayCurrency})</span>
            <Input type="number" min="0" value={maximumPrice} onChange={(_, data) => setMaximumPrice(data.value)} placeholder="No maximum" disabled={ratesLoading || Boolean(ratesError)} />
          </label>
          <div className="inventory-filter-footer">
            <span>Showing {filteredVehicles.length} of {vehicles.length} vehicles</span>
            <Button appearance="subtle" onClick={() => {
              setSearch('')
              setSelectedStatus('')
              setSelectedCategory('')
              setMinimumPrice('')
              setMaximumPrice('')
            }}>Clear filters</Button>
          </div>
          <p className={`exchange-rate-note${ratesError ? ' has-error' : ''}`} role="status">
            {ratesLoading ? 'Loading live exchange rates…' : ratesError ? 'Live rates unavailable. Prices remain in each vehicle’s listed currency.' : `Prices converted using live NGN exchange rates${ratesUpdatedAt ? `, updated ${ratesUpdatedAt}` : ''}.`}
          </p>
        </div>

        <div className="vehicle-grid vehicle-grid-large">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} displayCurrency={displayCurrency} exchangeRates={exchangeRates} />
          ))}
        </div>
        {filteredVehicles.length === 0 ? <p className="inventory-empty-state">No vehicles match those filters. Try changing or clearing your search.</p> : null}
      </section>
    </div>
  )
}

function VehicleDetailPage({ displayCurrency, exchangeRates }: { displayCurrency: SupportedCurrency; exchangeRates: ExchangeRates }) {
  const { vehicleId } = useParams()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)

  useEffect(() => {
    if (!vehicleId) return
    api.getVehicleById(vehicleId).then((nextVehicle) => setVehicle(nextVehicle ?? null))
  }, [vehicleId])

  if (!vehicle) {
    return <div className="page-state">Loading vehicle details…</div>
  }

  const displayPrice = formatPrice(vehicle.price, vehicle.currency, displayCurrency, exchangeRates)
  const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`
  const openInquiry = (intent: 'financing' | 'sales') => {
    const params = new URLSearchParams({ intent, vehicle: vehicleLabel, source: 'inventory' })
    navigate(`/contact?${params.toString()}`)
  }

  return (
    <div className="page-stack">
      <section className="detail-layout">
        <div className="detail-media">
          <img
            src={getVehicleImage(vehicle)}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            onError={(event) => {
              event.currentTarget.src = FALLBACK_VEHICLE_IMAGE
              event.currentTarget.onerror = null
            }}
          />
        </div>

        <div className="detail-body">
          <span className="eyebrow">{vehicle.deal}</span>
          <h2>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <div className="detail-price-row">
            <strong>{displayPrice}</strong>
            <span className="status-badge status-available">{vehicle.status}</span>
          </div>

          <p>{vehicle.description}</p>

          <div className="spec-grid">
            <div>
              <label>VIN</label>
              <strong>{vehicle.vin}</strong>
            </div>
            <div>
              <label>Mileage</label>
              <strong>{vehicle.mileage.toLocaleString()} mi</strong>
            </div>
            <div>
              <label>Trim</label>
              <strong>{vehicle.trim}</strong>
            </div>
            <div>
              <label>Fuel</label>
              <strong>{vehicle.fuel}</strong>
            </div>
            <div>
              <label>Location</label>
              <strong>{vehicle.location}</strong>
            </div>
          </div>

          <div className="cta-row detail-actions">
            <Button appearance="primary" onClick={() => openInquiry('financing')}>Get financing</Button>
            <Button appearance="secondary" onClick={() => openInquiry('sales')}>Message sales</Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ContactPage() {
  const [searchParams] = useSearchParams()
  const intent = searchParams.get('intent')
  const isTestDriveRequest = intent === 'test-drive'
  const isFinancingRequest = intent === 'financing'
  const isSalesRequest = intent === 'sales'
  const formSource = searchParams.get('source') === 'inventory' ? 'inventory' : 'contact'
  const vehicleFromQuery = searchParams.get('vehicle') ?? ''
  const [requestSummary, setRequestSummary] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRequestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const vehicle = String(formData.get('vehicle') ?? '').trim()
    const date = String(formData.get('date') ?? '').trim()
    const message = String(formData.get('message') ?? '').trim()
    if (!name || !email) {
      setRequestError('Enter your name and email address to continue.')
      setRequestSummary('')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRequestError('Enter a valid email address to continue.')
      setRequestSummary('')
      return
    }

    setRequestError('')
    setRequestSummary('')
    setIsSubmitting(true)
    try {
      const result = await api.createInquiry({
        name,
        email,
        formSource,
        inquiryType: isTestDriveRequest ? 'test-drive' : isFinancingRequest ? 'financing' : 'sales',
        vehicle,
        preferredDate: date || null,
        message,
      })
      setRequestSummary(result.emailSent
        ? 'Your request was saved and emailed to the dealership.'
        : result.emailConfigured
          ? 'Your request was saved, but the email notification could not be sent. Please call to confirm.'
          : 'Your request was saved. Email notifications are not configured yet; please call to confirm.')
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'The request could not reach the server.'
      setRequestError(`We could not submit your request: ${detail}. Please try again or call the dealership.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-stack">
      <section className="contact-layout">
        <div className="row-surface contact-card">
          <span className="eyebrow">Visit us</span>
          <h2>123 Auto Lane, Downtown</h2>
          <p>Mon-Sat 9am-7pm</p>
          <p>(555) 014-2233</p>
        </div>

        <div className="row-surface contact-card">
          <span className="eyebrow">
            {isTestDriveRequest ? 'Test drive' : isFinancingRequest ? 'Financing' : 'Sales enquiry'}
          </span>
          <h2>
            {isTestDriveRequest ? 'Plan your visit' : isFinancingRequest ? 'Explore financing options' : isSalesRequest ? 'Message our sales team' : 'Ask a sales advisor'}
          </h2>
          <form key={searchParams.toString()} onSubmit={handleRequestSubmit} className="stacked-form" noValidate>
            <label className="contact-field">
              <span>Full name</span>
              <Input name="name" autoComplete="name" placeholder="Your name" />
            </label>
            <label className="contact-field">
              <span>Email address</span>
              <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
            </label>
            {isTestDriveRequest ? (
              <>
                <label className="contact-field">
                  <span>Vehicle of interest</span>
                  <Input name="vehicle" defaultValue={vehicleFromQuery} placeholder="Make and model" />
                </label>
                <label className="contact-field">
                  <span>Preferred date</span>
                  <Input name="date" type="date" />
                </label>
              </>
            ) : (
              <label className="contact-field">
                <span>Vehicle of interest</span>
                <Input name="vehicle" defaultValue={vehicleFromQuery} placeholder="Make and model" />
              </label>
            )}
            <label className="contact-field">
              <span>{isFinancingRequest ? 'Financing details' : isTestDriveRequest ? 'Additional details' : 'Your message'}</span>
              <textarea
                name="message"
                rows={4}
                placeholder={isFinancingRequest ? 'Share your preferred budget, down payment, or questions' : isTestDriveRequest ? 'Preferred time or questions' : 'Tell our sales team what you would like to know'}
              />
            </label>
            {requestError ? <div className="contact-form-error" role="alert">{requestError}</div> : null}
            <Button appearance="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : isTestDriveRequest ? 'Send test-drive request' : isFinancingRequest ? 'Send financing enquiry' : isSalesRequest ? 'Send sales message' : 'Send enquiry'}
            </Button>
          </form>
          {requestSummary ? <p className="contact-form-success" role="status">{requestSummary}</p> : null}
          <p className="contact-form-note">For urgent questions, call (555) 014-2233.</p>
        </div>
      </section>
    </div>
  )
}

function AdminPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [form, setForm] = useState<VehicleFormState>(createEmptyForm())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const categoryOptions = useMemo(() => Array.from(new Set([
    ...CATEGORY_OPTIONS,
    ...vehicles.map((vehicle) => vehicle.category.trim()).filter(Boolean),
  ])).sort((left, right) => left.localeCompare(right)), [vehicles])

  const loadVehicles = async () => {
    setVehicles(await api.getVehicles())
  }

  useEffect(() => {
    loadVehicles().catch(() => setError('Unable to load inventory.'))
  }, [])

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicleId(vehicle.id)
    setForm({
      id: vehicle.id,
      vin: vehicle.vin ?? '',
      year: String(vehicle.year),
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      price: String(vehicle.price),
      mileage: String(vehicle.mileage),
      status: vehicle.status,
      description: vehicle.description,
      category: vehicle.category,
      fuel: vehicle.fuel,
      location: vehicle.location,
      image: vehicle.image,
      deal: vehicle.deal,
      currency: (vehicle.currency as (typeof CURRENCY_OPTIONS)[number]) ?? 'USD',
    })
    setSelectedFile(null)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const payload = {
        make: form.make,
        model: form.model,
        year: Number(form.year),
        trim: form.trim,
        price: Number(form.price),
        mileage: Number(form.mileage),
        status: form.status,
        description: form.description,
        category: form.category,
        fuel: form.fuel,
        location: form.location,
        deal: form.deal,
        currency: form.currency,
        vin: form.vin || undefined,
      }

      let vehicleId = selectedVehicleId

      if (selectedVehicleId) {
        const updated = await api.updateVehicle(selectedVehicleId, payload)
        vehicleId = updated.id
      } else {
        const created = await api.createVehicle({ ...payload, image: form.image || '' })
        vehicleId = created.id
      }

      if (selectedFile && vehicleId) {
        await api.uploadVehiclePhoto(vehicleId, selectedFile)
      }

      setSelectedFile(null)
      setSelectedVehicleId(null)
      setForm(createEmptyForm())
      await loadVehicles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save vehicle.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (vehicleId: string) => {
    await api.deleteVehicle(vehicleId)
    setSelectedVehicleId(null)
    setForm(createEmptyForm())
    await loadVehicles()
  }

  return (
    <div className="page-stack">
      <section className="content-section">
        <div className="section-header">
          <div>
            <span className="eyebrow">Admin dashboard</span>
            <h2>Manage inventory</h2>
          </div>
          <Button appearance="secondary" onClick={() => {
            setSelectedVehicleId(null)
            setForm(createEmptyForm())
            setSelectedFile(null)
          }}>New vehicle</Button>
        </div>

        <div className="row-surface" style={{ padding: 20, marginBottom: 24 }}>
          <form onSubmit={handleSubmit} className="stacked-form">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Input value={form.make} onChange={(_, data) => setForm((current) => ({ ...current, make: data.value }))} placeholder="Make" />
              <Input value={form.model} onChange={(_, data) => setForm((current) => ({ ...current, model: data.value }))} placeholder="Model" />
              <Input value={form.year} onChange={(_, data) => setForm((current) => ({ ...current, year: data.value }))} placeholder="Year" />
              <Input value={form.trim} onChange={(_, data) => setForm((current) => ({ ...current, trim: data.value }))} placeholder="Trim" />
              <Input value={form.deal} onChange={(_, data) => setForm((current) => ({ ...current, deal: data.value }))} placeholder="Deal label" />
              <Input value={form.vin} onChange={(_, data) => setForm((current) => ({ ...current, vin: data.value }))} placeholder="VIN (auto-generated if blank)" />
              <Input value={form.price} onChange={(_, data) => setForm((current) => ({ ...current, price: data.value }))} placeholder="Price" />
              <Input value={form.mileage} onChange={(_, data) => setForm((current) => ({ ...current, mileage: data.value }))} placeholder="Mileage" />
              <select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value as (typeof CURRENCY_OPTIONS)[number] }))}>
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as Vehicle['status'] }))}>
                <option value="Available">Available</option>
                <option value="Pending">Pending</option>
                <option value="Low Stock">Low Stock</option>
              </select>
              <input
                className="vehicle-category-input"
                list="vehicle-category-options"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Category"
              />
              <datalist id="vehicle-category-options">
                {categoryOptions.map((category) => <option key={category} value={category} />)}
              </datalist>
              <Input value={form.fuel} onChange={(_, data) => setForm((current) => ({ ...current, fuel: data.value }))} placeholder="Fuel" />
              <Input value={form.location} onChange={(_, data) => setForm((current) => ({ ...current, location: data.value }))} placeholder="Location" />
            </div>
            <Input value={form.description} onChange={(_, data) => setForm((current) => ({ ...current, description: data.value }))} placeholder="Description" />
            <input type="file" accept="image/*" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            {error ? <div style={{ color: '#d13438' }}>{error}</div> : null}
            <div className="cta-row detail-actions">
              <Button appearance="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : selectedVehicleId ? 'Update vehicle' : 'Create vehicle'}</Button>
              {selectedVehicleId ? (
                <Button appearance="secondary" type="button" onClick={() => handleDelete(selectedVehicleId)}>Delete</Button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="admin-table row-surface">
          <div className="admin-row admin-header">
            <span>VIN</span>
            <span>Model</span>
            <span>Price</span>
            <span>Currency</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="admin-row">
              <span>{vehicle.vin ?? '—'}</span>
              <span>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </span>
              <span>{vehicle.price.toLocaleString()}</span>
              <span>{vehicle.currency ?? 'USD'}</span>
              <span className="status-badge status-available">{vehicle.status}</span>
              <span>
                <Button appearance="secondary" onClick={() => handleEdit(vehicle)}>Edit</Button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function VehicleCard({ vehicle, displayCurrency, exchangeRates }: { vehicle: Vehicle; displayCurrency: SupportedCurrency; exchangeRates: ExchangeRates }) {
  const priceDisplay = formatPrice(vehicle.price, vehicle.currency, displayCurrency, exchangeRates)

  return (
    <Card className="vehicle-card">
      <img
        src={getVehicleImage(vehicle)}
        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        onError={(event) => {
          event.currentTarget.src = FALLBACK_VEHICLE_IMAGE
          event.currentTarget.onerror = null
        }}
      />
      <div className="vehicle-card-content">
        <div className="vehicle-topline">
          <span className="status-badge status-available">{vehicle.status}</span>
          <span className="deal-label">{vehicle.deal}</span>
        </div>

        <h3>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>

        <div className="meta-row">
          <span>{vehicle.trim}</span>
          <span>{vehicle.mileage.toLocaleString()} mi</span>
        </div>

        <div className="price-row">
          <strong>{priceDisplay}</strong>
          <Link to={`/inventory/${vehicle.id}`} className="inline-link">View details</Link>
        </div>
      </div>
    </Card>
  )
}

export default App
