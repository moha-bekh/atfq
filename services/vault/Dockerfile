FROM hashicorp/vault:1.13.3

RUN mkdir -p /vault/config /vault/data && \
  chown -R 100:1000 /vault/config /vault/data && \
  chmod -R 700 /vault/data

EXPOSE 8200

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["server", "-config=/vault/config/vault.hcl"]
