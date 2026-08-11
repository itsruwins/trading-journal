# Product

## Register

product

## Platform

web

## Users

Forex and CFD traders working under prop-firm rules — funded-challenge accounts, daily and overall drawdown limits, risk sized in percent rather than lots. They open the journal twice a day: once after the London or New York session to log fills while the chart is still fresh, and once at the weekend to work out which setups actually paid. The job to be done is not record-keeping for its own sake; it is answering "which of my edges is carrying this account, and which one is quietly bleeding it."

The marketing surface at `/` speaks to the same person before they have an account, so it is written for someone who already journals — in a spreadsheet, in Notion, in a broker's trade history — and has learned that a list of trades is not the same thing as an answer.

## Product Purpose

A trading journal that turns logged fills into evidence. Every trade captures the setup, session, timeframe, risk percent, R multiple and screenshots alongside the prices, and the dashboard recomputes eleven metrics and five views from that record the moment a trade closes. Success is a trader who can name their best setup and their worst session from memory, because the journal told them.

## Positioning

The journal that answers questions, not the one that stores rows.

## Conversion & proof

- Primary CTA: create a free account (`/signup`). Secondary: log in (`/login`), for returning visitors.
- The line a visitor remembers after 10 seconds: you already know your win rate; you don't know which setup is carrying it.
- Belief ladder: (1) this is built for my market, not a generic finance app — the vocabulary is pairs, sessions, risk percent and R; (2) logging a trade is fast enough that I'll actually keep doing it; (3) what comes out the other side is more than a list — it's a decision; (4) it costs nothing to find out.
- Proof on hand: none supplied yet. The testimonial section on the landing page ships with bracketed `[Name]` / `[Firm]` placeholders and example quote text, marked with a code comment, to be replaced with real quotes before launch. Product proof carries the page in the meantime: a working in-page render of the real dashboard, and four countable facts (20 fields per trade, 5 charts, 11 computed metrics, 0 formulas to maintain).

## Brand Personality

Disciplined, evidential, quiet. The voice is a trading desk's, not a fintech startup's: short sentences, concrete nouns, no hype about "unlocking your potential." It never promises profit — it promises a clear record and honest arithmetic. Confidence comes from specificity.

## Anti-references

Not the neon-on-navy trading-signals aesthetic: no glowing candlesticks, no green upward arrows as decoration, no "10x your account." Not the purple-gradient SaaS template — no gradient text, no icon-in-a-rounded-square above every heading, no identical three-card feature grids. Not terminal costume either: no scanlines, no CRT flicker, no blinking cursors or `>` prompts standing in for seriousness. Not editorial-magazine (display serif, italic drop caps, ruled broadsheet columns) — this is an instrument, not a periodical.

## Design Principles

**Chroma is earned.** The entire interface is zero-chroma neutral. Green and red appear only where real money is at stake — on a P&L figure, a calendar day, a monthly bar. Color is data, never decoration, and this rule holds on the marketing page exactly as it does in the app.

**Show the instrument.** Product claims are made by rendering the product. The landing hero is the real dashboard built in-page from the same tokens and chart language, not a screenshot and not an abstraction — and sample figures are labelled as sample figures.

**Figures are typography.** Numbers get tabular lining figures, mono where they align in columns, and are never centred in a way that breaks the decimal. A misaligned column is a bug.

**Materials carry hierarchy, not attention.** Liquid Glass marks the floating chrome layer — nav, dock, panels — and nothing else. Glass on a static card is decoration, and decoration is the failure mode.

**Every claim is checkable.** Counts on the page are counted from the code. If a number can't be verified, it doesn't ship.

## Accessibility & Inclusion

Body text at 4.5:1 or better against its surface, large text at 3:1. `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast: more` all have real fallbacks already wired into the glass layer in `app/globals.css`; landing motion must honour the same three. P&L is never signalled by color alone — a sign, an arrow or an explicit label always accompanies the green or red, so red/green color blindness never costs information.
