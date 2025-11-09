# syntax=docker/dockerfile:1.7
# Docker/Podman/Kubernetes file for running the bot

# docker can kiss my shiny ass.

# Enable/disable usage of ImageMagick (1 = with IM build, 0 = without)
ARG MAGICK="1"
# Optional: install MS core fonts (slow/flaky). 1 = install, 0 = skip
ARG MS_FONTS="0"

FROM node:lts-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

# Minimal, reliable fonts (libre) + tools you actually use later
RUN apk add --no-cache \
      fontconfig \
      ttf-liberation \
      ttf-dejavu \
      curl \
      git \
      ca-certificates \
    && fc-cache -fv

# Enable corepack & activate pnpm from package.json (fallback to latest)
# Copy only manifests first to maximize layer cache
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable \
 && corepack prepare pnpm@latest --activate


# Now copy the rest of the source
COPY . .

# Optional: MS fonts for meme commands (flaky mirrors, so retry)
RUN if [ "$MS_FONTS" = "1" ]; then \
      apk add --no-cache msttcorefonts-installer cabextract || true; \
      for i in 1 2 3; do \
        update-ms-fonts && break || { echo "update-ms-fonts failed (attempt $i)"; sleep $((i*3)); }; \
      done; \
      fc-cache -fv || true; \
    else \
      echo "Skipping MS core fonts (set MS_FONTS=1 to enable)"; \
    fi

RUN mkdir -p /built

# ---------- no-ImageMagick native deps ----------
FROM base AS native-build-0
RUN apk add --no-cache \
      git cmake python3 alpine-sdk \
      fontconfig-dev vips-dev zxing-cpp-dev

# ---------- with-ImageMagick native deps ----------
FROM base AS native-build-1
RUN apk add --no-cache \
      git cmake python3 alpine-sdk \
      zlib-dev libpng-dev libjpeg-turbo-dev freetype-dev fontconfig-dev \
      libtool libwebp-dev libxml2-dev \
      vips-dev libc6-compat zxing-cpp-dev

# Build liblqr (needed for ImageMagick w/ liquid rescale) — only in this stage
RUN git clone https://github.com/carlobaldassi/liblqr ~/liblqr \
 && cd ~/liblqr \
 && ./configure --prefix=/built \
 && make -j"$(getconf _NPROCESSORS_ONLN)" \
 && make install \
 && cp -a /built/* /usr

# Build ImageMagick from source with liblqr
RUN git clone https://github.com/ImageMagick/ImageMagick.git ~/ImageMagick \
 && cd ~/ImageMagick \
 && ./configure \
      --prefix=/built \
      --disable-static \
      --disable-openmp \
      --with-threads \
      --with-png \
      --with-webp \
      --with-modules \
      --with-pango \
      --without-hdri \
      --with-lqr \
 && make -j"$(getconf _NPROCESSORS_ONLN)" \
 && make install \
 && cp -a /built/* /usr

# ---------- build the app (with or without IM) ----------
FROM native-build-${MAGICK} AS build
# BuildKit cache for pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Detect ImageMagick usage and adjust build accordingly (POSIX [ ])
RUN if [ "$MAGICK" = "1" ]; then \
      pnpm run build --CDWITH_BACKWARD=OFF; \
    else \
      pnpm run build:no-magick --CDWITH_BACKWARD=OFF; \
    fi

FROM native-build-${MAGICK} AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

# ---------- final image ----------
FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build/Release /app/build/Release
COPY --from=build /app/dist /app/dist
COPY --from=build /built /usr

# scrub dev stuff
RUN rm -f .env \
 && rm -rf src natives \
 && mkdir -p /app/help /app/temp /app/logs \
 && chmod 777 /app/help /app/temp /app/logs

ENTRYPOINT ["node", "dist/app.js"]

