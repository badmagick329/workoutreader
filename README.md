# workoutreader

A plain-text strength-training log (`data/input.txt`) with a Bun/React dashboard for logging workouts on a phone and reviewing progress.

## Local development

```bash
bun install
cd dashboard
bun install
bun dev
```

The dashboard serves on `http://127.0.0.1:3000` and reads `../data` relative to `dashboard`. Set `DATA_DIR`, `APP_HOST` or `APP_PORT` to override. Run tests with `bun test` from the root and a production build with `bun run build` from `dashboard`.

`bun run src/index.ts` from the root prints every parsed set and exports them to `data/output.csv`.

## Docker deployment

Copy `.env.example` to `.env` and set the required `HOST_PORT` value. `APP_HOST` and
`APP_PORT` control the container listener and have defaults in `compose.yml`.
The published port binds to `127.0.0.1` by default. The API has no authentication;
use an authenticated reverse proxy or an SSH tunnel for remote access. Set
`HOST_BIND_ADDRESS` only when intentionally allowing access on another host interface.

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

## Deploy

Copy `.env.deploy.example` to the ignored `.env.deploy`, set `DEPLOY_HOST` and
`DEPLOY_PATH`, then run:

```bash
bun run deploy
```

Set `DEPLOY_HEALTH_URL` if the deployment should also verify a server-local URL.

For the mobile workout flow, input format, saving behavior and code map, see [the codebase guide](docs/CODEBASE_GUIDE.md).
