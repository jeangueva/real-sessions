# Mockio on Product Hunt — launch kit

Everything the Product Hunt form asks for, in the order it asks.

## Assets (this folder)

| File | Use | Size |
|---|---|---|
| `thumbnail-240.png` | Thumbnail / logo | 240×240 |
| `01-hero.png` | Gallery 1 — first impression: the agency screen | 1270×760 |
| `02-report.png` | Gallery 2 — would you pass, the mission, errors from Spanish | 1270×760 |
| `03-habit.png` | Gallery 3 — streak, missions, Mocki, badges | 1270×760 |
| `04-path.png` | Gallery 4 — the whole path: get hired, at work, grow | 1270×760 |
| `05-pricing.png` | Gallery 5 — free and regional pricing | 1270×760 |

Sources are in `src/` (HTML). To re-render one after editing:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --allow-file-access-from-files --window-size=1270,760 --virtual-time-budget=4000 --screenshot="$PWD/01-hero.png" "file://$PWD/src/01-hero.html"
```

Optional but worth it: a 30–60 s screen recording of one real interview
(question → spoken answer → report) as the first gallery item. Product Hunt
plays YouTube links inline.

## Name

Mockio

## Tagline (60 characters max)

From the interview to the raise, in English, with AI

*(52 characters)* Alternatives:
- Pass the agency English screen and land a remote job (52)
- Rehearse every conversation of a remote job, out loud (54)

## Link

https://www.getmockio.com

## Topics

Productivity · Artificial Intelligence · Education  *(also fits: Languages, Hiring)*

## Description (260 characters max)

For tech people in Latin America going remote. Rehearse the agency's English screen by voice, then the job itself and the raise. Every report says if you'd pass and names the errors that come from Spanish. Free to get hired, priced for your country.

*(250 characters)*

## Maker's first comment

> Hi Product Hunt 👋 I'm Jean, the maker of Mockio.
>
> I built it for a moment I know well: a developer in Lima, Bogotá or São Paulo on the 15-minute English call with BairesDev, Turing or Toptal that decides whether they ever reach the technical round. You know the answer — it just doesn't come out the way it does in your head. And if you pass, the stand-ups, the code reviews and one day the raise are in English too.
>
> **How it works**
> 1. **Get hired (free):** the agency's English screen, the interview with the client abroad, and the technical, behavioral and salary rounds — plus 2-minute drills (no fillers, explain it simply, your win with a number).
> 2. **At work and grow (Premium):** stand-up, code review, on-call, estimates, a slipping deadline, then your performance review and asking for a raise.
> 3. **The report, in your language:** an estimated CEFR level and whether you'd pass a B2 screen, one mission for next time, and the errors that come from Spanish or Portuguese — “in my actual job” → “in my current role” — explained.
>
> **Why it's a habit, not a one-off:** a daily goal, a streak that forgives one bad day a week, weekly missions, 14 badges and Mocki — a parrot that grows up as you practice (parrots learn to talk by repeating out loud).
>
> **Pricing:** free to start (5 interviews a week). Premium is priced per country — S/ 9.90 in Peru, US$4.99 in the US, US$1.99 in the most affordable regions — and charged in your currency. The app speaks 14 languages.
>
> I'd love your honest feedback, especially from anyone who has gone through an agency's English screen. What tripped you up on that first call?

## Launch-day posts

**X / LinkedIn**
> Your agency English screen shouldn't be the first time you say it out loud. Mockio is live on Product Hunt: rehearse the screen, the job and the raise by voice, and find out if you'd pass. Built for LatAm tech going remote. 🦜 [link]

## Checklist

- [ ] Schedule the launch for 12:01 a.m. Pacific Time (Product Hunt's day starts then).
- [ ] Upload the thumbnail and the five gallery images in order.
- [ ] Post the maker's comment as soon as it goes live.
- [ ] Make sure the free plan works without a card (it does) and that Paddle's domain approval is done, so international visitors can upgrade.
- [ ] Offer a launch code (e.g. `PRODUCTHUNT` — 30 days of Premium, 300 uses) from the admin panel → Coupons, and mention it in the comment.
