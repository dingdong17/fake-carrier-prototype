"use client";

interface EpicOption {
  id: string;
  itemNumber: string;
  title: string;
}

interface EpicFilterProps {
  epics: EpicOption[];
  value: string; // "all" or itemNumber
  onChange: (value: string) => void;
}

export function EpicFilter({ epics, value, onChange }: EpicFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-ec-medium-grey px-3 py-2 text-sm text-ec-dark-blue focus:border-ec-dark-blue focus:outline-none focus:ring-1 focus:ring-ec-dark-blue"
    >
      <option value="all">Alle Epics</option>
      {epics.map((e) => (
        <option key={e.id} value={e.itemNumber}>
          {e.itemNumber} · {e.title}
        </option>
      ))}
    </select>
  );
}
