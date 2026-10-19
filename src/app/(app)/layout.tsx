import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <nav className="side">
        <div className="brand">SŌ</div>
        <div className="tag">by ZEMA TECHNOLOGIES</div>
        <Link href="/">Tableau de bord</Link>
        <Link href="/recherche">Trouver des prospects</Link>
        <Link href="/prospects">Prospects</Link>
        <Link href="/messages">Messages à valider</Link>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
