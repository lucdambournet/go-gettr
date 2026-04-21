# GoGettr

A family chore and task management app. Assign chores, track weekly progress, and manage your family — all in one place.

## Stack

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Data:** TanStack Query, React Router v6
- **Backend:** Supabase (auth + Postgres database)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local  # then fill in your values
```

`.env.local` variables:

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
