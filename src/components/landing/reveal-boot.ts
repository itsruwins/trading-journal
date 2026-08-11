/* Boot script for the landing page's scroll reveals.

   Lives in its own module, with no "use client", because it is rendered by the
   root layout's <head> — a server component. Putting a raw <script> inside the
   page component instead looks like it works (the server's HTML parses and runs
   it) but React never executes one on a *client* render, so a Link navigation
   to / would silently skip it and log:

     "Encountered a script tag while rendering React component."

   In <head> it also runs earlier: before <body> parses, so the hidden state is
   in place before anything it applies to has painted.

   What it does: arm the reveal transitions, but only once IntersectionObserver
   is confirmed, so a no-JS or crawler load ships the page fully visible rather
   than blank. The timer is the third safety net — if React never hydrates,
   nothing will ever set the ready flag, so the attribute is dropped and every
   .reveal falls back to its visible default. See reveal.tsx. */

export const REVEAL_BOOT_SCRIPT = `(function(){try{
if(!('IntersectionObserver' in window))return;
var d=document.documentElement;
d.setAttribute('data-reveal','on');
setTimeout(function(){if(!window.__landingRevealReady)d.removeAttribute('data-reveal')},4000);
}catch(e){}})()`;
