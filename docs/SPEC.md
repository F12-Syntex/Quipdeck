# Quipdeck spec (authoritative; supersedes the original "jokes by topic" brief)

## Product
Quipdeck shows short clips of real, unscripted wit (panel shows, chat shows, podcasts), where someone reacts quickly to what another person said. Each card teaches a cue to notice and the move that turns it into a laugh. The goal is to build intuition for natural wit through passive exposure, not to memorise jokes. Phone-first, also optimised for desktop web.

## Feed (unchanged behaviour)
- Full-screen vertical feed, one card at a time, swipe up, shuffled order
- Tap to flip, tap again to flip back; cards stay as the user left them (flip state persists per card while scrolling)
- Clip behaviour: autoplays muted with captions, unmute persists for the visit, loops (between start and end seconds), one clip at a time, stops when scrolled away, text-only fallback if the clip is unavailable
- Saving with the heart, kept on device (localStorage), no accounts
- Saved list with search and full-card overlay
- Dark theme, phone-first

## Card front: cue + move
- Top, large: the cue, a short situation description (e.g. "Someone uses a figure of speech")
- Below, smaller: the move, a label from a fixed set (e.g. "Take it literally")
- "Tap to reveal" hint
- No video icon (every card has a clip)

## Card back: exchange + clip + breakdown
- Move label at the top as a small tag
- The exchange as dialogue: trigger line (who said it), then response (who said it). Two short lines styled as a conversation, not a paragraph.
- One-line breakdown under it, e.g. "Took 'I could eat a horse' at face value"
- Clip below, required on every card
- Heart and mute buttons

## Saved list: grouped by move
- Groups are the moves, sorted A to Z
- Each row shows the cue text and the response line
- Search covers cue, move, both lines of dialogue and the breakdown
- Tapping a row opens a full-card overlay

## Clips
- Always present. Text-only is ONLY the error fallback when a clip fails to load (exchange text still shows).
- Clip = YouTube video ID + start and end seconds.

## Content model (per card)
- id
- move (one of a fixed list of ~12-15; data-driven, NOT hardcoded in UI)
- cue (short situation text)
- trigger: { speaker, line }
- response: { speaker, line }
- breakdown (one line)
- clip: { youtubeId, start, end } (required)
- source (show or podcast name, optional)

Starter move list (final list comes from a separate content pipeline): Literal interpretation, Escalation, Understatement, Callback, Self-deprecation, Playing along, Reversal, Naming the obvious, Misdirection, Mock seriousness.

## Seed data for development
10-15 placeholder cards covering at least 4 different moves, 2+ cards sharing a move (to test grouping), and one card with a deliberately broken clip ID (to test fallback).

## Out of scope
Accounts, quizzes, recall modes, streaks, ranking/popularity, user submissions. The content pipeline is a separate project.

## Look and feel
Superseded by `docs/REDESIGN_V2.md` (D-THEME-8): the tweakcn "Soft Pop" theme copied whole, dark, rounded and playful: flat surfaces, DM Sans, large rounded cards, pill controls, one solid chart colour per move. The original glassmorphic, Brink-based direction was built (v1) and rejected. Still required: dark theme, AA contrast, focus states, keyboard nav, prefers-reduced-motion respected. Stack: Next.js + shadcn + Tailwind. Go hard on 21st.dev components where they fit.
