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

/** Florzinha de 5 pétalas (traço fino). Rosa nas pétalas, vinho no miolo. */
export function Blossom({ className }: Props) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <g stroke="#cb7885">
        <circle cx="24" cy="12" r="7" />
        <circle cx="35.4" cy="20.3" r="7" />
        <circle cx="31" cy="33.7" r="7" />
        <circle cx="17" cy="33.7" r="7" />
        <circle cx="12.6" cy="20.3" r="7" />
      </g>
      <circle cx="24" cy="24" r="3.5" stroke="#893941" />
    </svg>
  );
}

/** Galho fino com folhas verdes (currentColor) e três florzinhas rosa. */
export function FlowerSprig({ className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor">
        <path d="M18 112C30 84 52 56 92 22" />
        <path d="M34 90c-12-1-19-8-21-18 12 0 20 5 21 18Z" />
        <path d="M60 58c-1-12 4-20 14-25 3 12-2 20-14 25Z" />
      </g>
      <g stroke="#cb7885">
        <circle cx="92" cy="14" r="5" />
        <circle cx="100" cy="22" r="5" />
        <circle cx="94" cy="30" r="5" />
        <circle cx="85" cy="22" r="5" />
        <circle cx="48" cy="72" r="4" />
        <circle cx="54" cy="78" r="4" />
        <circle cx="47" cy="82" r="4" />
        <circle cx="42" cy="76" r="4" />
      </g>
      <circle cx="92" cy="22" r="2.5" stroke="#893941" />
      <circle cx="48" cy="77" r="2" stroke="#893941" />
    </svg>
  );
}

/** Vasinho (cor do texto) com uma flor rosa, para telas vazias. */
export function FlowerPot({ className }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <g stroke="currentColor">
        <path d="M38 80h44l-5 26a4 4 0 0 1-4 3H47a4 4 0 0 1-4-3l-5-26Z" />
        <path d="M34 80h52" />
        <path d="M60 80V46" />
        <path d="M60 68c-14 0-21-6-23-16 13 0 21 5 23 16Z" />
        <path d="M60 62c8-1 14-5 17-13-9-1-15 3-17 13Z" />
      </g>
      <g stroke="#cb7885">
        <circle cx="60" cy="24" r="8" />
        <circle cx="71" cy="32" r="8" />
        <circle cx="67" cy="45" r="8" />
        <circle cx="53" cy="45" r="8" />
        <circle cx="49" cy="32" r="8" />
      </g>
      <circle cx="60" cy="35" r="4" stroke="#893941" />
    </svg>
  );
}
