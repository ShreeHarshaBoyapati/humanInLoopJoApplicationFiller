# Tiny Nginx image with the JFP reverse-proxy config baked in.
# At runtime the DOMAIN env var is substituted into the config template.
# We use certbot DNS-01 (DuckDNS), so the full HTTPS config is used directly.
FROM nginx:alpine

# envsubst is used by the entrypoint to inject ${DOMAIN} into the config template.
RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
