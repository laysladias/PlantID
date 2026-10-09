// Ilustrações minimalistas de traço fino (SVG), usadas como detalhe de fundo.
// Usam "currentColor", então a cor vem da classe de texto (ex.: text-leaf-300).

type Props = { className?: string };

/** Galho com folhas, para cantos de telas e do topo. */
export function LeafSprig({ className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 112C32 84 54 58 96 14" />
      <path d="M36 86c-14-2-22-10-24-22 14 0 23 6 24 22Z" />
      <path d="M52 66c-1-14 5-24 17-30 3 14-3 24-17 30Z" />
      <path d="M68 48c10-8 20-9 32-4-6 12-17 15-32 4Z" />
      <path d="M44 100c-4-12 0-22 12-28 4 12 0 22-12 28Z" />
      <path d="M82 30c-3-10 0-18 9-24 4 10 1 18-9 24Z" />
    </svg>
  );
}

/** Vasinho com planta, para telas vazias. */
export function PlantPot({ className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M38 76h44l-5 30a4 4 0 0 1-4 3H47a4 4 0 0 1-4-3l-5-30Z" />
      <path d="M34 76h52" />
      <path d="M60 76V40" />
      <path d="M60 58c-16 0-24-8-26-20 16 0 25 7 26 20Z" />
      <path d="M60 48c0-14 7-23 20-27 2 15-6 24-20 27Z" />
      <path d="M30 100c-5 0-8-3-8-7M92 100c5 0 8-3 8-7" opacity="0.5" />
    </svg>
  );
}

/** Três folhinhas lado a lado, para destacar títulos de cartões. */
export function LeafTrio({ className }: Props) {
  return (
    <svg
      viewBox="0 0 80 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 36c-8-4-10-12-8-22 10 3 13 11 8 22Z" />
      <path d="M40 36c-8-6-9-16-3-28 9 6 10 16 3 28Z" />
      <path d="M66 36c-8-4-10-12-8-22 10 3 13 11 8 22Z" />
    </svg>
  );
}
