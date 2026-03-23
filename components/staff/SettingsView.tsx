'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Service = {
  id: string
  name: string
  category: string
  duration: number
  price: number
  isActive: boolean
}

type StaffMember = {
  id: string
  name: string
  role: string
  phone: string | null
  isActive: boolean
  canCreateAppointments: boolean
  canSeeClientLastName: boolean
  canSeeClientPhone: boolean
}

type Props = {
  services: Service[]
  staffList: StaffMember[]
  currentRole: string
  currentId: string
  currentName: string
  currentPhone: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  complex:    'Комплекси',
  manicure:   'Манікюр',
  pedicure:   'Педикюр',
  nail_art:   'Дизайн',
  extra:      'Додатково',
  correction: 'Корекція',
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${on ? 'bg-navy' : 'bg-cream-dark'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function InlineInput({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-muted uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 px-3 py-2 border border-cream-dark rounded-xl bg-cream text-navy outline-none focus:border-navy text-sm"
      />
    </div>
  )
}

export default function SettingsView({
  services: initialServices,
  staffList: initialStaff,
  currentRole,
  currentId,
  currentName,
  currentPhone,
}: Props) {
  const [tab, setTab] = useState<'services' | 'staff' | 'account'>('services')
  const [staffList, setStaffList] = useState(initialStaff)
  const [services, setServices] = useState(initialServices)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null)
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const router = useRouter()

  // Add master form
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPin, setNewPin] = useState('')
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  // Account edit form
  const [acctName, setAcctName] = useState(currentName)
  const [acctPhone, setAcctPhone] = useState(currentPhone ?? '')
  const [acctPin, setAcctPin] = useState('')
  const [acctSaving, setAcctSaving] = useState(false)
  const [acctMsg, setAcctMsg] = useState('')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/staff/login')
  }

  async function toggleService(id: string, isActive: boolean) {
    await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    setServices(prev => prev.map(s => s.id === id ? { ...s, isActive: !isActive } : s))
  }

  async function saveService(id: string, price: string, duration: string) {
    setSaving(id)
    const res = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: Number(price), duration: Number(duration) }),
    })
    if (res.ok) {
      setServices(prev => prev.map(s =>
        s.id === id ? { ...s, price: Number(price), duration: Number(duration) } : s
      ))
      setExpandedServiceId(null)
    }
    setSaving(null)
  }

  async function patchStaff(id: string, patch: Record<string, unknown>) {
    setSaving(id)
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const updated = await res.json()
    if (res.ok) setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s))
    setSaving(null)
  }

  async function handleAddMaster(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    if (!/^\d{6}$/.test(newPin)) { setAddError('PIN повинен бути 6 цифр'); return }
    setAddLoading(true)
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, phone: newPhone, pin: newPin }),
    })
    const data = await res.json()
    if (!res.ok) setAddError(data.error ?? 'Помилка')
    else { setStaffList(prev => [...prev, data]); setNewName(''); setNewPhone(''); setNewPin(''); setShowAddForm(false) }
    setAddLoading(false)
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault()
    setAcctMsg('')
    if (acctPin && !/^\d{6}$/.test(acctPin)) { setAcctMsg('PIN повинен бути 6 цифр'); return }
    setAcctSaving(true)
    const patch: Record<string, string> = { name: acctName, phone: acctPhone }
    if (acctPin) patch.pin = acctPin
    const res = await fetch(`/api/staff/${currentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setAcctSaving(false)
    if (res.ok) { setAcctPin(''); setAcctMsg('Збережено ✓') }
    else { const d = await res.json(); setAcctMsg(d.error ?? 'Помилка') }
  }

  const categories = [...new Set(services.map(s => s.category))]

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-display text-navy mb-4">Налаштування</h1>

      {/* Tabs */}
      <div className="flex bg-cream-dark rounded-xl p-1 mb-5">
        {[
          { key: 'services', label: 'Послуги' },
          ...(currentRole === 'ADMIN' ? [{ key: 'staff', label: 'Персонал' }] : []),
          { key: 'account', label: 'Акаунт' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-surface text-navy shadow-sm' : 'text-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Services tab ─────────────────────────────── */}
      {tab === 'services' && (
        <div className="space-y-5">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">{CATEGORY_LABELS[cat] ?? cat}</p>
              <div className="space-y-2">
                {services.filter(s => s.category === cat).map(s => {
                  const isExpanded = expandedServiceId === s.id
                  return (
                    <div key={s.id} className={`bg-surface border rounded-xl overflow-hidden ${!s.isActive ? 'opacity-50' : 'border-cream-dark'}`}>
                      <div className="px-4 py-3 flex items-center justify-between">
                        <button
                          onClick={() => setExpandedServiceId(isExpanded ? null : s.id)}
                          className="flex-1 text-left"
                        >
                          <p className="font-medium text-navy text-sm">{s.name}</p>
                          <p className="text-xs text-muted">{s.duration} хв · {s.price} ₴</p>
                        </button>
                        {currentRole === 'ADMIN' && (
                          <Toggle on={s.isActive} onToggle={() => toggleService(s.id, s.isActive)} />
                        )}
                      </div>

                      {/* Edit price/duration (admin only) */}
                      {isExpanded && currentRole === 'ADMIN' && (
                        <ServiceEditor
                          service={s}
                          saving={saving === s.id}
                          onSave={(price, duration) => saveService(s.id, price, duration)}
                          onCancel={() => setExpandedServiceId(null)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Staff tab (admin only) ────────────────────── */}
      {tab === 'staff' && currentRole === 'ADMIN' && (
        <div className="space-y-3">
          {staffList.map(s => {
            const isExpanded = expandedStaffId === s.id
            const isSaving = saving === s.id
            const isSelf = s.id === currentId

            return (
              <div key={s.id} className={`bg-surface border rounded-xl overflow-hidden ${!s.isActive ? 'opacity-50 border-cream-dark' : 'border-cream-dark'}`}>
                <button
                  onClick={() => setExpandedStaffId(isExpanded ? null : s.id)}
                  className="w-full px-4 py-4 flex items-center justify-between text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-navy">{s.name}</p>
                      {isSelf && <span className="text-xs text-muted">← Ви</span>}
                    </div>
                    <p className="text-sm text-muted">{s.phone ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.role === 'ADMIN' ? 'bg-navy text-cream' : 'bg-cream-dark text-muted'}`}>
                      {s.role === 'ADMIN' ? 'Адмін' : 'Майстер'}
                    </span>
                    <span className="text-muted text-sm">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <StaffEditor
                    staff={s}
                    isSaving={isSaving}
                    onPatch={(patch) => patchStaff(s.id, patch)}
                    onClose={() => setExpandedStaffId(null)}
                  />
                )}
              </div>
            )
          })}

          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-cream-dark text-muted text-sm font-medium"
            >
              + Додати майстра
            </button>
          ) : (
            <form onSubmit={handleAddMaster} className="bg-surface border border-cream-dark rounded-xl px-4 py-4 space-y-3">
              <p className="font-semibold text-navy">Новий майстер</p>
              <InlineInput label="Ім'я" value={newName} onChange={setNewName} placeholder="Ім'я майстра" />
              <InlineInput label="Телефон (логін)" value={newPhone} onChange={setNewPhone} type="tel" placeholder="+380XXXXXXXXX" />
              <div>
                <label className="text-xs text-muted uppercase tracking-wider">PIN (6 цифр)</label>
                <input
                  type="text" inputMode="numeric" placeholder="000000" maxLength={6}
                  value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 px-3 py-2 border border-cream-dark rounded-xl bg-cream text-navy outline-none focus:border-navy text-sm font-mono tracking-widest"
                />
              </div>
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAddForm(false); setAddError('') }}
                  className="flex-1 py-2.5 rounded-xl border border-cream-dark text-muted text-sm">Скасувати</button>
                <button type="submit" disabled={addLoading}
                  className="flex-1 py-2.5 rounded-xl bg-navy text-surface text-sm font-semibold disabled:opacity-40">
                  {addLoading ? 'Створюємо...' : 'Створити'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Account tab ──────────────────────────────── */}
      {tab === 'account' && (
        <div className="space-y-3">
          <div className="bg-surface border border-cream-dark rounded-xl px-4 py-4">
            <p className="text-xs text-muted uppercase tracking-wide mb-1">Роль</p>
            <p className="font-medium text-navy">{currentRole === 'ADMIN' ? 'Адміністратор' : 'Майстер'}</p>
          </div>

          <form onSubmit={saveAccount} className="bg-surface border border-cream-dark rounded-xl px-4 py-4 space-y-3">
            <p className="font-semibold text-navy text-sm mb-1">Мої дані</p>
            <InlineInput label="Ім'я" value={acctName} onChange={setAcctName} placeholder="Ваше ім'я" />
            <InlineInput label="Телефон (логін)" value={acctPhone} onChange={setAcctPhone} type="tel" placeholder="+380..." />
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Змінити PIN</label>
              <input
                type="text" inputMode="numeric" maxLength={6} placeholder="Новий PIN (6 цифр)"
                value={acctPin} onChange={e => setAcctPin(e.target.value.replace(/\D/g, ''))}
                className="w-full mt-1 px-3 py-2 border border-cream-dark rounded-xl bg-cream text-navy outline-none focus:border-navy text-sm font-mono tracking-widest"
              />
            </div>
            {acctMsg && (
              <p className={`text-xs ${acctMsg.includes('✓') ? 'text-green-700' : 'text-red-600'}`}>{acctMsg}</p>
            )}
            <button type="submit" disabled={acctSaving}
              className="w-full py-2.5 rounded-xl bg-navy text-surface text-sm font-semibold disabled:opacity-40">
              {acctSaving ? 'Зберігаємо...' : 'Зберегти зміни'}
            </button>
          </form>

          <div className="bg-surface border border-cream-dark rounded-xl px-4 py-4">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">Клієнтська сторінка</p>
            <a href="/book" target="_blank" className="text-navy text-sm underline break-all">
              nailsbar.store/book
            </a>
          </div>

          <button onClick={handleLogout}
            className="w-full mt-4 py-4 rounded-xl border-2 border-error text-error font-semibold text-base">
            Вийти з акаунту
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────

function ServiceEditor({ service, saving, onSave, onCancel }: {
  service: Service
  saving: boolean
  onSave: (price: string, duration: string) => void
  onCancel: () => void
}) {
  const [price, setPrice] = useState(String(service.price))
  const [duration, setDuration] = useState(String(service.duration))

  return (
    <div className="border-t border-cream-dark px-4 py-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted uppercase tracking-wider">Ціна (₴)</label>
          <input
            type="number" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-cream-dark rounded-xl bg-cream text-navy outline-none focus:border-navy text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted uppercase tracking-wider">Тривалість (хв)</label>
          <input
            type="number" inputMode="numeric" value={duration} onChange={e => setDuration(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-cream-dark rounded-xl bg-cream text-navy outline-none focus:border-navy text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 py-2 rounded-xl border border-cream-dark text-muted text-sm">Скасувати</button>
        <button onClick={() => onSave(price, duration)} disabled={saving}
          className="flex-1 py-2 rounded-xl bg-navy text-surface text-sm font-semibold disabled:opacity-40">
          {saving ? 'Зберігаємо...' : 'Зберегти'}
        </button>
      </div>
    </div>
  )
}

function StaffEditor({ staff, isSaving, onPatch, onClose }: {
  staff: StaffMember
  isSaving: boolean
  onPatch: (patch: Record<string, unknown>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(staff.name)
  const [phone, setPhone] = useState(staff.phone ?? '')
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')

  function saveProfile() {
    if (pin && !/^\d{6}$/.test(pin)) { setPinErr('PIN повинен бути 6 цифр'); return }
    setPinErr('')
    const patch: Record<string, unknown> = { name, phone }
    if (pin) patch.pin = pin
    onPatch(patch)
    setPin('')
  }

  return (
    <div className="border-t border-cream-dark px-4 py-4 space-y-3">
      {/* Profile edit */}
      <p className="text-xs text-muted uppercase tracking-widest">Дані</p>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted">Ім'я</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full mt-0.5 px-3 py-2 border border-cream-dark rounded-xl bg-cream text-navy outline-none focus:border-navy text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted">Телефон (логін)</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full mt-0.5 px-3 py-2 border border-cream-dark rounded-xl bg-cream text-navy outline-none focus:border-navy text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted">Новий PIN</label>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="Залишіть порожнім якщо не змінювати"
            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full mt-0.5 px-3 py-2 border border-cream-dark rounded-xl bg-cream text-navy outline-none focus:border-navy text-sm font-mono tracking-widest" />
        </div>
        {pinErr && <p className="text-xs text-red-600">{pinErr}</p>}
        <button onClick={saveProfile} disabled={isSaving}
          className="w-full py-2 rounded-xl bg-cream-dark text-navy text-sm font-medium disabled:opacity-40">
          {isSaving ? 'Зберігаємо...' : 'Зберегти дані'}
        </button>
      </div>

      {/* Permissions (masters only) */}
      {staff.role === 'MASTER' && (
        <div className="border-t border-cream-dark pt-3 space-y-3">
          <p className="text-xs text-muted uppercase tracking-widest">Доступ</p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy">Активний акаунт</p>
              <p className="text-xs text-muted">Може входити в систему</p>
            </div>
            <Toggle on={staff.isActive} onToggle={() => onPatch({ isActive: !staff.isActive })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy">Редагування записів</p>
              <p className="text-xs text-muted">Змінювати статус, скасовувати</p>
            </div>
            <Toggle on={staff.canCreateAppointments} onToggle={() => onPatch({ canCreateAppointments: !staff.canCreateAppointments })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy">Бачить прізвище клієнта</p>
              <p className="text-xs text-muted">Ім'я завжди видно</p>
            </div>
            <Toggle on={staff.canSeeClientLastName} onToggle={() => onPatch({ canSeeClientLastName: !staff.canSeeClientLastName })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy">Бачить телефон клієнта</p>
              <p className="text-xs text-muted">Номер та кнопка виклику</p>
            </div>
            <Toggle on={staff.canSeeClientPhone} onToggle={() => onPatch({ canSeeClientPhone: !staff.canSeeClientPhone })} />
          </div>
        </div>
      )}
    </div>
  )
}
