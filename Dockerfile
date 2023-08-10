FROM drupal:10-apache

# Copy the zscaler root CA into the container, and configure both cURL and PHP
# to use it. This allows composer inside the container to access the package
# registry.
COPY zscaler-root.pem /var/certs/zscaler-root.pem
ENV CURL_CA_BUNDLE=/var/certs/zscaler-root.pem
RUN cp /usr/local/etc/php/php.ini-production /usr/local/etc/php/php.ini 
RUN echo "openssl.cafile=/var/certs/zscaler-root.pem" >> /usr/local/etc/php/php.ini
