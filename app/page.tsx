import Image from 'next/image'
import Link from 'next/link'

const APNT_URL = 'https://apnt.app/nailsbarkyiv'
const TG_URL = 'https://t.me/nailsbarodesa'
const IG_URL = 'https://instagram.com/nailsbar.odesa'

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 bg-cream text-navy">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        <Image
          src="/logo.jpg"
          alt="Nailsbar Odesa"
          width={420}
          height={420}
          priority
          className="w-[78vw] max-w-[380px] h-auto"
        />

        <a
          href={APNT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 w-full block text-center rounded-full px-8 py-4 text-white font-bold tracking-wide text-lg shadow-lg transition-transform active:scale-[0.98] no-underline"
          style={{ backgroundColor: '#B07E72', boxShadow: '0 10px 24px rgba(176,126,114,0.35)' }}
        >
          Онлайн запис
        </a>
        <p className="mt-2 text-xs text-navy-muted tracking-wide">
          відкриється у новій вкладці
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 text-sm">
          <Link
            href="/loyalty"
            className="font-semibold text-navy underline underline-offset-4 decoration-2"
            style={{ textDecorationColor: '#B07E72' }}
          >
            Картка лояльності
          </Link>

          <div className="flex items-center gap-5 text-navy-muted text-[13px] tracking-wide">
            <a href={TG_URL} target="_blank" rel="noopener noreferrer" className="hover:text-navy">
              Telegram
            </a>
            <span aria-hidden>·</span>
            <a href={IG_URL} target="_blank" rel="noopener noreferrer" className="hover:text-navy">
              Instagram
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
