function isSafeCallbackPath(u: string): boolean {
  return /^\/api\/auth\/callback\/[a-z]+\?/.test(u);
}

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const { u } = await searchParams;

  if (!u || !isSafeCallbackPath(u)) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-2 text-2xl font-bold text-ec-dark-blue">
          Ungültiger Link
        </h1>
        <p className="text-sm text-ec-grey-80">
          Dieser Login-Link ist unvollständig. Bitte fordern Sie unter{" "}
          <a href="/login" className="underline">/login</a> einen neuen Link an.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-ec-dark-blue">
        Einloggen bestätigen
      </h1>
      <p className="mb-6 text-sm text-ec-grey-80">
        Klicken Sie auf die Schaltfläche, um Ihre Anmeldung abzuschließen.
      </p>
      <form method="POST" action="/auth/confirm/complete">
        <input type="hidden" name="u" value={u} />
        <button
          type="submit"
          className="w-full rounded-md bg-ec-dark-blue px-4 py-2 text-sm font-medium text-white hover:bg-ec-dark-blue/90"
        >
          Jetzt einloggen
        </button>
      </form>
      <p className="mt-6 text-xs text-ec-grey-70">
        Dieser Zwischenschritt schützt Ihren Login-Link vor automatischer
        Entwertung durch E-Mail-Sicherheitsscanner.
      </p>
    </main>
  );
}
