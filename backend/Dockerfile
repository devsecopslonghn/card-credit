# syntax=docker/dockerfile:1

FROM alpine:3.20

WORKDIR /backend

COPY backend/README.md ./README.md

CMD ["sh", "-c", "cat README.md && echo && echo 'No backend runtime exists in Phase 1.' && exit 1"]
