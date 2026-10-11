# NorthRide Admin

NorthRide Admin is a separate React web console for administrators. It uses the
backend's existing session login and includes an operations overview, rider
review queue, orders, deliveries, rides, support tickets, user accounts, and
system configuration.

Administrators can edit account details, rider vehicle details, order and
delivery status/assignments, ride status, support ticket
status/priority/assignment, and editable system-config values. Ride and
delivery per-kilometer prices can be changed in Pricing; customer quotes and
payment totals use the saved rates plus the GHS 5.00 base fare. Deletion is
restricted to eligible records:
account deletion is blocked when transaction or service history exists, and
orders/deliveries can only be removed while pending, unpaid, unassigned, and
without related financial transactions or rider earnings.
System-config keys are structural and can be edited only when marked editable;
they cannot be deleted from the console.

The Home promotions section manages promotion and suggestion cards shown on the
customer dashboard. Admins upload JPG, PNG, or WebP card images (up to 5 MB)
directly to the backend's private AWS S3 bucket. Cards can include distance,
location, and rating details. Admins can publish, hide, or delete cards; only
published cards are returned to the mobile app, which receives temporary signed
image URLs. Apply the backend's `0018_home_page_content` Drizzle migration
before using this section.

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

Dashboard images are sent to the authenticated backend, which validates and
stores them in the private S3 bucket. The browser does not upload directly to
S3, so the bucket does not need browser CORS rules for the admin web origin.

The Users section can create customer, rider, and administrator accounts.
Newly created accounts are active and verified immediately, so share the
initial password with the user through a secure channel. Rider accounts still
need to finish mobile onboarding and submit the required documents before they
can be approved.
# northride-web
