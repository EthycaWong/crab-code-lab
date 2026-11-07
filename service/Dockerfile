FROM node:24-bookworm-slim AS sandbox-builder
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev linux-libc-dev libseccomp-dev && rm -rf /var/lib/apt/lists/*
COPY service/sandbox.c /tmp/sandbox.c
RUN gcc -O2 -Wall -Wextra -Werror /tmp/sandbox.c -lseccomp -o /usr/local/bin/crab-sandbox

FROM node:24-bookworm-slim
ARG TARGETARCH
ARG ARDUINO_CLI_VERSION=1.5.1
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates python3 libseccomp2 && rm -rf /var/lib/apt/lists/*
RUN case "$TARGETARCH" in arm64) ARCH=ARM64 ;; *) ARCH=64bit ;; esac && curl -fsSL "https://github.com/arduino/arduino-cli/releases/download/v${ARDUINO_CLI_VERSION}/arduino-cli_${ARDUINO_CLI_VERSION}_Linux_${ARCH}.tar.gz" | tar xz -C /usr/local/bin arduino-cli
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
RUN mkdir -p /home/node/.arduino15 /home/node/Arduino && chown -R node:node /home/node
USER node
RUN arduino-cli core update-index && arduino-cli core install arduino:avr@1.8.8
COPY --chown=node:node service/ ./service/
COPY --from=sandbox-builder /usr/local/bin/crab-sandbox /usr/local/bin/crab-sandbox
ENV COMPILER_HOST=0.0.0.0 COMPILER_PORT=4319 COMPILE_TMPDIR=/tmp HOME=/home/node ARDUINO_CLI=/usr/local/bin/crab-sandbox
EXPOSE 4319
CMD ["node", "service/server.mjs"]
