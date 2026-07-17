import { expect, test } from "bun:test";
import { render } from "./template.ts";

test("substitutes vars", () => {
  expect(render("Hi {{name}}, age {{age}}", { name: "Ada", age: 36 })).toBe("Hi Ada, age 36");
});

test("tolerates whitespace in braces", () => {
  expect(render("{{ x }}", { x: "y" })).toBe("y");
});

test("throws on unknown var", () => {
  expect(() => render("{{missing}}", {})).toThrow(/unknown variable/);
});
