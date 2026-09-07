# Decisions

- Use the existing package scripts and CI checks as verification authority.
- Keep V0 file-based and repository-local: no database, daemon, supervisor,
  workflow engine, model router or global CLI.
- Default to one worker; task records and evidence preserve continuity across
  chat/session compaction.
