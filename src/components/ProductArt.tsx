import type { ProductId } from '../game/types';

/** Hand-drawn style SVG illustrations, one per product. */
export function ProductArt({ id, size = 40, title }: { id: ProductId; size?: number; title?: string }) {
  const common = { width: size, height: size, viewBox: '0 0 48 48', role: title ? 'img' : undefined, 'aria-hidden': title ? undefined : true } as const;
  switch (id) {
    case 'sourdough':
      return (
        <svg {...common}>
          {title && <title>{title}</title>}
          <ellipse cx="24" cy="29" rx="19" ry="12" fill="#C98A3E" stroke="#5C3A17" strokeWidth="1.6" />
          <ellipse cx="24" cy="26" rx="17" ry="9.5" fill="#D9A15A" />
          <path d="M13 24c4-3 7-3 10 0M21 21c4-3 8-3 11 0M28 25c3-2 6-2 8 0" fill="none" stroke="#F3DDB3" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 33c6 4 26 4 32 0" fill="none" stroke="#8C5A26" strokeWidth="1.2" opacity=".6" />
        </svg>
      );
    case 'matcha':
      return (
        <svg {...common}>
          {title && <title>{title}</title>}
          <circle cx="24" cy="25" r="16" fill="#8FAE5B" stroke="#3E5A22" strokeWidth="1.6" />
          <circle cx="24" cy="24" r="13.5" fill="#A3C06E" />
          {[[18, 19], [28, 18], [31, 27], [20, 29], [25, 25], [15, 25]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.8" fill="#F5EBD3" />
          ))}
          <path d="M12 30c3 4 8 6 12 6" fill="none" stroke="#3E5A22" strokeWidth="1" opacity=".5" />
        </svg>
      );
    case 'muffin':
      return (
        <svg {...common}>
          {title && <title>{title}</title>}
          <path d="M12 26h24l-3 16H15z" fill="#E7C98F" stroke="#5C3A17" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M17 27l1.5 14M24 27v14M31 27l-1.5 14" stroke="#B88A4A" strokeWidth="1.2" />
          <path d="M9 27c0-10 7-16 15-16s15 6 15 16c-2 1-28 1-30 0z" fill="#C88A44" stroke="#5C3A17" strokeWidth="1.6" />
          {[[17, 20], [25, 16], [31, 22], [22, 23], [28, 26]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.4" fill="#5B2A63" />
          ))}
        </svg>
      );
    case 'croissant':
      return (
        <svg {...common}>
          {title && <title>{title}</title>}
          <path d="M5 30c4-12 13-18 19-18s15 6 19 18c-4 2-7 0-9-3-2 4-6 6-10 6s-8-2-10-6c-2 3-5 5-9 3z" fill="#D69A4C" stroke="#5C3A17" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M15 17c2 5 3 10 3 14M24 12v20M33 17c-2 5-3 10-3 14" fill="none" stroke="#8C5A26" strokeWidth="1.3" />
          <path d="M18 21c2-1 4-1 5 0M26 21c1-1 3-1 5 0" stroke="#F0D29A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      );
  }
}
