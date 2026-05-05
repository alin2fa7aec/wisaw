---
name: nushell syntax preference
description: User runs nushell (nu) — CLI commands they execute manually must use nushell syntax, not bash/POSIX
type: feedback
---

Commands given to the user to run manually must be in nushell syntax.

**Why:** The user's shell is nushell; bash-style variable expansion ($(...), backticks), && chaining, and heredocs don't work there.

**How to apply:** When providing commands for the user to copy-paste and run, use nushell idioms (let, pipelines with |, `do {}`, etc.). Internal tool calls (Bash tool) still use bash since the sandbox runs bash.
