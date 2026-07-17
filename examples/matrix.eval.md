---
provider: openai/gpt-4o-mini
assert:
  - regex: "/^(auth|billing|technical|other)$/"
cases:
  - name: password-reset
    vars: { input: "I forgot my password" }
    assert:
      - equals: "auth"
  - name: refund
    vars: { input: "I want a refund on my last invoice" }
    assert:
      - equals: "billing"
---

You are a support router. Reply with exactly one lowercase category slug (one
of: auth, billing, technical, other). No punctuation, no explanation.

User request: {{input}}
