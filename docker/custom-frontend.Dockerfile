FROM --platform=$BUILDPLATFORM node:lts-bookworm-slim AS builder-base
COPY src/frontend /frontend

RUN cd /frontend && npm install && npm run build

FROM nginxinc/nginx-unprivileged:stable-bookworm-perl AS runtime

LABEL org.opencontainers.image.title=app-frontend
LABEL org.opencontainers.image.authors=['App Team']
LABEL org.opencontainers.image.licenses=MIT

COPY --from=builder-base --chown=nginx /frontend/build /usr/share/nginx/html
COPY --chown=nginx ./docker/frontend/start-nginx.sh /start-nginx.sh
COPY --chown=nginx ./docker/frontend/default.conf.template /etc/nginx/conf.d/default.conf.template
RUN chmod +x /start-nginx.sh
ENTRYPOINT ["/start-nginx.sh"] 