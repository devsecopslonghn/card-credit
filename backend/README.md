# Backend

The standalone backend runtime has not been implemented yet.

The current API routes still run inside the Next.js application under:

`frontend/app/api/`

This directory is reserved for the future backend extraction.

Until the backend runtime is implemented:

- There is no backend package or entrypoint.
- There is no backend Docker image.
- Docker Compose runs only the existing Next.js application.
- API implementations must not be duplicated into this directory.
- A real Dockerfile will be created together with the package, entrypoint,
  build/start commands, and health endpoint for the standalone runtime.
