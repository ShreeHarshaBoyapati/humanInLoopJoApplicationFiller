#!/bin/sh
set -e

# Substitute only ${DOMAIN}; leave native Nginx $variables intact.
# DNS-01 challenge is used (not HTTP-01), so the full HTTPS config is always
# active once the certificate exists. If the certificate is missing, Nginx will
# fail to start, which is the correct signal to run certbot first.
envsubst '$DOMAIN' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
