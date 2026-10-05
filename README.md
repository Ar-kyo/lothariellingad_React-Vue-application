# Stockroom Product Management

React frontend for Laboratory Exercise No. 6. Product data is accessed only through the LavaLust HTTP API; the browser never connects directly to MySQL.

## Local setup

Run LavaLust locally at `http://127.0.0.1:3000`, with its API routes available under `/api`. Ensure the backend `API_ALLOWED_ORIGINS` includes the Vite origin `http://localhost:5173`.

```sh
npm install
npm run dev
```

In PowerShell, copy the example environment file before starting Vite:

```powershell
Copy-Item .env.example .env.local
```

The example environment uses `VITE_API_BASE_URL=http://127.0.0.1:3000/api`. Vite serves the frontend at `http://localhost:5173`. Change the API base URL only when pointing to a different API deployment.

Create an account with a username, email, and password, or sign in with an existing account. New accounts are regular users created by the LavaLust API; passwords are hashed by the backend. The frontend does not contain or store database credentials. Its bearer tokens are kept in `sessionStorage` and cleared on logout.

## LavaLust API contract

`VITE_API_BASE_URL` includes the `/api` prefix. LavaLust returns tokens inside `data` and the authenticated username inside `user`.

| Method | Route | Request / auth |
| --- | --- | --- |
| `POST` | `/auth/register` | `{ "username": "...", "email": "...", "password": "..." }` |
| `POST` | `/auth/login` | `{ "username": "...", "password": "..." }` |
| `POST` | `/auth/logout` | Bearer token; `{ "refresh_token": "..." }` |
| `GET` | `/products` | Bearer token |
| `POST` | `/products` | Bearer token; product fields |
| `PUT` | `/products/{id}` | Bearer token; product fields |
| `DELETE` | `/products/{id}` | Bearer token |

Product fields are `product_name`, `description`, `price`, and `quantity`. LavaLust requires all four fields when creating or updating a product. API errors use an `error` field in the JSON response.

## Checks

```sh
npm run lint
npm run build
npm run preview
```

## Deployment

Deploy the LavaLust API as a Render Web Service and connect it to Aiven MySQL using Render environment variables for database credentials and API signing keys. Do not commit `.env` or database credentials.

Deploy this frontend repository as a Render Static Site. Use build command `npm ci && npm run build` and publish directory `dist`. Set the frontend build environment variable `VITE_API_BASE_URL` to `https://<your-lavalust-api>.onrender.com/api`.

In the API Render service, set `API_ALLOWED_ORIGINS` to a comma-separated list containing the Vite origin during local development and the deployed frontend origin, for example `http://localhost:5173,https://<your-frontend>.onrender.com`. These origins must match the address loaded in the browser exactly. The frontend URL is public build configuration; never put a password, database URL, JWT signing secret, or other private credential in a `VITE_` variable.
