type IconProps = { size?: number };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconGrid({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function IconList({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
      <line x1="9" y1="6" x2="20.5" y2="6" />
      <line x1="9" y1="12" x2="20.5" y2="12" />
      <line x1="9" y1="18" x2="20.5" y2="18" />
    </svg>
  );
}

export function IconUpload({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 15.5V4" />
      <path d="M7 8.5 12 4l5 4.5" />
      <path d="M4.5 15.5v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function IconTag({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M11.5 3.5h5a2 2 0 0 1 2 2v5a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-4-4a2 2 0 0 1 0-2.8l8-8a2 2 0 0 1 1.4-.6Z" />
      <circle cx="15" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconWand({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 20 15 9" />
      <path d="M13 4.5v2" />
      <path d="M17.5 7v2" />
      <path d="M20 4.5v2" />
      <path d="M18.5 6h-2.6" />
      <path d="M13 5.5h-2.6" />
    </svg>
  );
}

export function IconSettings({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.8 6.2l-1.55 1.55M7.75 16.25 6.2 17.8M17.8 17.8l-1.55-1.55M7.75 7.75 6.2 6.2" />
    </svg>
  );
}

export function IconPlus({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconChevronUp({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M5 15l7-7 7 7" />
    </svg>
  );
}

export function IconChevronDown({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M5 9l7 7 7-7" />
    </svg>
  );
}

export function IconChevronLeft({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconChevronRight({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconLanguage({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 6.5h9" />
      <path d="M8.5 4v2.5c0 4-1.8 7.2-4.5 9" />
      <path d="M6 11c1.2 1.8 3 3 5.5 3.5" />
      <path d="M13.5 20l4-9 4 9" />
      <path d="M14.9 17h5.2" />
    </svg>
  );
}

export function IconReset({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 12a8 8 0 1 1 2.6 5.9" />
      <path d="M4 20v-5.5h5.5" />
    </svg>
  );
}

export function IconPiggyBank({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4.5 12.5c0-3.6 3.4-6.5 7.6-6.5 2.7 0 5 .9 6.4 2.3h1.3a1 1 0 0 1 1 1v2.3a1 1 0 0 1-1 1h-.9" />
      <path d="M19.8 12.6c-.5 3.2-3.7 5.6-7.7 5.6-1 0-1.9-.1-2.8-.4L7.5 19.5H5l.9-2.6c-.9-.8-1.4-1.8-1.4-2.9" />
      <path d="M9 6.2 8 4" />
      <path d="M13.5 6.2 14.2 4" />
      <circle cx="15.2" cy="10.7" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconRepeat({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 12a7 7 0 0 1 12-4.9L18 9" />
      <path d="M18 5v4h-4" />
      <path d="M20 12a7 7 0 0 1-12 4.9L6 15" />
      <path d="M6 19v-4h4" />
    </svg>
  );
}

export function IconPalette({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.7-.8 1.7-1.7 0-.45-.18-.85-.46-1.15-.28-.3-.46-.7-.46-1.15 0-.9.75-1.6 1.65-1.6H16A4.5 4.5 0 0 0 20.5 10c0-3.6-3.8-6.5-8.5-6.5Z" />
      <circle cx="7.3" cy="10.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="7" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="7" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="16.7" cy="10.2" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconHistory({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4.5v3.7h3.7" />
      <path d="M12 8v4.5l3 2" />
    </svg>
  );
}

export function IconLogout({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M9 4.5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3" />
      <path d="M13.5 8 18 12l-4.5 4" />
      <path d="M18 12H9" />
    </svg>
  );
}

export function IconTrash({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}>
      <path d="M5 7h14" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M7 7l.7 12a2 2 0 0 0 2 1.9h4.6a2 2 0 0 0 2-1.9L17 7" />
    </svg>
  );
}
