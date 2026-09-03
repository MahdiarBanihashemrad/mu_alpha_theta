# Austin High Mu Alpha Theta Tutoring

Student tutoring requests and a protected tutor/officer portal for Austin High Mu Alpha Theta.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL, publishable key, and server-only secret key.
3. Run `supabase/migrations/0001_tutor_portal.sql` in the Supabase SQL Editor.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev`.

## First administrator

After the migration:

1. In Supabase, open **Authentication → Users → Add user**.
2. Create the first administrator with their school email and a unique temporary password.
3. Open `supabase/bootstrap-admin.sql.example`, replace every placeholder, and run the completed statement in the Supabase SQL Editor.
4. Sign in through `/tutor/login` with the administrator's username and temporary password.
5. Replace the temporary password when prompted.

The administrator can then add tutors and officers from **Tutor View → Manage tutors**.

## Tutor assignment texts

1. Run `supabase/migrations/0003_tutor_sms.sql` in the Supabase SQL Editor.
2. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and `NEXT_PUBLIC_SITE_URL` to the Vercel project environment variables.
3. In **Manage tutors**, add each tutor's phone number and enable assignment texts only after they agree to receive them.

When an administrator or officer assigns a request to a different tutor and saves it, the assignment remains saved even if the text provider is unavailable. The dashboard reports whether the text was sent.

Never commit `.env.local`, a Supabase secret key, private tutor data, or temporary passwords.
