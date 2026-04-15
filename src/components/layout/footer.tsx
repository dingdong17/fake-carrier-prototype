export function Footer() {
  return (
    <footer className="border-t border-ec-medium-grey bg-white py-4">
      <div className="mx-auto max-w-content px-6 text-center text-xs text-ec-grey-70">
        <p>Automatisierte Vorprüfung — keine Rechtsberatung</p>
        <p className="mt-1">&copy; {new Date().getFullYear()} Ecclesia Gruppe</p>
      </div>
    </footer>
  );
}
