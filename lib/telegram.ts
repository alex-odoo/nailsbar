/**
 * Telegram notifications via @NailsbarTOP_bot
 * Використовуємо Bot API напряму через fetch (без залежностей)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const ADMIN_CHAT_IDS = (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const API = `https://api.telegram.org/bot${BOT_TOKEN}`

async function sendMessage(chatId: string, text: string): Promise<void> {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

async function notifyAdmins(text: string): Promise<void> {
  await Promise.all(
    ADMIN_CHAT_IDS.map((id) =>
      sendMessage(id, text).catch((e) =>
        console.error(`notifyAdmins failed for ${id}`, e),
      ),
    ),
  )
}

/** Нотифікація адміну про новий запис від клієнта */
export async function notifyNewAppointment(data: {
  clientName: string
  clientPhone: string
  serviceName: string
  date: string       // "24 березня"
  time: string       // "14:00"
  masterName: string
}): Promise<void> {
  const text = `
📅 <b>Новий запис!</b>

👤 <b>${data.clientName}</b>
📱 ${data.clientPhone}
💅 ${data.serviceName}
🕐 ${data.date} о ${data.time}
✂️ Майстер: ${data.masterName}
`.trim()

  await notifyAdmins(text)
}

/** Нагадування клієнту (відправляється коли є chatId клієнта) */
export async function sendClientReminder(
  chatId: string,
  data: {
    clientName: string
    serviceName: string
    date: string
    time: string
    salonName?: string
  }
): Promise<void> {
  const salon = data.salonName ?? 'Nailsbar Odesa'
  const text = `
💅 <b>${salon}</b>

Привіт, ${data.clientName}! Нагадуємо про ваш запис:

📅 ${data.date} о ${data.time}
💅 ${data.serviceName}

Чекаємо вас! ✨
`.trim()

  await sendMessage(chatId, text)
}

/** Адмін-нотифікація про нову реєстрацію на програму лояльності */
export async function notifyNewLoyaltyClient(data: {
  name: string
  phone: string
}): Promise<void> {
  if (ADMIN_CHAT_IDS.length === 0) return
  const when = new Date().toLocaleString('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const text = `
💅 <b>Нова реєстрація на програму лояльності</b>

👤 ${data.name}
📱 ${data.phone}
🕐 ${when}
`.trim()
  await notifyAdmins(text)
}

/** SMS-подібне підтвердження при бронюванні (якщо клієнт дав Telegram) */
export async function sendBookingConfirmation(
  chatId: string,
  data: {
    clientName: string
    serviceName: string
    date: string
    time: string
  }
): Promise<void> {
  const text = `
✅ <b>Запис підтверджено!</b>

${data.clientName}, ви записані:
💅 ${data.serviceName}
📅 ${data.date} о ${data.time}

Nailsbar Odesa | nailsbar.store
`.trim()

  await sendMessage(chatId, text)
}
