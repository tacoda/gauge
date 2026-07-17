---
provider: openai/gpt-4o-mini
vars:
  topic: "photosynthesis"
assert:
  - llm-rate:
      rubric: "Explains the topic clearly for a 10-year-old in 1-2 sentences"
      min: 0.6
---

Explain {{topic}} to a 10-year-old in one or two sentences.
