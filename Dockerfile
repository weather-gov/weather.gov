FROM php:8.2-apache-bookworm

# install the PHP extensions we need
RUN set -eux; \
  \
  if command -v a2enmod; then \
  a2enmod rewrite; \
  fi; \
  \
  savedAptMark="$(apt-mark showmanual)"; \
  \
  apt-get update; \
  apt-get install -y --no-install-recommends \
  libfreetype6-dev \
  libjpeg-dev \
  libpng-dev \
  libpq-dev \
  libwebp-dev \
  libzip-dev \
  ; \
  \
  docker-php-ext-configure gd \
  --with-freetype \
  --with-jpeg=/usr \
  --with-webp \
  ; \
  \
  docker-php-ext-install -j "$(nproc)" \
  gd \
  opcache \
  pdo_mysql \
  pdo_pgsql \
  zip \
  ; \
  \
  # reset apt-mark's "manual" list so that "purge --auto-remove" will remove all build dependencies
  apt-mark auto '.*' > /dev/null; \
  apt-mark manual $savedAptMark; \
  ldd "$(php -r 'echo ini_get("extension_dir");')"/*.so \
  | awk '/=>/ { so = $(NF-1); if (index(so, "/usr/local/") == 1) { next }; gsub("^/(usr/)?", "", so); print so }' \
  | sort -u \
  | xargs -r dpkg-query -S \
  | cut -d: -f1 \
  | sort -u \
  | xargs -rt apt-mark manual; \
  \
  apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
  rm -rf /var/lib/apt/lists/*

# set recommended PHP.ini settings
# see https://secure.php.net/manual/en/opcache.installation.php
RUN { \
  echo 'opcache.memory_consumption=128'; \
  echo 'opcache.interned_strings_buffer=8'; \
  echo 'opcache.max_accelerated_files=4000'; \
  echo 'opcache.revalidate_freq=60'; \
  } > /usr/local/etc/php/conf.d/opcache-recommended.ini

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/

# Copy the zscaler root CA into the container, and configure both cURL and PHP
# to use it. This allows composer inside the container to access the package
# registry.
COPY zscaler-root.pem /var/certs/zscaler-root.pem
ENV CURL_CA_BUNDLE=/var/certs/zscaler-root.pem
RUN cp /usr/local/etc/php/php.ini-production /usr/local/etc/php/php.ini 
RUN echo "openssl.cafile=/var/certs/zscaler-root.pem" >> /usr/local/etc/php/php.ini

# https://www.drupal.org/node/3060/release
ENV DRUPAL_VERSION 10.1.2

WORKDIR /opt/drupal
RUN set -eux; \
  export COMPOSER_HOME="$(mktemp -d)"; \
  composer create-project --no-interaction "drupal-composer/drupal-project:10.x-dev" ./; \
  chown -R www-data:www-data web/sites web/modules web/themes; \
  rmdir /var/www/html; \
  ln -sf /opt/drupal/web /var/www/html; \
  # delete composer cache
  rm -rf "$COMPOSER_HOME"

ENV PATH=${PATH}:/opt/drupal/vendor/bin

# vim:set ft=dockerfile:
