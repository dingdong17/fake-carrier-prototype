export default function CheckEmailPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-ec-dark-blue">
        Prüfen Sie Ihr Postfach
      </h1>
      <p className="text-sm text-ec-grey-80">
        Wenn Ihre E-Mail freigeschaltet ist, finden Sie in wenigen Sekunden
        einen Login-Link in Ihrem Posteingang. Der Link ist eine Stunde gültig
        und nur einmal verwendbar.
      </p>
      <p className="mt-4 text-xs text-ec-grey-70">
        Kein Link angekommen? Prüfen Sie den Spam-Ordner, oder schreiben Sie
        Ihrem Administrator.
      </p>
    </main>
  );
}
