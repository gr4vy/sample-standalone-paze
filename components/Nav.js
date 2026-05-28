import Link from 'next/link';
import { useRouter } from 'next/router';

const links = [
  { href: '/', label: 'Web', match: (p) => p === '/' },
  {
    href: '/mobile',
    label: 'Mobile',
    match: (p) => p === '/mobile' || p.startsWith('/paze/'),
  },
];

export default function Nav() {
  const { pathname } = useRouter();
  return (
    <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            style={{
              textDecoration: active ? 'underline' : 'none',
              fontWeight: active ? 600 : 400,
              color: active ? '#111' : '#555',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
