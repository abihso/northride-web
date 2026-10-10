# NorthRide Admin

NorthRide Admin is a separate React web console for administrators. It uses the
backend's existing session login and includes an operations overview, rider
review queue, orders, support tickets, user accounts, and system configuration.

## Local development

1. Start the NorthRide backend.
2. Install the web app dependencies with `npm install`.
3. Set `VITE_API_BASE_URL` if the backend is not at `http://localhost:5000/api`.
   The value should include the `/api` prefix.
4. Run `npm run dev` and open the Vite URL shown in the terminal.

For example, create an `admin-web/.env.local` file containing:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

The backend must allow the web app's origin in `CLIENT_ORIGINS`. Local backend
development defaults include `http://localhost:5173` and
`http://127.0.0.1:5173`.

## Build and deployment

Run `npm run build` to type-check and produce the static app in `dist/`. Deploy
that directory to a static web host and configure `VITE_API_BASE_URL` at build
time for the production API. Add the exact production web origin to the
backend's `CLIENT_ORIGINS`.

Production must use HTTPS so the backend's secure session cookie can be sent.
The API must enable credentialed CORS for the exact admin origin. Do not use a
wildcard origin with credentialed requests.

Only backend-authorized administrator accounts can use the console. The rider
queue provides private previews of submitted Ghana Card (front and back),
driver license (front and back), roadworthiness, and insurance images. Admins
must confirm reviewing all six images before the approval control is enabled;
the backend independently rejects approval if any required document is
missing. Configure private AWS S3 storage for the backend before enabling rider
document submissions.

The Users section can create customer, rider, and administrator accounts.
Newly created accounts are active and verified immediately, so share the
initial password with the user through a secure channel. Rider accounts still
need to finish mobile onboarding and submit the required documents before they
can be approved.
# northride-web
