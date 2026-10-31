# FoundIt

A campus lost-and-found app that matches lost items to found items and uses a **verification question** so only the real owner can claim something.

**Live demo:** https://foundit-nu.vercel.app

Built solo for the Appwrite Databases Hackathon.

## The problem

Lost-and-found on campus means WhatsApp groups and notice boards. A post like "black bag near library" never lines up with "dark backpack with a Dell laptop sleeve", and anyone can claim anything.

## How it works

1. A finder posts a found item with a description and a **verification question** only the owner could answer.
2. An owner posts a lost item in their own words.
3. **Find matches** ranks the opposite type of item by how much its description overlaps.
4. The owner answers the verification question to send a claim.
5. The finder sees the answer and approves or rejects it. Approved items are marked **Returned**.

## Appwrite usage

- **TablesDB** is the main database, with two tables:
  - `items`: type, title, description, status, ownerId, verifyQuestion
  - `claims`: itemId, claimerId, claimerName, answer, status
- **Auth** handles email/password signup and sessions.
- Table permissions let signed-in users create, read and update rows.

## Tech stack

Next.js, React, TypeScript, Tailwind CSS, the `appwrite` JavaScript SDK, deployed on Vercel.

## Run locally

```bash
git clone https://github.com/Afnan-Tahib/foundit.git
cd foundit
npm install
```

Create `.env.local` with your own Appwrite values:

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
NEXT_PUBLIC_APPWRITE_DATABASE_ID=
NEXT_PUBLIC_APPWRITE_ITEMS_TABLE_ID=
NEXT_PUBLIC_APPWRITE_CLAIMS_TABLE_ID=
```

Then run `npm run dev` and open http://localhost:3000.

## Known limitations and next steps

- Matching currently scores shared keywords between descriptions. It is not yet true semantic search, because VectorsDB was not available on the free plan I used.
- Next step: store text embeddings and rank matches by meaning, so "dark bag" matches "black backpack".
- Planned: photo uploads, realtime claim notifications, and a hidden verification answer visible only to the finder.