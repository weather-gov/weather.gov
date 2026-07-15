FROM golang:1.26.5-bookworm AS builder

WORKDIR /src
COPY . .

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux go build -o /out/alerts ./cmd/alerts && \
    CGO_ENABLED=0 GOOS=linux go build -o /out/ghwo ./cmd/ghwo

FROM debian:bookworm-slim

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# https://github.com/aptible/supercronic/releases
# install and pin manually.
ARG SUPERCRONIC_VERSION=v0.2.29
ARG SUPERCRONIC_SHA1=cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates curl \
      # these libraries are required for wgrib2 \
      libgfortran5 libgomp1 libquadmath0 && \
    curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" && \
    echo "${SUPERCRONIC_SHA1} /usr/local/bin/supercronic" | sha1sum -c - && \
    chmod +x /usr/local/bin/supercronic && \
    apt-get purge -y curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY --from=sondngyn/wgrib2:aws /usr/local/bin/wgrib2 /usr/local/bin/wgrib2
COPY --from=builder /out/alerts /usr/local/bin/alerts
COPY --from=builder /out/ghwo /usr/local/bin/ghwo
COPY crontab /etc/crontab

RUN useradd --system --user-group --shell /usr/sbin/nologin tasks
USER tasks

ENTRYPOINT ["/usr/local/bin/supercronic", "-json", "-passthrough-logs"]
CMD ["/etc/crontab"]
