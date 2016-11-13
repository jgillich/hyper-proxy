# hyper-proxy

A automated reverse proxy and load balancer for [Hyper](https://hyper.sh/).

## Getting started

Create a `docker-compose.yml`:

```
version: '2'
services:
  proxy:
    image: jgillich/hyper-proxy
    container_name: proxy
    ports:
      - "80:80"
      - "443:443"
    environment:
      - "HYPER_ACCESS=YOUR_ACCESS_KEY"
      - "HYPER_SECRET=YOUR_SECRET_KEY"
      - "LETSENCRYPT_EMAIL=YOUR_EMAIL" # optional
    size: s3
    fip: YOUR_FIP # get one by running hyper fip allocate
```

Then run it using `hyper compose up -d`, done!

Next, for each container, set the environment variable `VIRTUAL_HOST`, for
example `VIRTUAL_HOST=foo.mydomain.com`.

hyper-proxy will query the Hyper API every 60 seconds and pick up new containers
automatically.

## Configuration

hyper-proxy is configured via environment variables.

* HYPER_ACCESS: Your Hyper access key. Required.
* HYPER_SECRET: Your Hyper secret key. Required.
* LETSENCRYPT_EMAIL: If you want to enable Lets Encrypt certificates, your email. Optional.

## Questions?

Please create an issue if you have a question or need a feature.