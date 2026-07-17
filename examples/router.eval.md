---
provider: openai/gpt-4o-mini
vars:
  input: "I forgot my password and can't log in"
assert:
  - contains: "auth"
  - regex: "/auth|login|password|reset/i"
---

You are a support router. Reply with a single lowercase category slug for the
user's request (one of: auth, billing, technical, other). No punctuation, no
explanation.

User request: {{input}}
