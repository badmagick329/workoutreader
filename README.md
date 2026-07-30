# workoutreader

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.17. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## Docker deployment

Copy `.env.example` to `.env` and set the required `HOST_PORT` value. `APP_HOST` and
`APP_PORT` control the container listener and have defaults in `compose.yml`.

```bash
docker compose up -d --build
docker compose logs -f
docker compose down
```

Persistent input and settings live in `./data` on the host, mounted at `/data` in the
container. For first-run setup, create `data/input.txt` using the input format below.
No migrations are required.

Back up by stopping the app if a consistent snapshot is needed, then copy `./data` to
your backup location. Restore by stopping the app, replacing `./data` with the backup,
and starting it again. Rebuilding or recreating the container does not delete data in
`./data`.
