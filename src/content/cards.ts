// PLACEHOLDER content for development only. Real content comes from a
// separate content pipeline. Speakers are generic roles and all lines are
// original; none are attributed to real people.
import type { WitCard } from "./types";

// Reachable, embeddable public videos (verified via YouTube oEmbed).
const A = "M7lc1UVf-VE"; // YouTube IFrame API demo video
const B = "jNQXAC9IVRw";
const C = "dQw4w9WgXcQ";
const D = "YE7VzlLtp-4";
const E = "aqz-KE-bpKQ";

export const cards: WitCard[] = [
  {
    id: "c01",
    move: "literal-interpretation",
    cue: "Someone uses a figure of speech",
    trigger: { speaker: "Host", line: "I'm so hungry I could eat a horse." },
    response: { speaker: "Guest", line: "I'll call the stables. Do you want it with fries?" },
    breakdown: "Took 'I could eat a horse' at face value",
    clip: { youtubeId: A, start: 10, end: 22 },
  },
  {
    id: "c02",
    move: "literal-interpretation",
    cue: "Someone asks a rhetorical question",
    trigger: { speaker: "Panellist", line: "Do I look like I was born yesterday?" },
    response: { speaker: "Co-host", line: "Honestly, a little. Your handwriting suggests Tuesday." },
    breakdown: "Answered a rhetorical question as a real one",
    clip: { youtubeId: B, start: 3, end: 15 },
  },
  {
    id: "c03",
    move: "escalation",
    cue: "Someone mentions a small inconvenience",
    trigger: { speaker: "Guest", line: "My train was five minutes late today." },
    response: { speaker: "Host", line: "Five minutes? Call the historians. Wars have started over less." },
    breakdown: "Blew a tiny problem up to historic scale",
    clip: { youtubeId: C, start: 8, end: 20 },
  },
  {
    id: "c04",
    move: "escalation",
    cue: "Someone proudly states a modest plan",
    trigger: { speaker: "Comedian", line: "I'm thinking of painting the spare room." },
    response: { speaker: "Panellist", line: "Bold. Then the hallway, then the nation." },
    breakdown: "Stretched a small plan into a grand campaign",
    clip: { youtubeId: D, start: 20, end: 32 },
  },
  {
    id: "c05",
    move: "understatement",
    cue: "Someone describes a disaster",
    trigger: { speaker: "Guest", line: "The kitchen is completely on fire." },
    response: { speaker: "Host", line: "Well. That's not ideal for the soufflé." },
    breakdown: "Treated a catastrophe as a mild setback",
    clip: { youtubeId: E, start: 15, end: 27 },
  },
  {
    id: "c06",
    move: "understatement",
    cue: "Someone recounts an extreme journey",
    trigger: { speaker: "Co-host", line: "We walked forty miles in the rain." },
    response: { speaker: "Comedian", line: "So, a bit damp, then." },
    breakdown: "Shrank an ordeal to two words",
    clip: { youtubeId: A, start: 30, end: 42 },
  },
  {
    id: "c07",
    move: "callback",
    cue: "A running joke from earlier returns",
    trigger: { speaker: "Host", line: "Anyone want to take the last biscuit?" },
    response: { speaker: "Guest", line: "Not after what happened with the sandwich." },
    breakdown: "Reached back to an earlier bit for a fresh laugh",
    clip: { youtubeId: B, start: 8, end: 18 },
  },
  {
    id: "c08",
    move: "self-deprecation",
    cue: "Someone compliments you",
    trigger: { speaker: "Guest", line: "You always seem so organised." },
    response: { speaker: "Host", line: "I once alphabetised my regrets. It took a weekend." },
    breakdown: "Turned praise into a joke at your own expense",
    clip: { youtubeId: C, start: 30, end: 42 },
  },
  {
    id: "c09",
    move: "self-deprecation",
    cue: "Someone asks about your skills",
    trigger: { speaker: "Panellist", line: "Are you any good at DIY?" },
    response: { speaker: "Comedian", line: "I built a shelf once. It's now a very sturdy floor." },
    breakdown: "Admitted a flaw with a vivid, silly image",
    clip: { youtubeId: D, start: 40, end: 52 },
  },
  {
    id: "c10",
    move: "playing-along",
    cue: "Someone makes an absurd claim",
    trigger: { speaker: "Co-host", line: "I'm fairly sure my cat runs this house." },
    response: { speaker: "Guest", line: "Then I'd like to speak to the manager about the parking." },
    breakdown: "Accepted the premise and extended it",
    clip: { youtubeId: E, start: 40, end: 52 },
  },
  {
    id: "c11",
    move: "reversal",
    cue: "Someone gives you advice",
    trigger: { speaker: "Host", line: "You really should relax more." },
    response: { speaker: "Panellist", line: "I'll schedule it. Fifteen minutes, then back to panicking." },
    breakdown: "Flipped the advice into the opposite behaviour",
    clip: { youtubeId: A, start: 50, end: 62 },
  },
  {
    id: "c12",
    move: "naming-the-obvious",
    cue: "Everyone is politely ignoring something",
    trigger: { speaker: "Host", line: "So, the demo is going well." },
    response: { speaker: "Co-host", line: "The screen is blank, but sure, the vibe is strong." },
    breakdown: "Said aloud what everyone was avoiding",
    clip: { youtubeId: B, start: 10, end: 20 },
  },
  {
    id: "c13",
    move: "misdirection",
    cue: "Someone sets up a sincere story",
    trigger: { speaker: "Comedian", line: "My grandmother gave me one piece of advice." },
    response: { speaker: "Guest", line: "Never trust a man who owns a single fork?" },
    breakdown: "Guessed a confident answer that swerved off course",
    clip: { youtubeId: C, start: 15, end: 25 },
  },
  {
    id: "c14",
    move: "mock-seriousness",
    cue: "A trivial matter comes up",
    trigger: { speaker: "Host", line: "Some people put milk in first." },
    response: {
      speaker: "Guest",
      line: "I'd ask you not to say that in front of the kettle.",
    },
    // Deliberately broken clip ID to exercise the text-only fallback.
    breakdown: "Treated a trivial matter with solemn gravity",
    clip: { youtubeId: "BROKEN_CLIP", start: 5, end: 15 },
  },
];
