# Booth Reviews Privacy Policy

Effective date: 2026-05-03

Booth Reviews adds community reviews and ratings to Booth.pm listing pages. This policy explains what the extension and backend handle, why that data is needed, and where to ask privacy questions.

The goal is to respect user privacy while being honest about how the extension works. Booth Reviews is not an anonymous system: if you sign in, write reviews, vote, or report content, the service stores account and activity records needed to run and moderate the review system.

## Data We Collect

Booth Reviews collects data needed to show reviews on Booth pages, let signed-in users participate, prevent abuse, and moderate reports.

| Data | Source | Purpose |
|---|---|---|
| Booth item IDs, Booth URLs, and canonical Booth URLs | Booth pages where the extension runs | Match review data to the correct Booth item and avoid duplicate item records. |
| Booth shop or creator identifiers and URLs | Booth listing, search, and creator pages | Group item metadata and connect items to creators or shops. |
| Discord user ID and public Discord display name | Discord OAuth `identify` scope | Create an account, display review authorship, and enforce moderation decisions. |
| Public display name edits | User account settings in the extension | Let users choose the name shown with their reviews. |
| Reviews, ratings, review language, and purchase-state signal | User-submitted review form and page state visible to the extension | Publish community review content for Booth items. |
| Helpful votes | User actions in the extension | Record which reviews a signed-in user marked as helpful or unhelpful. |
| Reports and report details | User actions in the extension | Support moderation and abuse handling. |
| Session tokens | Discord sign-in flow | Keep users signed in. The extension stores the token locally; the backend stores only a SHA-256 hash of each token. |
| Rate-limit records | Backend service | Limit review and report spam. |
| Timestamps for records and moderation actions | Backend service | Operate the service, expire sessions, and audit moderation decisions. |

The backend is hosted on Cloudflare. Like most hosted services, Cloudflare and the Worker platform may process request metadata such as IP address, user agent, timestamps, and request paths as part of delivering, securing, debugging, and monitoring the service. Booth Reviews does not currently use a separate analytics or advertising SDK.

## Data We Do Not Collect

Booth Reviews does not collect general browsing history across the web. The extension is configured to run on `booth.pm` and `*.booth.pm` pages, and it sends Booth item/shop information to the backend when needed for review functionality.

Booth Reviews does not intentionally collect payment information, Booth account credentials, Discord email addresses, Discord guild membership, Discord private messages, or the contents of pages outside Booth.pm.

Booth Reviews does not request Discord scopes beyond `identify`. Discord access tokens are used by the backend during login to fetch the Discord user ID and public name; they are not stored in the Booth Reviews database.

Booth Reviews does not scrape or store full Booth product pages. It stores the Booth item IDs, item URLs, canonical URLs, creator/shop identifiers, and related timestamps needed for the review system.

## How Data Is Used

Collected data is used to:

- Show review summaries, written reviews, helpfulness votes, and report actions on Booth pages.
- Let signed-in users create, edit, delete, vote on, and report reviews.
- Prevent spam and abusive behavior with rate limits and manual moderation.
- Maintain item metadata so the service can distinguish available, unavailable, and stale Booth listings.
- Investigate moderation reports, bans, deleted reviews, and account deletion requests.

## Data Sharing

Booth Reviews does not sell user data.

Booth Reviews shares data only with services required to operate the product:

- Discord, during OAuth login with the `identify` scope.
- Cloudflare, which hosts the Worker API and D1 database and processes requests to the backend.

Public reviews, ratings, helpfulness counts, and display names are visible to other Booth Reviews users. Moderation reports are not public, but they may be reviewed by project maintainers for moderation and safety purposes.

## Firefox Data Collection Disclosure

For Firefox's built-in data consent prompt, Booth Reviews declares the following required data categories because the extension transmits this data to the Booth Reviews backend as part of its core review functionality:

- `personallyIdentifyingInfo`: Discord user ID and public display name.
- `authenticationInfo`: extension account/session information used for login.
- `personalCommunications`: user-submitted review text and report details.
- `browsingActivity`: Booth listing and shop URLs needed to attach reviews to the correct item.
- `websiteContent`: visible Booth item identifiers and shop identifiers read from Booth pages.
- `websiteActivity`: review, vote, report, edit, and delete actions taken through the extension on Booth pages.

## Data Retention And Deletion

Reviews remain available until the author deletes them or moderators remove them. Deleted reviews are soft-deleted in the database so moderation and abuse history can be preserved.

Session records expire automatically and can be revoked by signing out. Signing out removes the local session token from extension storage and marks the backend session as revoked when possible.

Users can request account or review deletion through the support contact listed below. Some moderation, report, rate-limit, and abuse-prevention records may be retained when needed to protect the service, investigate abuse, comply with platform requirements, or maintain an accurate moderation history.

## Security

Booth Reviews uses Discord OAuth for authentication and stores opaque session tokens in browser extension storage. The backend stores only hashed session tokens. API authentication from the extension uses `Authorization: Bearer <token>` headers, not cookies.

Admin moderation pages may use a secure, HTTP-only admin session cookie. Public extension functionality does not require Booth Reviews cookies.

## Contact

For privacy, support, or deletion requests, open an issue or discussion from the support page:

https://github.com/frog-enjoyer/booth-reviews/blob/main/docs/SUPPORT.md
