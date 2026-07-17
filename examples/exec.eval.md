---
provider:
  type: exec
  command: "tr a-z A-Z"
assert:
  - equals: "HELLO"
---

hello
