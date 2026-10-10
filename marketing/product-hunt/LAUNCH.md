# Mockio on Product Hunt — launch kit

Everything the Product Hunt form asks for, in the order it asks.

## Assets (this folder)

| File | Use | Size |
|---|---|---|
| `thumbnail-240.png` | Thumbnail / logo | 240×240 |
| `01-hero.png` | Gallery 1 — first impression | 1270×760 |
| `02-report.png` | Gallery 2 — the report | 1270×760 |
| `03-habit.png` | Gallery 3 — streak, missions, Mocki, badges | 1270×760 |
| `04-companies.png` | Gallery 4 — company and round | 1270×760 |
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

Practice job interviews in English, out loud, with AI

*(53 characters)* Alternatives:
- Rehearse your English job interview before the real one (55)
- An AI interviewer for the job you're applying to (49)

## Link

https://www.getmockio.com

## Topics

Productivity · Artificial Intelligence · Education  *(also fits: Languages, Hiring)*

## Description (260 characters max)

Mockio runs a mock job interview in English by voice, as the company and round you're applying for. Then it tells you exactly what to fix: one mission, better phrasings, your pace. Streaks and missions keep you going. Free to start, priced for your country.

*(257 characters)*

## Maker's first comment

> Hi Product Hunt 👋 I'm Jean, the maker of Mockio.
>
> I built it for one moment: the first interview you do in a language that isn't yours. You know the answer — it just doesn't come out the way it does in your head. The only fix is saying it out loud, many times, before it counts.
>
> **How it works**
> 1. Pick the role, the round (recruiter screen, behavioral, technical, system design) and, on Premium, the company or your own job posting.
> 2. An AI interviewer runs the conversation by voice and pushes back like a real one would — if you dodge a question, it asks again.
> 3. You get a report in your own language: one mission for next time, what worked, and the exact sentences to say better.
>
> **Why it's a habit, not a one-off:** a daily goal, a streak that forgives one bad day a week, weekly missions, 14 badges and Mocki — a parrot that grows up as you practice (parrots learn to talk by repeating out loud).
>
> **Pricing:** free to start (5 interviews a week). Premium is priced per country — S/ 9.90 in Peru, US$4.99 in the US, US$1.99 in the most affordable regions — and charged in your currency. The app speaks 14 languages.
>
> I'd love your honest feedback, especially from anyone who has interviewed in a second language. What would have helped you most before that first call?

## Launch-day posts

**X / LinkedIn**
> Your first job interview in English shouldn't be the real one. Mockio is live on Product Hunt today: an AI interviewer that runs the round by voice, as the company you're applying to, then tells you exactly what to fix. 🦜 [link]

## Checklist

- [ ] Schedule the launch for 12:01 a.m. Pacific Time (Product Hunt's day starts then).
- [ ] Upload the thumbnail and the five gallery images in order.
- [ ] Post the maker's comment as soon as it goes live.
- [ ] Make sure the free plan works without a card (it does) and that Paddle's domain approval is done, so international visitors can upgrade.
- [ ] Offer a launch code (e.g. `PRODUCTHUNT` — 30 days of Premium, 300 uses) from the admin panel → Coupons, and mention it in the comment.
