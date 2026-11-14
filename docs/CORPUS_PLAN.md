# Quipdeck corpus pipeline: deep plan

Status: plan only. Nothing here is built. Probe evidence is in Appendix A.
Scope: how real cards get into Quipdeck with the least user effort, without ever shipping a line nobody said or a clip window nobody watched.

## 0. Decisions at a glance

| # | Question | Decision |
|---|---|---|
| 1 | Can "paste a link" run unattended? | **Not from a datacentre.** Every caption fetch from this sandbox was blocked by YouTube's bot wall (Appendix A). Link-only runs on the user's own machine (inferred to work, first build task proves it). Anywhere else the input is link + timestamped transcript. |
| 2 | Inputs | Three accepted: link only (laptop); link + timestamped transcript (anywhere); link + untimed transcript (laptop only, aligned to fetched captions, optional task C4-3). A transcript with no link is refused with one question: "which video?" |
| 3 | Authenticity | The model never writes dialogue. It returns transcript **segment indices**; code slices the text and the timestamps. The user approves every card after watching its exact window in the real player. Real names appear only after the user confirms them. |
| 4 | Where it runs | **Hybrid (d):** one deterministic core in `scripts/corpus/`, two front doors: a local CLI that calls the Anthropic API, and a Claude Code skill where the session agent is the extractor. No in-app intake page. |
| 5 | Model | `claude-opus-5-5`, `output_config.effort: "high"`, structured output through `client.messages.parse()` with a Zod schema. |
| 6 | Storage | One JSON file per card in `content/cards/<id>.json`. `src/content/cards.ts` becomes a thin re-export of a generated, gitignored module. `src/content/index.ts` exports do not change. |
| 7 | Ids | Opaque, random, minted once when a draft is created, never derived from anything editable. CI fails if a shipped id disappears without a tombstone. |
| 8 | `WitCard` type | **Unchanged.** All provenance lives in the JSON and is stripped by the generator. Section 7 lists what the UI lead still needs to know. |

## 1. Probe results (what decides everything else)

Run from this sandbox on 2026-11-14 against `eRsGyueVLvQ` (Sintel, Blender), `UF8uR6Z6KLc` (Stanford commencement talk) and `arj7oStGLkU` (TED talk). Egress IP `160.79.106.226`, a datacentre address. Full output in Appendix A.

| Method | Result here | Why |
|---|---|---|
| oEmbed (`/oembed?url=...`) | **Works.** 200 with title and channel for all three; 400 for a malformed id | Public metadata endpoint, not behind the bot wall |
| Thumbnail (`i.ytimg.com/vi/<id>/mqdefault.jpg`) | **Works.** 200 for a real id, 404 for a fake one | Static CDN |
| Watch page HTML | **Blocked.** 200 or 302, but `playabilityStatus` is `LOGIN_REQUIRED`, "Sign in to confirm you're not a bot"; no `captionTracks` | IP reputation |
| InnerTube `/youtubei/v1/player` (ANDROID, IOS, TVHTML5, ANDROID_VR, WEB_EMBEDDED_PLAYER) | **Blocked.** `LOGIN_REQUIRED` on four clients, `ERROR` on the embedded client; 0 caption tracks | Same bot wall on every client |
| `youtube-transcript-api` 1.2.5 | **Blocked.** Raises `IpBlocked` | The library names the cause itself |
| `yt-dlp` 2026.10.26 | **Blocked.** HTTP 429 on the watch page, then "Sign in to confirm you're not a bot" | Same wall; also warns that no JS runtime (deno) is installed |
| Embed page (`youtube-nocookie.com/embed/<id>`) **with a `Referer` header** | **Works.** `previewPlayabilityStatus` is `OK` with `playableInEmbed: true` for two real videos, `ERROR` "This video is unavailable" for a fake id. Without a Referer it reports "Video player configuration error" | The embed player is not behind the bot wall. It gives an embeddability signal, no captions |
| Unsigned `timedtext` (`/api/timedtext?v=&lang=en`, `video.google.com/timedtext?type=list`) | **No data.** 200 with an empty body | Ambiguous: these legacy URLs now need signed parameters taken from the player response, so an empty body is expected from any IP. Not evidence of an IP block |
| InnerTube `get_transcript` | **Failed.** 400 `FAILED_PRECONDITION` | Needs a visitor/session context we cannot get past the wall |
| Third-party readers (`youtubetranscript.com`, `r.jina.ai`) | **No transcript.** The first returns an app shell (inconclusive: it may need JavaScript), the second reports the target answered 401 | The second is a datacentre host hitting the same wall |
| YouTube Data API `captions` without a key | 403 | And with a key, `captions.download` only works for the video's owner, so it is not a route at all |

### What this means for laptop versus datacentre

- **Datacentre (this sandbox, a cloud Claude Code session, Vercel functions, any cloud function): caption fetching is dead.** Proven above with three independent tools giving the same named cause. Cookies or a residential proxy would get past it, and both are rejected: cookies put the user's Google session into a server, and proxies are a paid, fragile arms race against YouTube's terms.
- **User's laptop on a home connection: expected to work, not verified.** This is an inference: the block is on IP reputation, `yt-dlp` and `youtube-transcript-api` are maintained for exactly this use, and the same requests are what a browser makes. It can still fail (VPN exit nodes, a shared office IP, a YouTube change the week of the build). So task C0-1 is a five-minute laptop probe with a runnable check, and the design never depends on it: the paste path is always available.
- **A browser on the user's phone or laptop always works**, because the user is the signed-in human. YouTube's "Show transcript" panel is therefore the universal fallback: copy, paste, done.
- **CI can check existence and embeddability (oEmbed, thumbnail, the embed page's `playableInEmbed`). CI cannot check captions.** Caption availability is recorded once, at ingest, by whoever had the transcript.

**Verdict on "paste a link":** it runs unattended only as a local command on the user's machine. From a cloud session the agent tries the fetch once, and on a block it asks for the transcript with exact copy instructions. The plan treats both as first-class.

## 2. Timing: inputs, alignment, padding

### 2.1 Accepted inputs

| Input | Where it works | What happens |
|---|---|---|
| **A. Link only** | Laptop | `yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs "en.*" --sub-format json3`. Prefer an uploaded English track over the auto track. json3 from auto-captions carries per-word offsets, which gives the best windows. |
| **B. Link + timestamped transcript** | Anywhere, including a cloud session and a phone | Parsed locally. Formats: YouTube "Show transcript" copy-paste, WebVTT, SRT, json3. The parser sniffs the format; the user never names it. |
| **C. Link + untimed transcript** (an official podcast transcript, often with speaker names) | Laptop only | Captions are fetched as in A, then the untimed text is word-aligned to the timed captions (Needleman-Wunsch on normalised tokens). Result: the good text and speaker labels, with caption timing. Optional task C4-3; until then this input is refused with the reason. |
| Transcript, no link | Refused | A card cannot exist without a video id. The tool asks for the link, nothing else. |
| Untimed transcript, no way to fetch captions | Refused | Forced alignment needs the audio (download plus a speech model). Out of scope: it is heavy, and the "Show transcript" paste already solves the case. |

The YouTube paste format alternates a time line and a text line:

```
0:00
so I was on the train this morning and it
0:03
was five minutes late
1:02:07
wars have started over less
```

A throwaway parser for this and for WebVTT ran correctly in the sandbox (Appendix A.5). Things the real parser must handle: `h:mm:ss`, chapter-heading lines (text with no preceding time change), "X seconds" accessibility text that some browsers copy alongside the time, `[Music]`/`[Laughter]`/`>>` markers, and the rolling two-line duplication in auto-generated VTT.

### 2.2 Internal transcript form

Every input becomes the same thing:

```ts
type Segment = { i: number; t: number; end: number | null; text: string; words?: { t: number; w: string }[] };
type Transcript = { youtubeId: string; kind: "manual" | "auto" | "pasted"; lang: string; segments: Segment[]; sha256: string };
```

`end` is the next segment's `t` when the format has no end time. `sha256` is over the normalised segment text and is stored on each card as provenance. Full transcripts are cached in `.corpus-cache/` (gitignored) and **never committed**: the repo holds only the two quoted lines per card.

### 2.3 Clip window

The model picks segment ranges for the trigger and the response (section 5). Code computes the window:

| Step | Rule |
|---|---|
| Raw start | Time of the first trigger word when word offsets exist; otherwise `t` of the first trigger segment |
| Raw end | Time of the last response word plus 0.4 s when word offsets exist; otherwise `end` of the last response segment |
| Lead-in | `start = rawStart - 0.7 s` (word timing) or `- 1.0 s` (1-second paste timing). Captions run slightly ahead of speech, and a cold open on the first syllable sounds clipped |
| Tail | `end = rawEnd + 2.5 s`. The laugh is evidence that the line landed and is part of what the card teaches |
| Optional setup | The model may flag one extra preceding segment as needed context; if so the start moves to that segment |
| Bounds | Clamp to `[0, duration]`. Reject the candidate if trigger start to response end exceeds 25 s (not a quick exchange). Final window must be 6 to 30 s; target 8 to 20 |
| Rounding | Round outward to 0.5 s |
| Human | The reviewer nudges start and end in 0.5 s steps while the clip loops. **The approved window is the one the human watched**, stored as is |

Fractional seconds need no player change: `src/lib/clip-controller.ts` already floors `start` and ceils `end` for the player parameters and uses the exact values in the loop poll (lines 89, 90, 167, 168).

## 3. Authenticity

### 3.1 Verbatim by construction

The extraction schema has **no field where the model's text becomes dialogue unchecked**. For each candidate the model returns `trigger: { from, to }` and `response: { from, to }` as segment indices, plus optional word trims. Code builds the raw span from the transcript. The one dialogue string the model writes, `display`, is accepted only under the rule below, so an invented line cannot survive.

Display text versus raw span. Auto-captions have no punctuation or capitals, so a raw span is not presentable. The model may also return a `display` string per line, and code accepts it only if this holds:

> After normalising both sides (lowercase, strip punctuation and bracketed markers, collapse spaces), the tokens of `display` are a **contiguous run of whole tokens** of the raw span (compared word by word, never by character, so a cut inside a word fails).

So the model may punctuate, capitalise and trim the edges. It may not insert, replace, reorder or drop interior words. A failing `display` is discarded and the candidate is dropped (not repaired). Each card stores `raw` beside the shipped line, so the check re-runs in CI forever.

Caption errors (auto-captions mishear names and punchlines). Only the human may fix them, in review, after hearing the clip. A human edit sets `provenance.edited: true` on that line and the substring rule is waived for it; CI reports the count of edited lines so it stays visible.

### 3.2 Speakers

Auto-captions carry no speaker labels, and the model cannot hear voices. The rules:

1. **Default is a role**, exactly as the seed data does it: "Host", "Guest", "Panellist". The model assigns roles from the text (who asks, who is introduced, `>>` change marks in uploaded captions).
2. **Names are proposed per video, not per card.** The model fills a roster: `{ role, proposedName, evidence }`, where evidence is a transcript quote ("please welcome ...") or the oEmbed title or channel. No evidence, no proposal.
3. **A real name ships only when the user confirms it in review.** The roster is confirmed once per video (one keypress per person), and every card from that video inherits it. Unconfirmed names fall back to the role.
4. **Who said which line** is the model's inference from the text. The reviewer sees the speaker on screen; "speakers are the right way round" is one of the three things approval asserts. A swap key fixes the common error in one press.

Putting words in a real person's mouth is the main harm this pipeline can do. That is why names are opt-in and human-confirmed while the lines themselves are machine-checked.

### 3.3 Who verifies what

| Layer | Checks | Catches |
|---|---|---|
| Code, at draft time and again in CI | Substring rule, schema, window bounds, line-length caps, dedupe, move id exists, oEmbed 200 | Invented or altered lines, bad windows, duplicates, dead videos |
| Model, inside the extraction call | Self-score 1 to 5 on three questions (section 5.3); only 4+ survive | Weak, scripted or context-dependent bits |
| **Human, per card** | Watches the exact window in the real embedded player | Wrong speaker, misheard captions, window that cuts the laugh, a clip that will not embed, a bit that is not funny |

A second model pass (a fresh-context judge) is **not** in v1. It is added only if the measured human approval rate over the first 10 videos is below 60% (task C4-1 decides with numbers).

### 3.4 The review step, designed for speed

Approval asserts three things: the window contains both lines and the reaction; the lines match what is said; the speakers are right. Target: under 15 seconds per card, most of it watching.

**Laptop: `npm run corpus:review`** starts a local page at `http://localhost:4747` (a real origin, which the YouTube embed requires). One candidate at a time:

- The clip loops its exact window in the IFrame player, same parameters as the app (D-CLIP-4), sound on after the first click.
- Under it: cue, move, the two lines with speakers, breakdown, the model's one-line reason, and the raw caption span.
- Keys: `A` approve, `R` reject, `[` `]` move start, `;` `'` move end (0.5 s), `S` swap speakers, `E` edit a line (sets `edited`), `M` change move, `Enter` next. First card of each video shows the roster for name confirmation.
- Approve moves `content/drafts/<id>.json` to `content/cards/<id>.json`; reject deletes the draft and records the window in `content/videos/<youtubeId>.json` so it is never proposed again.
- At the end it prints the `git` commands (or runs them with `--commit`) to branch, commit and open a PR.

**Cloud session or phone: the PR is the review queue.** The agent opens a PR whose body is a checklist, one row per candidate, each with a link that plays the window:

- If a preview deployment exists: `<preview-url>/saved?card=<id>`. This already opens any card in the real app with the real loop, saved or not (`src/components/saved/saved.tsx`: line 75 accepts any id in the dataset, lines 148 to 149 and 208 render `CardDetail` for it with no saved check). Previews build with drafts included (section 6.4). **No preview deployment exists today** (PLAN.md Phase 6 is blocked on Vercel access), so this is a prerequisite of C3-2, not a given.
- Otherwise: `https://www.youtube.com/watch?v=<videoId>&t=<floor>s` with the end time written beside it ("watch to 5:26"). The window is not enforced, so this is the slower fallback. A bare `/embed/<id>?start=&end=` link is **not** relied on: opened directly it depends on the Referer the browser sends (Appendix A.4), which is unverified from a PR page.

The user ticks the rows to keep and comments any fixes ("3: swap speakers"). The agent, subscribed to the PR, moves ticked drafts to `content/cards/`, deletes the rest, and CI goes green. Nothing unticked can reach production: production builds read `content/cards/` only, and CI on the PR fails while `content/drafts/` is non-empty.

## 4. Where it runs

| | (a) Claude Code workflow | (b) Local CLI + Anthropic API | (c) In-app intake page |
|---|---|---|---|
| User effort | Paste link or transcript into a session, tick boxes on a PR | `npm run clip -- <url>`, press keys in the review page | Paste in the app |
| Link-only works? | Only when Claude Code runs on the user's machine. **In a cloud session it is blocked** (section 1) | Yes on a laptop (inferred) | **No.** The fetch would run on Vercel, a datacentre |
| API key | None. The session agent does the extraction; cost is the user's Claude plan usage | `ANTHROPIC_API_KEY` in the user's shell, or an `ant auth login` profile, both read by a bare `new Anthropic()`. Never in the repo, never `NEXT_PUBLIC_*` | A server secret plus auth and rate limiting to stop strangers spending it. The app is static with no backend today |
| Cost per video | No API bill | $0.13 to $0.61 (section 4.2) | Same, plus hosting |
| Latency | 2 to 5 minutes including PR creation | Fetch 5 to 15 s; extraction about 20 s to 2 min; then review | Function timeouts become a design problem for long transcripts |
| How cards reach the site | PR | PR | A static site cannot write to itself: it would need to commit through the GitHub API or grow a database |
| Failure modes | Fetch blocked in cloud (ask for paste); agent drifts from the rubric (same code checks catch it) | yt-dlp out of date or blocked; missing key; no JS runtime for yt-dlp | All of the above plus abuse, key leakage, auth, and it contradicts the spec ("Out of scope: accounts, user submissions") |

### 4.1 Recommendation: (d) hybrid, one core with two front doors

Build the deterministic core once: parse, align, verify verbatim, dedupe, mint ids, write drafts, validate, review. It needs no model and no key. Then:

- **Front door 1, local CLI (b):** `npm run clip -- <url>` fetches captions, calls `claude-opus-5-5`, writes drafts, opens the review page. This is the "paste a link and walk away for a minute" path, and the only one where link-only can work.
- **Front door 2, Claude Code skill (a):** `.claude/skills/add-clips/`. The session agent runs the core's parse step, reads the same rubric file the CLI uses as its system prompt, writes a candidates file in the same schema, and runs the core's draft step, which applies the identical checks. Then it opens the PR checklist. This is the path for a phone, or for anyone without a key.

Reject (c). It cannot fetch captions, needs a backend the product does not have, needs key storage and abuse protection, and the spec rules submissions out. A static site whose content arrives by PR is the right shape: review, history and rollback come free.

Why not (a) alone: link-only is the lowest-effort input and a cloud session cannot do it. Why not (b) alone: it needs a laptop, a key and a terminal every time.

### 4.2 Cost per video (estimate, not measured)

No transcript could be fetched here and no API credentials are present, so token counts are assumptions, stated so they can be checked. Task C2-3 replaces them with `client.messages.countTokens()` and real `usage` numbers.

Assumptions: speech at 150 to 170 words per minute; about 1.35 tokens per word; each segment carries an index and a time (about 6 extra tokens, about 25 segments a minute); fixed prompt (rubric, move list with definitions, examples) about 3,000 tokens; thinking is billed as output. Prices from the model table: `claude-opus-5-5` at $4 per million input tokens and $20 per million output tokens.

| Video | Input tokens | Output tokens (incl. thinking) | Cost |
|---|---|---|---|
| 10-minute clip | about 7,000 | about 5,000 | **about $0.13** |
| 45-minute panel show | about 23,000 | about 12,000 | **about $0.33** |
| 2-hour podcast | about 53,000 | about 20,000 | **about $0.61** |

Levers, not needed at these sizes: the Batches API halves the price for a queued backlog; prompt caching on the fixed prefix helps only when several videos run within five minutes. Through the Claude Code door there is no API bill.

## 5. Extraction design

### 5.1 The call

TypeScript, official SDK, in `scripts/corpus/extract.ts`:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const client = new Anthropic(); // key from the environment or an `ant auth login` profile
const stream = client.messages.stream({
  model: "claude-opus-5-5",
  max_tokens: 64000, // thinking counts as output; streaming avoids HTTP timeouts at this size
  output_config: { effort: "high", format: zodOutputFormat(ExtractionSchema) },
  system: RUBRIC, // scripts/corpus/rubric.md + move list + worked examples
  messages: [{ role: "user", content: renderTranscript(transcript, videoMeta) }],
});
const message = await stream.finalMessage();
if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") { /* report, write nothing */ }
const text = message.content.find((b) => b.type === "text")?.text ?? "";
const out = ExtractionSchema.parse(JSON.parse(text)); // our own validation, always
```

Streaming is the default because a 90-minute single pass is estimated at well over 16,000 output tokens once thinking is counted (section 4.2), and a non-streaming call that size risks both truncation and a timeout. `client.messages.parse()` is the simpler non-streaming form and is fine for short videos; the skill documents structured outputs as working with streaming but shows no streaming `parse` helper, so the sketch validates with Zod itself.

Notes for the implementer, from the `claude-api` skill:

- On `claude-opus-5-5`, thinking is always on. Omit `thinking` (or send `{ type: "adaptive" }`, which is equivalent); `{ type: "disabled" }`, `budget_tokens`, `temperature` and a forced `tool_choice` all return 400. Depth is `effort`, whose default on this model is `medium`, so `high` is set explicitly.
- Structured output is `output_config.format`, not the deprecated `output_format`. Numeric and length limits are not enforced by the API; the SDK strips them and validates client-side, and our own checks run after that anyway.
- Always check `stop_reason` before reading output. The skill's default is to enable the server-side refusal fallback (`betas: ["server-side-fallback-2026-07-01"]`, `fallbacks: "default"` on `client.beta.messages`); the implementer confirms the binding on the beta namespace from the SDK before using it, and tells the user it is on.
- Use the SDK's typed errors (`Anthropic.AuthenticationError`, `RateLimitError`, `APIError`), most specific first.
- A `max_tokens` stop is an error that writes nothing. The fix is a smaller chunk (5.4), never a partial result.

### 5.2 Structured-output schema

```ts
const Span = z.object({ from: z.number().int(), to: z.number().int(), display: z.string() });
const Candidate = z.object({
  trigger: Span,
  response: Span,
  setupFrom: z.number().int().nullable(),          // one earlier segment if the trigger needs it
  triggerRole: z.string(),                          // key into roster
  responseRole: z.string(),
  move: z.enum(MOVE_IDS),                           // built from src/content/moves.ts at run time
  proposedMove: z.object({ label: z.string(), definition: z.string(), whyNotExisting: z.string() }).nullable(),
  cue: z.string(),
  breakdown: z.string(),
  scores: z.object({ standsAlone: z.number().int(), unscripted: z.number().int(), moveIsClear: z.number().int() }),
  reason: z.string(),                               // one line, shown to the reviewer, never shipped
});
const ExtractionSchema = z.object({
  roster: z.array(z.object({ role: z.string(), proposedName: z.string().nullable(), evidence: z.string().nullable() })),
  sourceName: z.string().nullable(),                // show or podcast name, with the title as evidence
  unsuitable: z.string().nullable(),                // e.g. "scripted monologue, no second speaker"
  candidates: z.array(Candidate),
});
```

`display` is the only text the model writes about dialogue, and section 3.1 constrains it. `cue` and `breakdown` are the model's own words by design.

### 5.3 Rubric (the system prompt, in outline)

The rubric states the purpose and the bar, then lets the model judge. Prompts for this model work better as reasons than as rule lists.

- **What a card is:** one person says something, another answers quickly, and the answer gets a laugh by doing something nameable to what was just said. The viewer should be able to see the trick and reuse it.
- **Hard requirements:** two different speakers; the response reacts to the trigger (not a prepared bit that would have been said anyway); both lines make sense to someone who has seen nothing else of the show, with at most one segment of setup; the response fits on a phone card.
- **Reject:** monologue and stand-up material, read-out scripted jokes, bits that need a visual, in-jokes that need earlier context (unless the move is Callback and the earlier line is inside the window), humour that is only an insult, anything that depends on a slur or on mocking a private individual.
- **Precision over recall, said plainly:** the user watches every candidate. A weak candidate costs them 15 seconds and teaches them to skim. Returning nothing from a video is a good result. Hard cap: 12 candidates per hour of content, 5 for anything under 10 minutes.
- **Scores:** `standsAlone`, `unscripted`, `moveIsClear`, each 1 to 5 with anchors. Code keeps a candidate only when all three are 4 or more. The model is told this, so that it scores honestly instead of inflating to keep a favourite.
- **Moves:** the list with a one-line definition each (a new optional `definition` field on `Move`) and one worked example each.

### 5.4 Chunking

`claude-opus-5-5` has a 1M-token context, and a 3-hour transcript is about 80,000 tokens, so context never forces chunking. Attention and callbacks decide it:

- **Up to 90 minutes: one call.** The whole conversation is visible, so callbacks and running jokes are found.
- **Longer: 45-minute chunks with a 3-minute overlap**, run in sequence. Each later chunk receives a short list of "earlier bits" (segment index plus one line) produced by the previous chunk so callbacks can still be recognised. Candidates are deduplicated by segment index across overlaps.

Nothing is ever silently truncated. A transcript the tool cannot fit or parse is an error with a reason.

### 5.5 Expected yield (unmeasured; C4-1 measures it)

| Content | Candidates shown per hour | Expected approved per hour |
|---|---|---|
| Panel show (several comics riffing) | 6 to 12 | 4 to 8 |
| Chat show interview | 3 to 6 | 2 to 4 |
| Conversational podcast | 1 to 4 | 1 to 3 |
| Stand-up, monologue, scripted sketch | 0 (flagged `unsuitable`) | 0 |

The target is a human approval rate of 70% or better. Below 60% over the first 10 videos, tighten the rubric and add the judge pass. Above 90%, relax the cap.

### 5.6 Moves: mapping and new moves

- The schema's `move` is an enum built from `src/content/moves.ts`, so an unknown move cannot be emitted.
- When nothing fits well, the model still picks the closest move **and** fills `proposedMove`. The card can ship under the closest move; the proposal is logged in `content/move-proposals.json` with the card id.
- A new move is added only when the same proposal (matched by the reviewer, not by string) has at least 3 approved cards from at least 2 videos, **and the user says yes**. Adding it is a small PR: one entry in `moves.ts`, re-label of those cards. The list stays near the spec's 12 to 15.
- UI impact is nil: `moveHue()` already hashes unknown ids onto the hue ring (`src/lib/move-hue.ts`). A hand-picked hue is the design owner's choice.
- Move ids are as permanent as card ids: saved lists group by them.

### 5.7 Cue and breakdown style

Both follow the seed data, which the UI was designed around.

- **Cue:** the situation to notice, general enough to recur in the reader's own life, with no names and no spoiler. Starts with "Someone ..." or a similarly plain subject, present tense, 60 characters or fewer. Good: "Someone mentions a small inconvenience". Bad: "Guest complains about trains" (too specific), "A perfect setup for escalation" (names the move).
- **Breakdown:** what the responder did, past tense, verb first, no subject, 80 characters or fewer, quoting at most a few words. Good: "Blew a tiny problem up to historic scale". Bad: "This is funny because ..." or anything that judges the joke.
- British spelling, matching the seeds.

## 6. Hygiene

### 6.1 Checks

| Check | When | How | Blocks |
|---|---|---|---|
| Video exists and is public | Ingest, CI (PRs touching `content/`), weekly | oEmbed 200 and thumbnail 200. Both proven to work from a datacentre | Ingest and PR |
| Embedding allowed | Ingest, CI (changed videos), weekly | Embed page fetched with a `Referer`: `previewPlayabilityStatus.status` is `OK` and `playableInEmbed` is true (proven from a datacentre, A.4). This scrapes HTML, so a parse failure is a warning, not a failure. oEmbed is also expected to answer 401 when the owner disabled embedding (**unverified here**) | Ingest and PR |
| Plays in the embed, in practice (region, age gate, music claims) | Review | The human just watched it in the embed player. `checkedAt` records the date | Approval |
| Captions exist (the app requests them, D-CLIP-4) | Ingest only | `kind` of the transcript: `manual`, `auto`, or `pasted` (a "Show transcript" paste proves a track exists). **Cannot be checked from CI** | Ingest |
| Link rot | Weekly scheduled workflow | oEmbed over every shipped video; opens an issue listing failures. Never blocks a build | Nothing; a dead card is retired by PR |

### 6.2 Dedupe

1. **Same video, overlapping window:** intersection over union of the two windows above 0.5. Checked against shipped cards, current drafts and previously rejected windows.
2. **Near-duplicate line** (the same moment re-uploaded in a compilation): identical normalised response line, or token-set Jaccard of 0.8 or more on response plus trigger. Flagged for the reviewer, with the existing card shown.
3. **Video already ingested:** `content/videos/<youtubeId>.json` exists. The CLI says when, how many cards, and requires `--again`.
4. **Variety cap:** at most 6 shipped cards per video, so one episode cannot dominate the shuffle.

### 6.3 Stable ids

- Format: `q` plus 8 lowercase base32 characters from `crypto.randomBytes` (for example `q7k2m9x4a`). Opaque on purpose: nothing in it can go stale.
- Minted once, when the draft file is written. The file name is the id. Retiming a window, fixing a line or changing the move never changes it.
- CI rule: compared with the base branch, no file under `content/cards/` may be deleted or renamed unless `content/retired/<id>.json` is added in the same PR (a tombstone with a reason). Tombstoned ids are never reused. Saves that point at a retired id are already ignored on read and kept on write (D-SAVE-1).
- The 14 seed ids (`c01` to `c14`) are placeholders and leave production when the live dataset is switched on (6.4). The user should expect placeholder saves to vanish at that moment; nothing real is lost.

### 6.4 Storage format

**Decision: one JSON file per card.** `cards.ts` as a single growing array fails in three ways once cards arrive by PR: every two open PRs conflict at the end of the array; a machine has to edit TypeScript source; and a reviewer cannot approve or reject one card without touching the others.

```
content/
  cards/<id>.json        shipped cards (production reads only this)
  drafts/<id>.json       awaiting review (never in a production build)
  retired/<id>.json      tombstones
  videos/<youtubeId>.json  title, channel, source name, confirmed roster, transcript kind and hash,
                           checkedAt, rejected windows
  move-proposals.json
```

A card file:

```json
{
  "id": "q7k2m9x4a",
  "move": "escalation",
  "cue": "Someone mentions a small inconvenience",
  "trigger": { "speaker": "Guest", "line": "My train was five minutes late today.", "raw": "my train was five minutes late today" },
  "response": { "speaker": "Host", "line": "Five minutes? Call the historians.", "raw": "five minutes call the historians" },
  "breakdown": "Blew a tiny problem up to historic scale",
  "clip": { "youtubeId": "xxxxxxxxxxx", "start": 312.5, "end": 326 },
  "source": "Show name",
  "provenance": {
    "transcript": { "kind": "auto", "sha256": "...", "segments": [141, 146] },
    "speakersConfirmed": false,
    "edited": false,
    "extractor": "claude-opus-5-5",
    "rubricVersion": 1,
    "approvedAt": "2026-11-20",
    "checkedAt": "2026-11-20"
  }
}
```

Wiring into the app, without touching the UI:

- `scripts/corpus/build.ts` reads `content/`, validates, strips `raw` and `provenance`, and writes `src/content/cards.generated.ts` (gitignored, so it never conflicts). It runs from `postinstall`, `predev`, `prebuild` and `pretest`, and as the first step of CI.
- `src/content/cards.ts` becomes `export { cards } from "./cards.generated";`. **`src/content/index.ts` and its exports do not change.**
- Dataset switch, one env variable read by the generator: `QUIPDECK_DATASET=seed` emits today's 14 placeholders from `src/content/seed-cards.ts` (the current file, moved); `live` emits `content/cards/`; `live+drafts` adds drafts (local dev and preview deployments only). The default when the variable is unset is `seed`. The dataset is baked in at `prebuild`, so e2e must set it where it builds: `e2e/support/server.cjs` runs `npm run build` with `process.env` (line 92), and C1-1 adds `QUIPDECK_DATASET: "seed"` to that env. `e2e/support/harness.cjs` imports `src/content/cards.ts` directly with Node (lines 44 to 46); C1-1 points it at `seed-cards.ts`. A reused build (`E2E_SKIP_BUILD=1`) must have been built with `seed`; the harness asserts the served deck has 14 cards and says so if not. With that, the 177 e2e tests, `BROKEN_CLIP` and the cue strings in the MAN list keep working however the corpus grows. Production stays on `seed` until the user says the live set is big enough (open question 3), then one line flips it.

Weighing it:

| | One `cards.ts` | Per-card JSON (chosen) | One file per video |
|---|---|---|---|
| Merge conflicts | Every concurrent PR | None | Only when the same video is re-ingested |
| Review ergonomics | One long diff | One small file per card; approve is a file move, reject is a delete | Card-level approval needs in-file edits |
| Machine writes | AST or string surgery | `JSON.stringify` | `JSON.stringify` |
| Cost | None | A generator step and a gitignored file | Same |

### 6.5 Schema validation in CI

There is no CI workflow in the repo today. Task C1-3 adds `.github/workflows/ci.yml`: `npm ci`, `npm run corpus:check`, then the existing QG chain. `corpus:check` validates every file under `content/` with the same Zod schema the pipeline writes with, and also asserts: file name equals id; ids unique across cards, drafts and retired; move exists; window 6 to 30 s with `end > start`; length caps (section 7.2); substring rule for every unedited line; `source` present; no deleted ids without a tombstone; `content/drafts/` empty (on PRs and main). oEmbed runs only for videos added or changed in the PR, so CI stays fast and mostly offline.

## 7. Schema changes, for the lead (a UI redesign is running)

### 7.1 Breaking changes to the UI contract

**None.** `WitCard`, `Speaker` and every export of `src/content/index.ts` keep their shape; `Move` gains one optional field (S4). The pipeline's extra fields live in JSON and are stripped before the app sees them.

### 7.2 Things the UI lead must know anyway

| # | Change | Kind | Effect on UI work |
|---|---|---|---|
| S1 | `src/content/cards.ts` becomes a one-line re-export of a generated, gitignored file. Seeds move to `src/content/seed-cards.ts` | File move | Do not edit `cards.ts`. Import from `@/content` as now. A fresh checkout needs `npm install` (postinstall generates) before `tsc` |
| S2 | `clip.start` and `clip.end` may be fractional (0.5 s steps) | Value range | The player already handles it. Do not format or assume integers |
| S3 | `source` is required on every live card (validator rule; the TS type stays optional so seeds still type-check) | Tightening, data only | D-CLIP-11's source line will always render on real cards. Design for it being present |
| S4 | `Move.definition?: string` | Additive, optional | Used by the extraction prompt. Free for the UI to show or ignore |
| S5 | Speakers may be real names once confirmed, otherwise roles | Value range | Speaker labels up to 24 characters, not just one word |
| S6 | Length caps the validator enforces: cue 60, trigger line 120, response line 120, breakdown 80, speaker 24 | New constraint | **The lead should confirm these against CB-8** (back fits one phone viewport at 360x640). Seeds top out near 40, 45, 65 and 50, so real speech will be longer than anything the layout has seen. If the redesign needs tighter caps, say so and the rubric follows |
| S7 | `/saved?card=<id>` is used as the review deep link for cards that are not saved, on a preview deployment | Dependency | Keep it opening any known id, or tell the pipeline what replaces it. Needs Vercel previews (Phase 6, currently blocked) |
| S8 | Corpus size goes from 14 to hundreds; the move list may grow past 10 | Scale | The whole deck is in the client bundle (about 450 bytes a card). Revisit at about 1,000 cards. Unknown move ids already get a hue |
| S9 | Tests pinned to seed data run with `QUIPDECK_DATASET=seed`; C1-1 makes two small edits in `e2e/support/harness.cjs` and `e2e/support/server.cjs` | Test setup, shared files | The lead sequences those two edits against any redesign task that owns `e2e/support/**`. New UI tests should not hard-code live card text |
| S10 | New dev dependencies: `@anthropic-ai/sdk`, `zod` | `package.json` | Scripts only, not imported by `src/` |

Considered and not proposed: a `provenance` or transcript hash on `WitCard` (kept in JSON, the UI has no use for it); a `video` title or channel field (attribution is `source`; add later if the UI wants a link out); a `status` field (draft or shipped is the directory, so a draft cannot leak through a forgotten filter).

## 8. Build plan (tiered swarm)

Tiers: **implementer = Opus, high effort. planner and review = Fable.** No Sonnet or Haiku anywhere, including the extraction model, which is `claude-opus-5-5`.

Standing rules as in `PLAN.md`: a task edits only the files it owns; no dependency unless the task names it; **QG** = `npm run lint && npx next typegen && npx tsc --noEmit && npm test && npm run build`. No corpus task edits `src/app/**` or `src/components/**`. The only files shared with the redesign are all in C1-1: `package.json`, `package-lock.json`, `.gitignore`, `src/content/{cards,types,moves,content.test}.ts` and two small edits in `e2e/support/{harness,server}.cjs`. The lead hands those off explicitly; every later corpus task stays inside `scripts/corpus/**`, `content/**`, `.github/**`, `.claude/skills/**` and docs.

### Phase C0: prove the laptop path (user, 5 minutes, no code)

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| C0-1 | user | On the laptop, home network: `pipx run yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs "en.*" --sub-format json3 -o "probe_%(id)s" "https://www.youtube.com/watch?v=arj7oStGLkU"`. Paste the last lines of output to the lead | none | A file `probe_arj7oStGLkU.en.json3` exists and `grep -c tOffsetMs` on it is above 0. If it fails, the lead records the error and link-only is demoted to "best effort"; nothing else in the plan changes | none | medium |

### Phase C1: storage and validation (no model, no key)

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| C1-1 | implementer | Card JSON schema (Zod), generator, dataset switch, seed move. Add dev deps `zod`, `@anthropic-ai/sdk`; register **every** npm script the plan uses, so no later task touches `package.json`: `corpus:build`, `corpus:check`, `corpus:check:selftest`, `corpus:extract`, `corpus:review`, `clip` (each runs `node scripts/corpus/<file>.ts`; files that do not exist yet exit with "not built yet"), plus the `postinstall`/`predev`/`prebuild`/`pretest` hooks; gitignore the generated file and `.corpus-cache/`. Scripts are `.ts` run by Node 22 type stripping (verified on Node 22.23.4, A.6; erasable syntax only, explicit `.ts` import extensions) | `scripts/corpus/schema.ts`, `scripts/corpus/build.ts`, `content/**` (empty dirs with `.gitkeep`), `src/content/cards.ts`, `src/content/seed-cards.ts`, `src/content/content.test.ts`, `src/content/moves.ts` (adds `definition`), `src/content/types.ts` (adds optional `definition`), `package.json`, `package-lock.json`, `.gitignore`, `e2e/support/harness.cjs` (content import path and a 14-card assertion only), `e2e/support/server.cjs` (build env only) | QG passes. `npm run e2e` still 177/177, and again with `QUIPDECK_DATASET=live` exported in the shell (the harness must still build and test the seed deck). `QUIPDECK_DATASET=live npm run corpus:build && npx tsc --noEmit` passes with zero cards. `git status --porcelain` is clean after a build (generated file ignored). `git diff origin/claude/epic-volta-ez6fjc -- src/content/index.ts` is empty | none | medium |
| C1-2 | implementer | Transcript parsers (YouTube paste, VTT, SRT, json3) to the `Transcript` form; format sniffing; normaliser; window computation (2.3); substring rule (3.1) | `scripts/corpus/transcript/**`, `scripts/corpus/window.ts`, `scripts/corpus/verbatim.ts`, their `*.test.ts`, `scripts/corpus/fixtures/**` | `npx vitest run scripts/corpus` passes with at least: 4 format fixtures parsed to identical segments for the same content; paste with `h:mm:ss` and chapter headings; rolling-duplicate auto VTT; window rules at each bound; substring rule accepts punctuation and edge trims and rejects an inserted, replaced and dropped word | C1-1 | medium |
| C1-3 | implementer | `corpus:check` (all assertions in 6.5), id minting, dedupe (6.2), oEmbed and thumbnail checks, CI workflow, weekly link-rot workflow | `scripts/corpus/check.ts`, `scripts/corpus/ids.ts`, `scripts/corpus/dedupe.ts`, `scripts/corpus/youtube-meta.ts`, tests, `.github/workflows/ci.yml`, `.github/workflows/link-rot.yml` | Unit tests pass. A scripted negative suite (`npm run corpus:check:selftest`) builds temp trees and confirms exit 1 for each of: deleted card without tombstone, file name not equal to id, unknown move, 40 s window, altered line with `edited: false`, missing `source`, leftover draft, duplicate window. `node scripts/corpus/youtube-meta.ts eRsGyueVLvQ` prints title "Sintel - Open Movie by Blender Foundation"; with `BROKEN_CLIP` exits 1 | C1-1, C1-2 (uses `verbatim.ts` and `window.ts`) | low |
| C1-R | review (Fable) | Review C1 against sections 3.1, 6 and 7. Try to get an invented line or a changed id past `corpus:check` | none | Written verdict PASS or FAIL with the bypass attempts listed | C1-2, C1-3 | n/a |

C1-1, then C1-2, then C1-3: the check imports the verbatim and window rules, so the order is sequential.

### Phase C2: extraction

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| C2-1 | planner (Fable) | Write the rubric (5.3, 5.7): purpose, bar, score anchors, move definitions and one worked example per move, cue and breakdown style. Hand-label an eval set: 3 transcripts the user supplies (one panel show, one chat show, one podcast), marking every exchange a careful human would ship | `scripts/corpus/rubric.md`, `scripts/corpus/eval/**` | Files exist; each eval transcript has a labels file; the user has read and accepted the rubric | C0-1 or user-pasted transcripts | medium |
| C2-2 | implementer | `extract.ts`: render transcript with indices, call `claude-opus-5-5` per 5.1, schema per 5.2, chunking per 5.4, score filter, then the code checks from C1. `draft.ts`: candidates file to draft JSON files (shared by both front doors). Recorded-response fixtures so tests need no network | `scripts/corpus/extract.ts`, `scripts/corpus/draft.ts`, `scripts/corpus/render.ts`, tests, fixtures | `npx vitest run scripts/corpus` passes offline, including: a fixture response with one invented `display` yields that candidate dropped and the rest drafted; a candidate scoring 3 is dropped; `stop_reason: "refusal"` and `"max_tokens"` write nothing and exit non-zero. With a key present, `npm run corpus:extract -- scripts/corpus/eval/<one>.vtt --id <id>` writes drafts and `corpus:check --allow-drafts` passes | C1-R, C2-1 | high |
| C2-3 | implementer | CLI `npm run clip -- <url> [--transcript file]`: oEmbed check, already-ingested check, yt-dlp fetch (clear messages for: not installed, no JS runtime, bot wall, no English captions), extract, draft, print cost from `usage` | `scripts/corpus/cli.ts`, `scripts/corpus/fetch-captions.ts`, tests | On the user's laptop: `npm run clip -- https://www.youtube.com/watch?v=<eval video>` ends with N drafts and a printed token and dollar count. In the sandbox: the same command exits non-zero with the paste instructions (bot wall), and `--transcript` with an eval file succeeds. Replace the estimates in 4.2 with measured numbers | C2-2 | medium |
| C2-R | review (Fable) | Run the eval set. Report precision (drafts a human would ship divided by drafts), recall against the labels, and every failure with its cause | none | Report in `docs/gates/corpus/c2-eval.md`. Gate: precision 0.7 or better on the eval set, zero verbatim violations, zero wrong-move enum values | C2-3 | n/a |

### Phase C3: review and the Claude Code door

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| C3-1 | implementer | `corpus:review` local server and single-page reviewer (3.4): real IFrame player on `localhost:4747`, keys, roster confirmation, approve as file move, reject records the window. Plain HTML and one script; no framework, no app code | `scripts/corpus/review/**` | Playwright script against the server with the stubbed IFrame API from `e2e/support/yt-stub.js`: approve moves the file and `corpus:check` passes; reject deletes it and re-running draft does not re-propose that window; `]` changes `clip.end` by 0.5; `S` swaps speakers; edit sets `edited: true`. Manual: the user reviews 10 real drafts and reports seconds per card | C2-R | medium |
| C3-2 | implementer | Claude Code skill `add-clips`: steps for link, link plus transcript, and blocked fetch (the paste instructions); the agent writes a candidates file in the 5.2 schema using `rubric.md`, runs `draft.ts`, opens a PR with the checklist body, and applies ticks. `QUIPDECK_DATASET=live+drafts` documented for previews | `.claude/skills/add-clips/**`, `scripts/corpus/pr-body.ts`, test | `node scripts/corpus/pr-body.ts` on a fixture drafts dir prints a checklist with one playable link per draft. Dry run in a cloud session with a pasted eval transcript: a PR appears, CI is red only for "drafts awaiting review", ticking two rows and asking the agent to apply leaves exactly two files in `content/cards/` and CI green. The review link is the preview deep link when `PLAN.md` Phase 6 is done, otherwise the watch link | C2-R; Vercel previews (Phase 6) for the fast link | medium |
| C3-R | review (Fable) | End-to-end review of both doors, including trying to ship an unticked or unwatched card | none | Verdict PASS or FAIL | C3-1, C3-2 | n/a |

### Phase C4: pilot and switch-on

| ID | Tier | Task | Files owned | Acceptance check | Depends on | Risk |
|---|---|---|---|---|---|---|
| C4-1 | user + planner (Fable) | The user ingests 10 videos of their choice. The planner records per video: candidates, approved, seconds per card, cost, failure causes; decides on the judge pass, the cap, and rubric changes | `docs/gates/corpus/c4-pilot.md`, `scripts/corpus/rubric.md` | Table filled from real runs. Decision rules applied: approval under 60% adds the judge pass (new task); 60 to 90% ships as is; over 90% raises the cap | C3-R | medium |
| C4-2 | implementer | Flip production to `live` (after the user agrees the set is large enough), retire nothing, update `VALIDATION.md` known limits and `README.md` with the two commands | the dataset default in `scripts/corpus/build.ts`, `VALIDATION.md`, `README.md` | QG and e2e pass (e2e still on seed). `QUIPDECK_DATASET=live npm run build` passes. On the deployed site every card plays (manual spot check of 10) | C4-1 | low |
| C4-3 (optional) | implementer | Input C: align an untimed transcript to fetched captions | `scripts/corpus/transcript/align.ts`, tests | Fixture: untimed text with speaker labels aligned to a json3 track gives windows within 1 s of the caption-only result and carries the labels | C4-1 | medium |

### Dependency graph

```
C0-1 (user) ─────────────────────────┐
C1-1 → C1-2 → C1-3 → C1-R → C2-2 → C2-3 → C2-R → C3-1 ┐
C2-1 (rubric, eval) ◄────────────────┘ (feeds C2-2)  → C3-2 ┴→ C3-R → C4-1 → C4-2
                                                                  → C4-3 (optional)
```

### Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | The laptop caption fetch fails too, now or after a YouTube change | C0-1 tests it first. The paste path never depends on it. `yt-dlp` is called as an external tool, so updating it is `pipx upgrade`, not a code change |
| R2 | Auto-caption errors put a wrong word on a card | The human hears the clip before approving; `E` edits and marks the line |
| R3 | A real person is credited with a line they did not say | Names are per-video, evidence-backed, human-confirmed; roles otherwise; swap key in review |
| R4 | Videos disappear or lose embedding | Weekly link-rot issue; tombstones; the app already falls back to text (D-CLIP-8) |
| R5 | Review fatigue leads to rubber-stamping | Precision-first rubric, hard cap per hour, approval-rate tracking in C4-1 |
| R6 | Fetching captions with `yt-dlp` is outside YouTube's terms of service | Personal, low volume, captions only, nothing redistributed but two short quoted lines per card, playback only through the official embed. The user should know; the paste path avoids it entirely |
| R7 | The generated, gitignored module surprises a contributor (`tsc` fails on a fresh clone) | `postinstall` generates it; CI runs `corpus:build` first; the error message in `cards.ts` says what to run |
| R8 | Collision with the redesign | The corpus lane owns nothing under `src/app` or `src/components`. Every shared file is in C1-1 (listed at the top of this section) and is handed off by the lead |
| R9 | No preview deployment, so phone review falls back to unbounded watch links | Unblock Phase 6 (Vercel access) before C3-2, or accept the slower link. The laptop review page does not depend on it |

## 9. Open questions for the user

1. **Where will you usually be when you find a video?** Laptop (link-only works, one command) or phone (you paste the transcript into a Claude session and tick a PR). This decides whether C3-1 or C3-2 is built first.
2. **Real names or roles?** Shipping "Host" and "Guest" is zero-risk and zero-effort. Real names need one confirmation per video. The plan supports both; which is the default?
3. **When do placeholders leave production?** Suggested: when 30 real cards covering at least 6 moves are approved. Saves of placeholder cards disappear at that point.

---

## Appendix A: probe evidence

All commands ran in this sandbox on 2026-11-14. Egress `160.79.106.226` through the session's HTTPS proxy. Scratch files: `/tmp/claude-0/-home-user-Quipdeck/b401e5a4-4539-5fdf-9fc2-f6731208ccbe/scratchpad/corpus/out/` (not committed).

### A.1 oEmbed, timedtext, watch page (curl, desktop Chrome user agent)

```
== eRsGyueVLvQ
oembed 200          {"title":"Sintel - Open Movie by Blender Foundation","author_name":"Blender",...
timedtext 200 0b    (https://www.youtube.com/api/timedtext?v=<id>&lang=en)
timedtext-list 200 0b  (https://video.google.com/timedtext?type=list&v=<id>)
watch 302 417b
== UF8uR6Z6KLc
oembed 200          {"title":"Steve Jobs' 2005 Stanford Commencement Address","author_name":"Stanford",...
timedtext 200 0b
timedtext-list 200 0b
watch 200 1332684b  captionTracks: none
"playabilityStatus":{"status":"LOGIN_REQUIRED","reason":"Sign in to confirm you're not a bot",...
== arj7oStGLkU
oembed 200          {"title":"Inside the Mind of a Master Procrastinator | Tim Urban | TED","author_name":"TED",...
timedtext 200 0b
timedtext-list 200 0b
watch 200 1379466b  captionTracks: none
"playabilityStatus":{"status":"LOGIN_REQUIRED","reason":"Sign in to confirm you're not a bot",...
```

Reading: oEmbed is usable from a datacentre. The watch page is served but gated. The empty timedtext bodies are not attributed to the IP (unsigned legacy URLs).

### A.2 yt-dlp 2026.10.26 and youtube-transcript-api 1.2.5 (scratch venv)

```
== yt-dlp eRsGyueVLvQ   (--skip-download --write-subs --write-auto-subs --sub-langs en --sub-format json3)
WARNING: [youtube] eRsGyueVLvQ: Unable to download webpage: HTTP Error 429: Too Many Requests
WARNING: [youtube] No supported JavaScript runtime could be found. Only deno is enabled by default; ...
ERROR: [youtube] eRsGyueVLvQ: Sign in to confirm you're not a bot. Use --cookies-from-browser or --cookies ...
== youtube-transcript-api eRsGyueVLvQ
FAIL IpBlocked  ... YouTube is blocking requests from your IP ...
== yt-dlp arj7oStGLkU       same 429, same "Sign in to confirm you're not a bot"
== youtube-transcript-api arj7oStGLkU   FAIL IpBlocked
```

No subtitle file was written. Laptop prerequisite noted from the warning: current `yt-dlp` wants a JavaScript runtime (deno by default; `--js-runtimes node` is the alternative). C2-3 must detect and explain this.

### A.3 InnerTube player endpoint, five clients (video `arj7oStGLkU`)

```
ANDROID 200 LOGIN_REQUIRED Sign in to confirm you're not a bot  tracks= 0
IOS 200 LOGIN_REQUIRED Sign in to confirm you're not a bot  tracks= 0
TVHTML5 200 LOGIN_REQUIRED Sign in to confirm you're not a bot  tracks= 0
WEB_EMBEDDED_PLAYER 200 ERROR This video is unavailable  tracks= 0
ANDROID_VR 200 LOGIN_REQUIRED Sign in to confirm you're not a bot  tracks= 0
```

### A.4 Other routes

```
embed page, no Referer (arj7oStGLkU)            200, previewPlayabilityStatus ERROR "Video player configuration error"
embed page, Referer: https://example.com/      arj7oStGLkU -> status OK, playableInEmbed true
                                               eRsGyueVLvQ -> status OK, playableInEmbed true
                                               BROKEN_CLIP -> status ERROR "This video is unavailable"
i.ytimg.com/vi/arj7oStGLkU/mqdefault.jpg       200
i.ytimg.com/vi/BROKEN_CLIP/mqdefault.jpg       404
oembed for BROKEN_CLIP                          400
youtubei/v1/get_transcript                      400 FAILED_PRECONDITION "Precondition check failed."
youtubetranscript.com/?server_vid2=<id>         200, 1966 b app shell, no transcript
r.jina.ai/https://www.youtube.com/watch?v=<id>  200, "Warning: Target URL returned error 401: Unauthorized"
googleapis.com/youtube/v3/captions (no key)     403 "Permission denied on the service."
```

The first embed error is caused by the missing Referer, not by the sandbox: with a Referer the same page reports the video playable in an embed. So a datacentre can check embeddability. It still cannot prove real playback (region, age gate, music claims; `VALIDATION.md` records player error 150 for every real video in this sandbox's browser), which stays a human check at review.

### A.5 Parser probe (throwaway, `scratchpad/corpus/parse_probe.py`)

Input: the YouTube paste sample from section 2.1 and a two-cue WebVTT. Output:

```
[{"t": 0.0, "text": "so I was on the train this morning and it", "end": 3.0},
 {"t": 3.0, "text": "was five minutes late", "end": 5.0},
 {"t": 5.0, "text": "five minutes call the historians", "end": 3727.0},
 {"t": 3727.0, "text": "wars have started over less"}]
[{"t": 0.24, "end": 3.11, "text": "so I was on the train this morning and it"},
 {"t": 3.12, "end": 5.0, "text": "was five minutes late"}]
```

Both formats reduce to the same segment form. The third paste segment shows why a segment's `end` must be capped (here the next time is an hour later): C1-2 caps a derived `end` at `t + 8 s`.

### A.6 Environment facts used by the plan

- Node `v22.23.4`. A scratch `.ts` file with a type alias and annotation ran with plain `node file.ts` and printed its output, so type stripping works with no extra runner. `ffmpeg` is present; `deno` is not.
- No `ANTHROPIC_API_KEY` in the sandbox, so no extraction call was made and section 4.2 is an estimate.
- No `.github/workflows/` directory exists in the repo.
- `src/lib/clip-controller.ts` lines 89 to 90 and 167 to 168: fractional `start` and `end` are already handled.
- `src/components/saved/saved.tsx` lines 75, 148 to 149, 208: `?card=<id>` renders `CardDetail` for any id in the dataset, saved or not.
- `e2e/support/server.cjs` line 92 builds with `npm run build` and `process.env`; `e2e/support/harness.cjs` lines 44 to 46 import `src/content/cards.ts` directly.
- `src/lib/move-hue.ts`: unknown move ids get a hue from a hash, so a new move needs no UI change.
- Tests pinned to seed data: `src/content/content.test.ts` (exactly one `BROKEN_CLIP`), `e2e/support/yt-stub.js` (default `errorIds: ["BROKEN_CLIP"]`), `e2e/saved.test.cjs`, `e2e/a11y.test.cjs`.
