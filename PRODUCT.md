# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the event host.** Creates a camera room minutes before guests arrive, shares a QR or code, and watches keeps land live. Uses the host screens on their own phone, one-handed, while hosting. Success: everyone shot, everything collected, nothing lost.
- **Guests at the event.** Scan or type the room code, enter a name, and shoot inside the shared camera. Use it standing, in a group, in mixed lighting, often with one hand. Success: get keeps without thinking about the app.

## Product Purpose

Momento turns one phone camera into a shared camera passed around an event. The host opens a room; every guest shoots into the same roll (20 frames each, retakes free); the host watches keeps arrive live and downloads everything as one zip. It exists because shared albums put the work on the guest — find the album, upload, dig for your photos later. Momento puts the work on the room: guests just shoot, the host just collects.

## Positioning

One shared camera, not a shared album. A neighboring product can copy a link and a feed; it cannot copy the roll: a fixed count of shots each, live keeps landing on the host's screen, and one tidy download at the end.

## Operating Context

- **Host moment:** room created on the spot, QR shown on the host's own phone or held up, then the phone goes in a pocket. The host glances at the room screen between hosting duties.
- **Guest moment:** at a wedding, birthday, or party. Someone holds the phone, poses, taps one big shutter, keeps or retakes, passes it on. Time on screen per shot is seconds.
- **Room lifecycle:** open → guests join and shoot → host closes the room → download zip. Rooms carry a name and optional event date; the code is the only thing guests ever see.
- **Collect moment:** after the event, the host downloads all keeps as one zip grouped by guest.

## Capabilities and Constraints

- Hosts: email magic link or Google sign-in; create room (name + optional date); share QR/code; live room view with per-guest shot progress; member limit; close room; download zip with progress.
- Guests: join by 6-character code (QR or manual); 20 shots per member; retake is free; camera permission required for shooting, with a camera-roll file fallback when blocked.
- The site root is the single door: a guest types the room code, a host signs in on the same screen. A signed-in host is forwarded straight to their cameras. There is no collaborator role — a collaborator is a guest holding a code.
- Technical facts from the incumbent codebase: React 19 + Vite 7 + react-router 7, Tailwind CSS v4 via `@tailwindcss/vite`, Supabase (auth, Postgres, Storage with signed URLs), JSZip for download, qrcode for invites. Mobile web only — no PWA or native shell is planned.
- Undecided: nothing recorded.

## Brand Commitments

- Product name: **Momento**. Mascot: **Flick**, the camera character. Both are incumbent and stay.
- The incumbent film/photo-booth visual language is real and coherent in code: warm cream paper ground, amber accent, IBM Plex Mono labels, polaroid photo grids, film-strip motifs, light/dark themes, safe-area handling. It is the incumbent design authority; extend and perfect it for mobile unless the user explicitly asks for a replacement.
- Voice in copy is short, concrete, hospitality-flavored ("Ready to roll", "Pass it around", "Keep the moments they'll miss"). No exclamation-heavy hype.

## Evidence on Hand

- A complete runnable implementation of the full host and guest flows (this repository). No real event photos, customers, testimonials, benchmarks, or marketing assets exist — do not invent them. Any demonstration content authored for design work must be synthetic and labeled as such.

## Product Principles

1. **The roll is the product.** Shot count, live keeps, and the final zip are the moments worth the most craft.
2. **Seconds per screen.** Every guest interaction must be completable one-handed, in a group, without reading instructions.
3. **The host glances, never navigates.** Host screens must be scannable between hosting duties; the important number (keeps, who has shot) is always the loudest thing.
4. **Perfect on phones, fine on desktop.** Design starts at ~390px width; desktop inherits the same language centered, not redesigned.
5. **Nothing gets lost.** Photos, sessions, and progress survive refreshes, retakes, and permission prompts.

## Accessibility & Inclusion

- Guests shoot in mixed and low light at events, often one-handed and possibly after drinking: large tap targets, readable labels, no precision gestures for core actions.
- No formal standard has been committed yet; mobile web on iOS Safari and Android Chrome is the target surface.
