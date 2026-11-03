import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { components, foundations, guides } from "../app/content";
import Home from "../app/pages/Home";
import ComponentPage from "../app/pages/ComponentPage";
import GuidePage from "../app/pages/GuidePage";

/**
 * The site's guard.
 *
 * The site is the system's front door: a person reads it instead of the
 * code. So it has to show everything the contract says — a prop that is
 * documented but missing from the page is a promise the page breaks — and it
 * has to show every component, every foundation and every guide, with
 * nothing registered by hand.
 *
 * The site also wears the system's palette, so it may not declare a colour
 * of its own: the variables it needs are read from the product stylesheet.
 */

const ROOT = path.resolve(__dirname, "..");

afterEach(cleanup);

function renderComponent(name: string) {
  return render(
    <MemoryRouter initialEntries={[`/component/${name}`]}>
      <Routes>
        <Route path="/component/:name" element={<ComponentPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderGuide(kind: "Foundations" | "Guides", slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/${kind.toLowerCase()}/${slug}`]}>
      <Routes>
        <Route path="/foundations/:slug" element={<GuidePage group="Foundations" />} />
        <Route path="/guides/:slug" element={<GuidePage group="Guides" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("the site lists what the system has", () => {
  it("shows every component, every foundation and every guide on the front page", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </MemoryRouter>,
    );
    for (const entry of components) {
      expect(screen.getByText(entry.name), entry.name).toBeTruthy();
    }
    for (const doc of foundations) {
      expect(screen.getByText(doc.title), doc.slug).toBeTruthy();
    }
    for (const doc of guides) {
      expect(screen.getByText(doc.title), doc.slug).toBeTruthy();
    }
  });

  it("has a page for every component", () => {
    for (const entry of components) {
      const { container } = renderComponent(entry.name);
      const text = container.textContent ?? "";
      expect(text.includes(entry.name), `${entry.name} has no page`).toBe(true);
      expect(text.includes(entry.contract.summary), `${entry.name} does not show its summary`).toBe(true);
      cleanup();
    }
  });

  it("has a page for every foundation and every guide", () => {
    for (const doc of foundations) {
      const { container } = renderGuide("Foundations", doc.slug);
      expect((container.textContent ?? "").includes(doc.title), doc.slug).toBe(true);
      cleanup();
    }
    for (const doc of guides) {
      const { container } = renderGuide("Guides", doc.slug);
      expect((container.textContent ?? "").includes(doc.title), doc.slug).toBe(true);
      cleanup();
    }
  });
});

describe("the page shows the whole contract", () => {
  it.each(components.map((entry) => [entry.name] as const))("%s shows every promise it makes", (name) => {
    const entry = components.find((candidate) => candidate.name === name)!;
    const { container } = renderComponent(name);
    const text = container.textContent ?? "";

    // Every prop, by name and by its default value.
    for (const [prop, contract] of Object.entries(entry.contract.props)) {
      expect(text.includes(prop), `${name}.${prop} is missing from the page`).toBe(true);
      if (contract.default) {
        expect(text.includes(contract.default), `${name}.${prop}'s default is missing`).toBe(true);
      }
    }

    // Every state, by name and by how it is reached.
    for (const state of entry.contract.states) {
      expect(text.includes(state.name), `${name}'s state ${state.name} is missing`).toBe(true);
      expect(text.includes(state.trigger), `${name}'s state ${state.name} has no trigger on the page`).toBe(true);
    }

    // Every preview, by title.
    for (const preview of entry.previews) {
      expect(text.includes(preview.title), `${name}'s preview ${preview.id} is missing`).toBe(true);
    }

    // The product's differences, when the contract declares them: the page
    // is where a reader finds out the product is not identical.
    for (const difference of entry.contract.appCounterpart?.differences ?? []) {
      expect(text.includes(difference.slice(0, 40)), `${name}'s product differences are missing`).toBe(true);
    }

    // The version and its changelog.
    expect(text.includes(entry.contract.version), `${name}'s version is missing`).toBe(true);
    for (const change of entry.contract.changelog[0]?.changes ?? []) {
      expect(text.includes(change.slice(0, 40)), `${name}'s changelog is missing`).toBe(true);
    }

    // The guidance is read, not printed: its frontmatter is the contract's
    // job and must not reach the page as text.
    expect(text.match(/level: (atom|molecule|organism|template|utility)/), `${name}'s frontmatter leaked`).toBe(null);
  });
});

describe("the site wears the system's palette", () => {
  it("declares no colour of its own", () => {
    const files = [
      ...readdirSync(path.join(ROOT, "app"))
        .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".css"))
        .map((name) => `app/${name}`),
      ...readdirSync(path.join(ROOT, "app/pages"))
        .filter((name) => name.endsWith(".tsx"))
        .map((name) => `app/pages/${name}`),
    ];
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      // A hex colour, a literal rgb() or hsl(): the palette belongs to the
      // tokens, and the site reads the product stylesheet for the variables.
      expect(source.match(/#[0-9a-fA-F]{3,8}\b/), `${file} declares a hex colour`).toBe(null);
      expect(source.match(/\brgba?\(\s*[0-9]/), `${file} declares an rgb() colour`).toBe(null);
      expect(source.match(/\bhsla?\(\s*[0-9]/), `${file} declares an hsl() colour`).toBe(null);
    }
  });
});
