import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const API = `https://api.telegram.org/bot${BOT_TOKEN}`

async function sendMessage(chatId: number, text: string) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
}

/**
 * POST /api/telegram/webhook
 *
 * Handles Telegram bot updates.
 * Set via: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://nailsbar.store/api/telegram/webhook
 *
 * Deep link flow:
 *   Client taps: https://t.me/NailsbarTOP_bot?start=<appointmentId>
 *   Bot receives: /start <appointmentId>
 *   Bot links the Telegram chat_id to the appointment's client record
 */
export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const message = update.message

    if (!message?.text) return NextResponse.json({ ok: true })

    const chatId: number = message.chat.id
    const text: string = message.text.trim()

    // /start <appointmentId>
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const appointmentId = parts[1] ?? null

      if (appointmentId && appointmentId !== 'booking') {
        // Find the appointment and link telegram chat_id to the client
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: {
            client: { select: { firstName: true, lastName: true, id: true } },
            service: { select: { name: true } },
          },
        })

        if (appointment) {
          // Save telegram chat_id on the client
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

<i>Nailsbar Odesa · nailsbar.store</i>`)
          return NextResponse.json({ ok: true })
        }
      }

      // No valid appointmentId — generic welcome
      await sendMessage(chatId, `💅 <b>Nailsbar Odesa</b>

Привіт! Це бот для нагадувань про ваші записи.

Щоб підключити нагадування, запишіться онлайн за посиланням:
👉 <a href="https://nailsbar.store/book">nailsbar.store/book</a>

Після запису ви отримаєте посилання на активацію нагадувань. ✨`)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Telegram webhook error:', e)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}
