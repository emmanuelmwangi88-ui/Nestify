# Nestify — verified property marketplace and agent portal

A static front end with a production-ready Supabase schema for accountable Kenyan rental and short-stay listings.

## Pages

- `index.html` — public rentals and short stays
- `agent.html` — agent registration, login and dashboard
- `SETUP.md` — Supabase and Google Maps configuration
- `supabase/migrations/` — current database changes (apply to your project); `supabase-schema.sql` is a superseded draft
- `config.js` — browser-safe public configuration

## What works

### Public marketplace

- Rent / short-stay modes
- Search across all 47 official county names
- Redesigned multi-field search for keyword, county, type, budget, bedrooms, dates and guests
- Grid/list property preview modes, sorting, quick filters and curated discovery shortcuts
- 40 clearly labelled demo previews (26 rentals and 14 stays), including 12 additional luxury houses and villas
- Editorial Signature Homes collection and full-screen image lightbox
- Luxury mortgage planner with deposit, rate and term controls
- Private-search concierge brief with structured requirements
- Progressive “load more” browsing for the larger catalogue
- Side-by-side comparison for up to three properties
- Recently viewed history, sharing, saved homes and amenity filter chips
- Live counts based only on approved inventory—demo previews are never counted as live
- Agent-uploaded interior photos and video
- Exact Google Maps embeds from stored coordinates
- Source agent and last-updated information
- Saved properties on the current device
- Rental enquiries
- Date, guest and quoted-total booking requests for BnBs
- Clear empty states rather than invented inventory

### Agent workspace

- Supabase email/password registration and login
- Browser-only Preview Mode when Supabase is not configured
- Portfolio overview and listing statuses
- Draft and approval submission workflow
- Property form supporting monthly rentals and BnBs
- Required coordinates, county, address and property details
- Google Places address search and draggable map marker when configured
- Manual coordinates and browser geolocation fallback
- Multiple interior images plus one video
- Enquiry and booking inboxes
- Accept / decline request states
- Approval, rejection, enquiry and booking notifications
- Agent profile and verification state

## Run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173` for the marketplace and `http://localhost:4173/agent.html` for the agent portal.

## Data integrity

Nestify does not seed fictional property inventory. Public cards are built only from records with `status = 'published'`. Production agents cannot publish themselves under the included row-level security rules; approval is performed by an administrator. Every public record shows its submitting agent, stored location and update date.

Preview Mode is clearly labelled. It lets you register, upload small media files, submit a property, and use **Approve for preview** to test the public page in one browser. Preview data is not presented as production-verified information.

See `SETUP.md` before deployment.

## Commercial model

- Starter: KSh 2,500/month, 3 active listings
- Growth: KSh 6,500/month, 12 active listings
- Elite: KSh 15,000/month, 40 active listings
- Clickwrap Agent Agreement required before payment
- M-Pesa STK Push initiated through a Supabase Edge Function
- Automatic publication after server-confirmed payment
- Plan limits enforced in PostgreSQL RLS, not just the UI
- Open reviews: anyone can review a live listing (no token), rate-limited and de-duplicated by the `submit-review` function

`AGENT_AGREEMENT.md` must receive Kenyan legal review before production launch.
