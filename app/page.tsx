import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { Logo } from "@/src/components/logo";
import { CtaLink } from "@/src/components/landing/cta";
import { LandingNav } from "@/src/components/landing/landing-nav";
import { ProductMock } from "@/src/components/landing/product-mock";
import { Reveal, REVEAL_BOOT_SCRIPT } from "@/src/components/landing/reveal";
import { SignedInRedirect } from "@/src/components/landing/signed-in-redirect";
import { LandingCalendar } from "@/src/components/landing/landing-calendar";
import {
  AccountsVisual,
  ScreenshotsVisual,
  SetupsVisual,
  TagsVisual,
} from "@/src/components/landing/feature-visuals";

/* Landing page.

   One rule governs the whole surface, the same one the app runs on: chroma is
   earned. Every structural element is zero-chroma neutral, and green and red
   appear only on figures that represent real money — a P&L number, a calendar
   day, a monthly bar. Colour is data here, never decoration.

   The page is a server component so it paints without waiting on auth; the
   only client work is the nav's scroll state, the scroll reveals, and the
   redirect that catches an already-signed-in visitor. */

export const metadata: Metadata = {
  title: { absolute: "Trading Journal — Know which edge actually pays" },
  description:
    "A trading journal for forex and prop-firm traders. Log the setup, session, risk and screenshot behind every trade, and get the equity curve, P&L calendar and per-setup breakdown back.",
};

/* Set once here rather than per-heading, so the page holds one modular scale
   instead of drifting a few pixels a section. */
const H2 = "text-balance text-[clamp(1.75rem,3.6vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink";
const LEAD = "text-pretty text-[17px] leading-[1.65] text-muted";

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("mx-auto max-w-6xl px-4 sm:px-6", className)}>
      {children}
    </section>
  );
}

function Rule() {
  return <div className="mx-auto max-w-6xl px-4 sm:px-6"><hr className="border-edge" /></div>;
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <div className="landing-glow relative">
      <Section className="pb-14 pt-28 sm:pb-20 sm:pt-36">
        <div className="max-w-3xl">
          <h1
            className="landing-line text-balance text-[clamp(2.5rem,6.4vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink"
            style={{ "--line-delay": "60ms" } as CSSProperties}
          >
            Know which edge actually pays.
          </h1>

          <p
            className="landing-line mt-6 max-w-[54ch] text-pretty text-[17px] leading-[1.6] text-muted sm:text-[19px]"
            style={{ "--line-delay": "180ms" } as CSSProperties}
          >
            A journal built for forex and prop-firm traders. Log the setup, the
            session, the risk and the screenshot behind every fill — and get an
            equity curve, a P&amp;L calendar and a per-setup breakdown back.
          </p>

          <div
            className="landing-line mt-9 flex flex-wrap items-center gap-3"
            style={{ "--line-delay": "290ms" } as CSSProperties}
          >
            <CtaLink href="/signup" size="lg">
              Create free account
            </CtaLink>
            <CtaLink href="/login" variant="secondary" size="lg">
              Log in
            </CtaLink>
            <span className="text-[13px] text-faint">
              Free plan · no card required
            </span>
          </div>
        </div>

        <div
          className="landing-surface mt-14 sm:mt-20"
          style={{ "--line-delay": "380ms" } as CSSProperties}
        >
          <ProductMock />
        </div>
      </Section>
    </div>
  );
}

/* ── Countable facts ──────────────────────────────────────────────────── */

/* Four numbers, all counted from the codebase rather than invented: the fields
   on a trade record, the charts on the dashboard, the metrics computeStats()
   returns, and the number of spreadsheet formulas any of it requires. */
const FACTS = [
  { value: "20", label: "fields per trade", detail: "Prices, risk, session, setup, tags, screenshots" },
  { value: "5", label: "charts", detail: "Equity, monthly, per setup, win/loss, calendar" },
  { value: "11", label: "metrics computed", detail: "Win rate, profit factor, avg R, best session…" },
  { value: "0", label: "formulas to maintain", detail: "Nothing to break when you add a column" },
];

function Facts() {
  return (
    <Section className="py-14 sm:py-16">
      <dl className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {FACTS.map((fact, i) => (
          <Reveal key={fact.label} delay={i * 70} className="border-t border-edge pt-5">
            <dt className="flex items-baseline gap-2">
              <span className="tabular text-[2.25rem] font-semibold leading-none tracking-[-0.03em] text-ink">
                {fact.value}
              </span>
              <span className="text-[14px] font-medium text-ink">{fact.label}</span>
            </dt>
            <dd className="mt-2.5 text-pretty text-[13px] leading-[1.55] text-faint">
              {fact.detail}
            </dd>
          </Reveal>
        ))}
      </dl>
    </Section>
  );
}

/* ── The premise ──────────────────────────────────────────────────────── */

const QUESTIONS = [
  "Which of your setups has the highest expectancy — and how many trades is that based on?",
  "Is London still paying, or has it quietly been New York for two months?",
  "What does your equity curve look like with the trades you tagged “revenge” taken out?",
];

function Evidence() {
  return (
    <Section id="evidence" className="py-20 sm:py-28">
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Reveal>
          <h2 className={H2}>
            You already know your win rate. You don&apos;t know what&apos;s
            carrying it.
          </h2>
          <p className={cn(LEAD, "mt-6 max-w-[56ch]")}>
            Sixty percent sounds healthy right up until you find out one setup is
            doing all the work and the other three are paying for it. A list of
            trades can&apos;t tell you that. A record with the setup, the
            session, the timeframe and the risk attached to every fill can — and
            it answers in a chart, not an argument.
          </p>
        </Reveal>

        <Reveal delay={120} as="ul" className="space-y-0 self-center">
          {QUESTIONS.map((question) => (
            <li
              key={question}
              className="border-b border-edge py-5 text-pretty text-[15px] leading-[1.6] text-ink first:border-t"
            >
              {question}
            </li>
          ))}
        </Reveal>
      </div>
    </Section>
  );
}

/* ── Features ─────────────────────────────────────────────────────────── */

function Feature({
  title,
  body,
  visual,
  className,
  delay,
  /* Off when the visual already carries its own card — the P&L calendar is a
     bordered surface in its own right, and a card inside a card is always
     wrong. */
  framed = true,
}: {
  title: string;
  body: string;
  visual: ReactNode;
  className?: string;
  delay?: number;
  framed?: boolean;
}) {
  return (
    <Reveal
      delay={delay}
      className={cn(
        "flex flex-col gap-6",
        framed && "rounded-xl border border-edge bg-surface p-5 sm:p-6",
        className,
      )}
    >
      <div>
        <h3 className="text-balance text-[19px] font-semibold tracking-[-0.02em] text-ink sm:text-[21px]">
          {title}
        </h3>
        <p className="mt-2.5 text-pretty text-[14px] leading-[1.6] text-muted sm:text-[15px]">
          {body}
        </p>
      </div>
      {/* my-auto, not mt-auto: in a card left with slack because its neighbour
          is taller, a centred visual reads as composed where a bottom-pinned
          one reads as fallen. */}
      <div className="my-auto">{visual}</div>
    </Reveal>
  );
}

function Features() {
  return (
    <Section id="features" className="py-20 sm:py-28">
      <Reveal className="max-w-2xl">
        <h2 className={H2}>Everything a fill is worth remembering.</h2>
        <p className={cn(LEAD, "mt-5")}>
          The form takes a minute while the chart is still open. What comes back
          out is the part worth having.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-3 sm:gap-4 lg:grid-cols-12">
        <Feature
          className="lg:col-span-7"
          framed={false}
          title="The month, at a glance"
          body="Every trading day tinted by its result, with weekly totals down the side. Click a day and the trades behind the number open up."
          visual={<LandingCalendar />}
        />
        <Feature
          className="lg:col-span-5"
          delay={90}
          title="Which edge pays"
          body="P&L broken down by the setups you named yourself, and by the session you traded them in. The trade count sits beside each figure, so six trades never gets mistaken for a verdict."
          visual={<SetupsVisual />}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:gap-4 lg:grid-cols-3">
        <Feature
          title="Tags that survive contact with reality"
          body="Followed plan. Early entry. Revenge trade. Tag a fill honestly and your equity curve stops being a mystery."
          visual={<TagsVisual />}
        />
        <Feature
          delay={90}
          title="The chart, attached"
          body="Entry and exit screenshots live on the trade itself — not in a folder called screenshots_final_2."
          visual={<ScreenshotsVisual />}
        />
        <Feature
          delay={180}
          title="Accounts kept apart"
          body="Funded, personal, demo. Separate currencies and separate curves — or every account on one."
          visual={<AccountsVisual />}
        />
      </div>
    </Section>
  );
}

/* ── How it works ─────────────────────────────────────────────────────── */

/* A real sequence, so the numbers carry information rather than decorating the
   section the way 01 / 02 / 03 usually does. */
const STEPS = [
  {
    title: "Add an account",
    body: "Broker or prop firm, starting balance, currency. Thirty seconds, once.",
  },
  {
    title: "Log the trade",
    body: "Pair, direction, entry, exit, stop, risk, setup, session, screenshot — under a minute, while the chart is still open.",
  },
  {
    title: "Read the record",
    body: "Close a trade and the dashboard recomputes. No formulas, no pivot tables, no Sunday afternoon lost to a spreadsheet.",
  },
];

function HowItWorks() {
  return (
    <Section className="py-20 sm:py-28">
      <Reveal className="max-w-2xl">
        <h2 className={H2}>Three steps, then it&apos;s a habit.</h2>
      </Reveal>

      <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal
            key={step.title}
            as="li"
            delay={i * 90}
            className="border-t border-edge-strong pt-5"
          >
            <span className="tabular text-[13px] font-medium text-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 text-[19px] font-semibold tracking-[-0.02em] text-ink">
              {step.title}
            </h3>
            <p className="mt-2.5 max-w-[38ch] text-pretty text-[15px] leading-[1.6] text-muted">
              {step.body}
            </p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

/* ── Pricing ──────────────────────────────────────────────────────────── */

/* PLACEHOLDER PRICING — the tiers and the $9 figure are a starting point, not
   a decision. Edit the two objects below once you've settled on real limits
   and a real price; nothing else on the page depends on these values. */
const PLANS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    pitch: "Enough to find out whether you'll actually keep a journal.",
    features: [
      "One account",
      "50 trades a month",
      "Equity curve, monthly P&L and win/loss",
      "Setups and tags",
    ],
    cta: "Create free account",
    href: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    price: "$9",
    cadence: "per month",
    pitch: "For traders running more than one account and reviewing every week.",
    features: [
      "Unlimited accounts and trades",
      "Entry and exit screenshots",
      "P&L calendar with weekly totals",
      "Per-setup and per-session breakdowns",
      "Full history, exportable",
    ],
    cta: "Start free, upgrade anytime",
    href: "/signup",
    featured: true,
  },
];

function Pricing() {
  return (
    <Section id="pricing" className="py-20 sm:py-28">
      <Reveal className="max-w-2xl">
        <h2 className={H2}>Free until the journal is worth paying for.</h2>
        <p className={cn(LEAD, "mt-5")}>
          Start on the free plan. Upgrade when you&apos;re running more than one
          account, or when you want the screenshots.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-3 sm:gap-4 lg:grid-cols-2">
        {PLANS.map((plan, i) => (
          <Reveal
            key={plan.name}
            delay={i * 90}
            className={cn(
              "flex flex-col rounded-xl border p-6 sm:p-8",
              plan.featured
                ? "border-edge-strong bg-raised"
                : "border-edge bg-surface",
            )}
          >
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              {plan.name}
            </h3>

            <p className="mt-4 flex items-baseline gap-2">
              <span className="tabular text-[2.75rem] font-semibold leading-none tracking-[-0.035em] text-ink">
                {plan.price}
              </span>
              <span className="text-[14px] text-faint">{plan.cadence}</span>
            </p>

            <p className="mt-4 max-w-[42ch] text-pretty text-[15px] leading-[1.6] text-muted">
              {plan.pitch}
            </p>

            {/* The two plans list different numbers of features, so the list
                takes the slack and both buttons land on the same baseline. */}
            <ul className="mt-7 flex-1 space-y-3 border-t border-edge pt-7">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[15px] text-ink">
                  <Check className="mt-[3px] size-4 shrink-0 text-faint" aria-hidden="true" />
                  <span className="text-pretty">{feature}</span>
                </li>
              ))}
            </ul>

            <CtaLink
              href={plan.href}
              variant={plan.featured ? "primary" : "secondary"}
              size="lg"
              className="mt-8 w-full"
            >
              {plan.cta}
            </CtaLink>
          </Reveal>
        ))}
      </div>

      <p className="mt-6 text-[13px] text-faint">
        Prices in USD. Cancel any time — your trades stay exportable either way.
      </p>
    </Section>
  );
}

/* ── Testimonials ─────────────────────────────────────────────────────── */

/* PLACEHOLDER TESTIMONIALS — nobody said these. The quote text is example copy
   showing the shape and length that fits the layout, and every attribution is
   bracketed so it can't be mistaken for a real endorsement while it's still a
   placeholder. Replace `quote`, `name` and `role` with real, permissioned
   quotes before launch, or delete <Testimonials /> from the page below. */
const QUOTES = [
  {
    quote:
      "I'd been journaling in a spreadsheet for two years. Took about a week here before I found out my best-performing setup was the one I traded least.",
    name: "[Full name]",
    role: "[Market · prop firm]",
  },
  {
    quote:
      "The calendar is the thing that changed how I trade. Seeing four red Fridays in a row is a much harder argument to ignore than a number in a cell.",
    name: "[Full name]",
    role: "[Market · prop firm]",
  },
  {
    quote:
      "Logging takes me under a minute now, so I actually do it. That was the whole problem with every journal I tried before this one.",
    name: "[Full name]",
    role: "[Market · prop firm]",
  },
];

function Testimonials() {
  return (
    <Section className="py-20 sm:py-28">
      <Reveal className="max-w-2xl">
        <h2 className={H2}>What traders say.</h2>
      </Reveal>

      <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-3">
        {QUOTES.map((item, i) => (
          <Reveal
            key={i}
            as="figure"
            delay={i * 90}
            className="border-t border-edge pt-6"
          >
            <blockquote className="text-pretty text-[16px] leading-[1.6] text-ink">
              {item.quote}
            </blockquote>
            <figcaption className="mt-5 text-[13px] text-faint">
              <span className="text-muted">{item.name}</span>
              {" · "}
              {item.role}
            </figcaption>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ── Close ────────────────────────────────────────────────────────────── */

function Close() {
  return (
    <Section className="py-24 sm:py-32">
      <Reveal className="max-w-2xl">
        <h2 className="text-balance text-[clamp(2rem,4.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
          Start the record.
        </h2>
        <p className={cn(LEAD, "mt-6")}>
          Your next hundred trades are going to happen either way. This is the
          difference between taking them and having something to show for them.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <CtaLink href="/signup" size="lg">
            Create free account
          </CtaLink>
          <CtaLink href="/login" variant="secondary" size="lg">
            Log in
          </CtaLink>
        </div>
      </Reveal>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-edge">
      <Section className="flex flex-col gap-8 py-12">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Logo />
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[
              { href: "#features", label: "Features" },
              { href: "#pricing", label: "Pricing" },
              { href: "/login", label: "Log in" },
              { href: "/signup", label: "Create account" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] text-muted transition-colors duration-150 ease-out hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="max-w-[72ch] text-pretty text-[13px] leading-[1.6] text-faint">
          Trading Journal is a record-keeping tool for trades you have already
          taken. It is not financial advice, and nothing on this page is a
          forecast of future results. All figures shown in the dashboard,
          charts and calendar above are sample data.
        </p>
      </Section>
    </footer>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    /* No theme lock here. The landing page follows the same data-theme on
       <html> that the app and the auth pages do, so signing in never flips
       the palette out from under the visitor. */
    <div className="min-h-dvh bg-canvas text-ink">
      {/* Runs at parse time, before anything below it paints — so the reveal
          transitions never leave content hidden on a load without JS. */}
      <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOT_SCRIPT }} />

      <SignedInRedirect />
      <LandingNav />

      <main>
        <Hero />
        <Facts />
        <Rule />
        <Evidence />
        <Rule />
        <Features />
        <Rule />
        <HowItWorks />
        <Rule />
        <Pricing />
        <Rule />
        <Testimonials />
        <Close />
      </main>

      <Footer />
    </div>
  );
}
