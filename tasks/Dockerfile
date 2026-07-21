FROM golang:1.26.5-bookworm AS builder

WORKDIR /src
COPY . .

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux go build -o /out/alerts ./cmd/alerts && \
    CGO_ENABLED=0 GOOS=linux go build -o /out/ghwo ./cmd/ghwo && \
    CGO_ENABLED=0 GOOS=linux go build -o /out/wpcprob ./cmd/wpcprob

FROM debian:bookworm-slim

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# https://github.com/aptible/supercronic/releases
# install and pin manually.
ARG SUPERCRONIC_VERSION=v0.2.29
ARG SUPERCRONIC_SHA1=cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b
ARG WGRIB2_VERSION=wgrib-v3.8.0
ARG WGRIB2_SHA256=7670bad9ed9e5f316a0d2f56a09f917b5909fee551d9618dac92e05aec1121f9

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ca-certificates curl && \
    curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" && \
    echo "${SUPERCRONIC_SHA1} /usr/local/bin/supercronic" | sha1sum -c - && \
    chmod +x /usr/local/bin/supercronic && \
    curl -fsSLo /usr/local/bin/wgrib2 \
      "https://github.com/weather-gov/weather.gov/releases/download/${WGRIB2_VERSION}/wgrib2" && \
    echo "${WGRIB2_SHA256} /usr/local/bin/wgrib2" | sha256sum -c - && \
    chmod +x /usr/local/bin/wgrib2 && \
    apt-get purge -y curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /out/alerts /usr/local/bin/alerts
COPY --from=builder /out/ghwo /usr/local/bin/ghwo
COPY --from=builder /out/wpcprob /usr/local/bin/wpcprob
COPY crontab /etc/crontab

RUN useradd --system --user-group --shell /usr/sbin/nologin tasks
USER tasks

ENTRYPOINT ["/usr/local/bin/supercronic", "-json", "-passthrough-logs"]
CMD ["/etc/crontab"]
