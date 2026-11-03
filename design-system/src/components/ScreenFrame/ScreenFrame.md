---
name: ScreenFrame
level: atom
status: stable
---

# ScreenFrame

A piece of the product, drawn as the product draws it: a window with a
hairline, and the interface inside. Stripe's way of showing what a thing is
instead of describing it — and the interface inside is the real thing, so
what the reader sees on the landing page is what they will meet in the
product.

## Anatomy

1. **Window** — a `div`, rounded at the card radius, with a hairline.
2. **Ground** — the card surface, or the media ground when `dark`.
3. **Interface** — the product itself, padded by the caller.

## When to use it

- The public site: a piece of the product shown as the product draws it,
  next to the words that say what it is.
- Any place where the interface itself is the argument: a transcript, a
  card, the call.

## When not to use it

- **A real screen of the signed-in app** → `PageBody`: the app is the
  window, and it does not need a frame around it.
- **A card of content with words in it** → a `Widget`: the frame is for the
  interface, not for copy.
- **A video** → nothing: a video brings its own window.

## Interaction

None. The frame is a picture of the product: it clips what overflows it and
it takes no pointer.

## Writing

None. The frame never writes a word; the page says in words what the frame
shows, because the frame itself is silent.

## Accessibility

- The whole frame is `aria-hidden`: it is a picture, and the page's words
  carry it.
- Nothing inside it can be reached with a keyboard or read by a screen
  reader. Anything that has to be usable lives outside the frame.

## Do and don't

- ✅ Put the real interface inside.
- ✅ Say in words next to it what the frame shows.
- ❌ Put a control inside: it would be reachable and unreadable.
- ❌ Use it to frame a whole page: an `InsetFrame` is the frame of a page.
