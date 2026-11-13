export type Move = {
  /** Stable slug, referenced by WitCard.move */
  id: string;
  /** Human-readable label shown in the UI */
  label: string;
};

export type Speaker = { speaker: string; line: string };

export type WitCard = {
  id: string;
  /** Move id (see moves.ts) */
  move: string;
  /** Short situation text, e.g. "Someone uses a figure of speech" */
  cue: string;
  trigger: Speaker;
  response: Speaker;
  /** One-line explanation of what the responder did */
  breakdown: string;
  clip: { youtubeId: string; start: number; end: number };
  source?: string;
};
