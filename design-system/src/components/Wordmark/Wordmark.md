---
name: Wordmark
level: molecule
status: stable
---

# Wordmark

The brand lockup: the `Mark` and the name, _mockio_, set as one unit. It is
defined once because it appears in places that are nothing alike — a 20px
nav on the landing, a 16px line in the footer, a 24px name above the sign-in
card — and a logo that drifts between them is not a logo.

## Anatomy

1. **Mark** _(optional, `mark`)_ — the isologo at `1.3em` square: the height
   of the name's capitals plus a little, so the two read as one shape.
2. **Gap** — `0.35em`, so it scales with the name.
3. **Name** — the literal _mockio_: lowercase, in `font-mark`, tracked
   `-0.03em`. Colour and size come from `className`.

Everything is in `em`. Set the font-size and the whole lockup follows.

## Sizes

| Where | Classes | Mark |
| --- | --- | --- |
| Site footer | `text-sm font-semibold text-cream-bright` | yes |
| Landing nav | `text-xl font-semibold text-cream-bright` | yes |
| App top bar, wide screens | `text-lg font-semibold text-cream-bright` | no — the `Mark` is beside it |
| Sign-in | `text-2xl font-semibold text-cream-bright` | no — Mocki sits above it |
| Unsubscribe | `text-2xl font-semibold text-cream-bright` | yes |

## When to use it

- Wherever the brand is read rather than only recognised: the landing nav,
  the footer, the sign-in and unsubscribe pages.
- In the app's top bar on wide screens, after a `Mark`, with `mark={false}`.

## When not to use it

- **No room for the name** (phone top bar, an icon tile) → `Mark` alone, in a
  link named _Mockio_.
- **The brand inside a sentence** → plain text, capitalised: _Mockio es una
  herramienta de práctica_.
- **Mocki and the name together** → `Mascot` above a `Wordmark` with
  `mark={false}`. The character and the mark never appear side by side.

## Interaction

None of its own. As the way home it sits inside a link, and the link carries
`.focus-ring`, a rounded corner and, if you like, `aria-label="mockio"`:

```tsx
<a href="#top" aria-label="mockio" className="focus-ring rounded-md">
  <Wordmark className="text-xl font-semibold text-cream-bright" />
</a>
```

## Writing

- The component writes the name itself, and only the name. There is no prop
  for it: a product name is not translated, and routing it through a
  dictionary would invite exactly that.
- Always lowercase in the lockup. In running text the brand is a word in the
  sentence and takes a capital: _Mockio_.
- Never add a tagline or a second word inside the lockup.

## Internationalization

- **Translation**: `translate="no"` keeps browser translation from
  rewriting the name.
- **Right to left**: the lockup carries `dir="ltr"`, so in Arabic and Hebrew
  the mark still comes before the name. The page's direction still places the
  lockup — it sits at the start of an RTL nav, which is the right.
- **Text expansion**: none. The name is the same six letters in every locale;
  it is the labels around it that grow.

## Accessibility

- A plain `<span>`; the visible name is what a screen reader reads.
- The composed `Mark` has no label, so it is `aria-hidden` and the name is
  not announced twice.
- Contrast is the caller's ink. With `text-cream-bright`, used everywhere in
  the product, the name is above 16:1 on every surface in both themes.

## Do and don't

- ✅ Size it with a `text-*` class and let the mark follow.
- ✅ `mark={false}` when a `Mark` or a `Mascot` is already beside it.
- ✅ Name the home link once.
- ❌ A hand-built lockup: a fixed-size `Mark` and the name typed after it.
- ❌ Capitalising, translating or restyling the name's face.
- ❌ A tagline inside the lockup.
