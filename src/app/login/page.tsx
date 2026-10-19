export default async function Login({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <main className="login">
      <img src="/logo-zema.png" alt="ZEMA TECHNOLOGIES" width={140} height={140} />
      <h1>SO</h1>
      <p className="muted">by ZEMA TECHNOLOGIES — AI Growth Agent</p>
      <form method="post" action="/api/login">
        <input type="password" name="password" placeholder="Mot de passe" required autoFocus />
        <button type="submit">Entrer</button>
      </form>
      {erreur && <p className="error">Mot de passe incorrect.</p>}
    </main>
  );
}
