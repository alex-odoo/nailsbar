import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const API = `https://api.telegram.org/bot${BOT_TOKEN}`

const ADMIN_CHAT_IDS = new Set(
  (process.env.TELEGRAM_ADMIN_CHAT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

const CLIENTS_BUTTON = 'Клієнти'

type ReplyMarkup =
  | { keyboard: { text: string }[][]; resize_keyboard: true; is_persistent: true }
  | { remove_keyboard: true }

async function sendMessage(chatId: number, text: string, replyMarkup?: ReplyMarkup) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  })
}

function keyboardFor(chatId: number): ReplyMarkup {
  return ADMIN_CHAT_IDS.has(String(chatId))
    ? {
        keyboard: [[{ text: CLIENTS_BUTTON }]],
        resize_keyboard: true,
        is_persistent: true,
      }
    : { remove_keyboard: true }
}

async function sendClientsList(chatId: number) {
  const clients = await prisma.client.findMany({
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      loyaltyCyclesRedeemed: true,
      _count: { select: { appointments: true } },
      appointments: {
        select: { date: true },
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  })

  // Sort: clients with recent appointments first, then never-visited by name
  clients.sort((a, b) => {
    const da = a.appointments[0]?.date.getTime() ?? 0
    const db = b.appointments[0]?.date.getTime() ?? 0
    if (da !== db) return db - da
    return (a.firstName + (a.lastName ?? '')).localeCompare(b.firstName + (b.lastName ?? ''))
  })

  if (clients.length === 0) {
    await sendMessage(chatId, '👥 <b>Клієнтів ще немає</b>', keyboardFor(chatId))
    return
  }

  const lines = clients.map((c, i) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
    const last = c.appointments[0]?.date
    const lastStr = last
      ? last.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
      : 'без записів'
    const apptCount = c._count.appointments
    const loyalty = c.loyaltyCyclesRedeemed > 0
      ? ` · ⭐ ${c.loyaltyCyclesRedeemed} цикл${c.loyaltyCyclesRedeemed === 1 ? '' : 'и'}`
      : ''
    return `${i + 1}. <b>${name}</b>
   📱 ${c.phone}
   📅 ${lastStr} (${apptCount} запис${apptCount === 1 ? '' : apptCount < 5 ? 'и' : 'ів'})${loyalty}`
  })

  // Telegram limit 4096 chars; chunk if needed
  const header = `👥 <b>Клієнти (${clients.length})</b>\n\n`
  const chunks: string[] = []
  let current = header
  for (const line of lines) {
    if (current.length + line.length + 2 > 3800) {
      chunks.push(current)
      current = ''
    }
    current += line + '\n\n'
  }
  if (current.trim()) chunks.push(current)

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1
    await sendMessage(chatId, chunks[i].trim(), isLast ? keyboardFor(chatId) : undefined)
  }
}

/**
 * POST /api/telegram/webhook
 *
 * Set via: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://nailsbar.store/api/telegram/webhook
 *
 * Deep link flow:
 *   Client taps: https://t.me/NailsbarTOP_bot?start=<appointmentId>
 *   Bot links the Telegram chat_id to the appointment's client record.
 *
 * Admin button:
 *   Admins (TELEGRAM_ADMIN_CHAT_IDS) see a "Клієнти" reply keyboard on /start.
 *   Tapping it returns the full client list.
 */
export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const message = update.message

    if (!message?.text) return NextResponse.json({ ok: true })

    const chatId: number = message.chat.id
    const text: string = message.text.trim()
    const isAdmin = ADMIN_CHAT_IDS.has(String(chatId))

    // Admin: client list
    if (isAdmin && text === CLIENTS_BUTTON) {
      await sendClientsList(chatId)
      return NextResponse.json({ ok: true })
    }

    // /start <appointmentId>
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const appointmentId = parts[1] ?? null

      if (appointmentId && appointmentId !== 'booking') {
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: {
            client: { select: { firstName: true, lastName: true, id: true } },
            service: { select: { name: true } },
          },
        })

        if (appointment) {
          await prisma.client.update({
            where: { id: appointment.clientId },
            data: { telegramChatId: String(chatId) },
          })

          const dateStr = appointment.date.toLocaleDateString('uk-UA', {
            day: 'numeric', month: 'long', weekday: 'long',
          })

          const clientName = [appointment.client.firstName, appointment.client.lastName].filter(Boolean).join(' ')
          await sendMessage(chatId, `✅ <b>Чудово, ${clientName}!</b>

Ми пов'язали ваш Telegram з записом:
💅 ${appointment.service.name}
📅 ${dateStr} о ${appointment.startTime}

Ми надішлемо нагадування за день та за годину до вашого візиту. ✨

<i>Nailsbar Odesa · nailsbar.store</i>`, keyboardFor(chatId))
          return NextResponse.json({ ok: true })
        }
      }

      // No valid appointmentId — generic welcome
      const welcome = isAdmin
        ? `💅 <b>Nailsbar Odesa · адмін</b>\n\nКнопка «${CLIENTS_BUTTON}» нижче покаже всю клієнтську базу.`
        : `💅 <b>Nailsbar Odesa</b>

Привіт! Це бот для нагадувань про ваші записи.

Щоб підключити нагадування, запишіться онлайн за посиланням:
👉 <a href="https://nailsbar.store/book">nailsbar.store/book</a>

Після запису ви отримаєте посилання на активацію нагадувань. ✨`
      await sendMessage(chatId, welcome, keyboardFor(chatId))
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Telegram webhook error:', e)
    return NextResponse.json({ ok: true })
  }
}
