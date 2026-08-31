# Playbook prompts

One system prompt per playbook: `prompts/<suite>/<tool-id>-<slug>.md`, with its
tool contract (JSON schema) beside it as `<tool-id>-<slug>.contract.json`.

Every prompt ships against **spec standard v1.1**: the eight-section template in
the website-studio blueprint Part 3, plus the Smart Ads additions (safety
mechanics §7, dependencies & routing §8) and, for agent-tier tools, the
Experience Modes section (Guided contract + Pro surface). A prompt that can't
fill every section isn't underspecified — it isn't done.

Suites: `website-studio/ smart-ads/ explorer/ ai-visibility/ otto/ local/
authority/ content/ realtor-studio/`.

First prompts per BUILD-ORDER (sprint 1): W1 PPC landing page ·
M3 tracking health · M1 breach scan · M2 performance pulse · A1 negatives
engine — drafted only after migrations-spec 0001/0002 are founder-approved,
since every scope contract cites those tables.
