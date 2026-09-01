import { useEffect, useRef, useState } from "react";
import { ICON_LIBRARY, getCategoryIcon } from "./category-icons";

export function CategoryIcon({
  icon,
  size = 16,
  color,
}: {
  icon: string | null;
  size?: number;
  color?: string;
}) {
  const Icon = getCategoryIcon(icon);
  return <Icon size={size} color={color} strokeWidth={1.8} />;
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        onClick={() => setOpen((o) => !o)}
        title="Ikon választása"
        style={{ border: "1px solid var(--hairline)" }}
      >
        <CategoryIcon icon={value} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 20,
            background: "var(--paper-raised)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            padding: 8,
            display: "grid",
            gridTemplateColumns: "repeat(8, 28px)",
            gap: 4,
            maxWidth: 268,
          }}
        >
          {Object.keys(ICON_LIBRARY).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              title={name}
              className="btn btn-icon btn-ghost"
              style={{
                width: 28,
                height: 28,
                padding: 0,
                background: name === value ? "var(--accent-soft)" : undefined,
                color: name === value ? "var(--accent-soft-ink)" : undefined,
              }}
            >
              <CategoryIcon icon={name} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
