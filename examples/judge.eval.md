---
provider: openai/gpt-4o-mini
vars:
  q: "What is 2 + 2?"
assert:
  - llm-judge: "The answer states the result is 4"
---

Answer concisely: {{q}}
