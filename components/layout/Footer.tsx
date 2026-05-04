import Link from "next/link";

const links = [
  { href: "/", label: "ChatGPT Plus" },
  { href: "/spotify", label: "Spotify Premium" },
  { href: "/guarantee", label: "Гарантии" },
  { href: "/faq", label: "FAQ" },
  { href: "/checkout", label: "Оформить" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#070b14] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-heading text-lg font-semibold">
              GPT <span className="text-primary">STORE</span>
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              ChatGPT Plus и Spotify Premium: оплата картой РФ, активация за минуты, без иностранной карты.
            </p>
            <a
              href="https://t.me/subs_support"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.29c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.931z" />
              </svg>
              t.me/subs_support
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-primary transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground md:text-left">
          © {new Date().getFullYear()} GPT STORE. Все права защищены.
        </p>
      </div>
    </footer>
  );
}
