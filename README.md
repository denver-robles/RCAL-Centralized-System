# RCAL Centralized System

A centralized records and information system for the **Roman Catholic Archdiocese of Lipa (RCAL)**, the archdiocese serving the entire province of Batangas, Philippines.

---

## The problem

The archdiocese comprises roughly 64 parishes spread across 34 cities and municipalities. Each parish maintains its **own sacramental registers** — bound volumes of baptisms, confirmations, marriages, and deaths, kept in the parish office.

That structure creates three concrete problems:

1. **A person cannot obtain a certificate without going back to the issuing parish.** A baptismal certificate used for a wedding must be issued by the parish where the baptism was recorded, even if the person now lives on the other side of the province.
2. **There is no way to verify a record across parishes.** A parish preparing a wedding cannot confirm whether the other party's baptismal record actually exists, or whether it carries annotations.
3. **The archdiocese cannot see its own data.** There is no province-wide view of how many baptisms, marriages, or confirmations occur, or where clergy are assigned.

This system consolidates those records into one searchable, access-controlled database so that any authorized parish or the chancery can locate, verify, and issue certified copies of a record regardless of where it was originally recorded.

## Who uses it

| Actor | Needs |
|---|---|
| Parish staff (secretary / clerk) | Register new sacraments, search records, prepare certificates |
| Chancery / archdiocesan office | Province-wide search and verification, reporting, clergy assignments |
| Clergy | View records for their parish, sign off on certificates |
| Record requester (lay person) | Request a certified copy and track its status |

## Scope (v1)

- **Sacramental records** — create, search, view, and issue certified copies for Baptism, Confirmation, Marriage, and Death.
- **Parish directory** — vicariates, parishes, and clergy assignments.
- **Mass intentions** — request and schedule Mass intentions and blessings.
- **Analytics** — parish, clergy, and sacramental counts computed from the database.
- **Authentication** — role-based access separating parish staff, chancery, and clergy.

## Domain rules that shape the design

These are not optional details — they determine the schema.

- **Records are annotated, never altered.** A baptismal record is never edited. When the person later marries, is ordained, or makes a religious profession, a note is added in the margin referencing that event. The schema must therefore treat records as immutable and store annotations as separate, append-only rows.
- **Every record carries a book, page, and entry number**, plus the originating parish. This citation is what makes a certificate legally checkable, and it is how two records are distinguished when names collide.
- **The certified true copy is the real output.** The system's deliverable to a citizen is a signed, verifiable certificate — not a screenshot of a database row. Certificate issuance needs its own workflow (requested → verified → issued) and an audit trail of who issued what.
- **These records are personal data used as legal evidence.** Philippine **RA 10173 (Data Privacy Act)** applies, and canon law governs who may access the registers. Access must be role-scoped, and every read of a record by staff should be accountable.

## Status

**Front-end prototype plus a working back-end core.** The Flask application
boots, serves the landing page, signs users in against real hashed-password
accounts, and carries the parish directory, register search, and the
certified-copy workflow end to end.

What exists:

- `rcal/` — the application package
  - `create_app()` factory: configuration, database, login and CSRF wiring
  - `services.py` — read-side logic: parish scoping, register search,
    workflow queries, and the aggregate counts behind the analytics page
  - `auth.py` — sign-in by username or email, sign-out, self-service password
    change, and administrator-only account management, plus the
    `roles_required()` decorator
  - `forms.py` — lightweight form validation (the project does not use
    WTForms)
  - `directory.py` — parish and clergy directory, appointments
  - `records.py` — register transcription, search, margin notes, mass
    intentions, staff analytics
  - `certificates.py` — the requested → verified → approved → issued workflow
    and the printable certified true copy
  - the full data model: vicariates, parishes, clergy with parish
    assignments, persons, sacramental records with a unique
    (book, page, entry) citation, append-only annotations, the certificate
    request workflow, mass intentions, and a record access log
  - `flask init-db [--seed]` CLI: creates the schema and the initial admin
  - `flask seed-demo` CLI: fills an **empty** database with representative
    development data (refuses to run alongside real records)
- `config.py`, `requirements.txt`, `.env.example` — configuration and dependencies
- `run.py` — development entry point
- `tests/` — smoke tests, auth tests, and `test_features.py` covering the
  directory, register search, the certificate workflow, and analytics
- the landing page (`index.html`, `style.css`, `script.js`) is served by
  Flask at `/`. Its two login forms POST to the real `/login`, and its
  Analytics figures are now computed from the database rather than
  hardcoded

### Routes

| Route | Who | Purpose |
|---|---|---|
| `/` | public | landing page (analytics computed) |
| `/login`, `/logout` | public / any | sign in, sign out (POST only) |
| `/dashboard`, `/account/password` | any signed-in | role summary, password change |
| `/directory/parishes`, `/directory/parishes/<id>` | any signed-in (scoped) | parish directory |
| `/directory/parishes/new`, `/edit`, `/<id>/assign` | chancery, admin | maintain directory, appointments |
| `/directory/clergy`, `/directory/clergy/<id>` | any signed-in (scoped) | clergy directory |
| `/records` | any signed-in (scoped) | search the registers |
| `/records/new` | staff, clergy, chancery, admin | transcribe a register entry |
| `/records/<id>` | any signed-in (scoped) | entry + margin notes (writes an access log) |
| `/records/<id>/annotate` | holding parish, chancery, admin | append a margin note |
| `/records/analytics` | staff, clergy, chancery, admin | database-driven figures |
| `/intentions` | any signed-in | Mass intentions |
| `/certificates`, `/certificates/new`, `/certificates/<id>` | any signed-in | the certified-copy workflow |
| `/certificates/<id>/certificate` | staff, chancery, admin | printable certified true copy |
| `/admin/users`, `/admin/users/new`, `/admin/users/<id>/edit` | admin | account administration |

### Running it

```text
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt
copy .env.example .env            # then set a real SECRET_KEY
flask --app rcal init-db --seed
flask --app rcal seed-demo            # optional: representative dev data
flask --app rcal run              # or: python run.py
```

Run the tests with `python -m unittest discover -s tests -v`.

## Roadmap

- [x] Set up version control, repository structure, and project documentation
- [x] Define the data model (parishes, clergy, persons, sacramental records, annotations, requests, users)
- [x] Scaffold the application and database
- [x] Implement authentication with hashed passwords and role-based access
- [x] Implement the parish directory (vicariates, parishes, clergy assignments)
- [x] Implement sacramental record entry and search
- [x] Implement the certificate request → verify → issue workflow
- [x] Replace hardcoded analytics with database-driven counts
- [ ] Seed the real parish and clergy data

### Domain rules enforced in code

- **Records are immutable.** There is no edit or delete route for a
  sacramental record; the only way it is ever amended is by appending a
  margin note. `records/annotate` refuses to touch a register the signed-in
  account does not hold.
- **Transcription belongs to the holding parish.** `services.can_write_parish`
  limits register entry to the parish a user is based at (the chancery may
  enter anywhere). Read access is province-wide within an account's scope,
  which is what lets a parish verify a baptism recorded elsewhere.
- **Every read of a record is logged.** Opening a register entry writes an
  `AccessLog` row, because under RA 10173 the read is the accountable act.
- **A certificate cannot skip a step.** `RequestStatus.TRANSITIONS` defines
  the lifecycle, so a request can never go straight from pending to issued,
  and an issued request can never be reopened. Verification and approval are
  stamped separately: the parish verifies, the chancery authorises.
- **A certificate carries its margin notes**, so a copy cannot misrepresent
  a record by omitting them.

### Deliberate security choices

- Passwords are stored only as salted hashes; plain text is never written.
- Sign-in gives one message for both an unknown account and a wrong password,
  so it cannot be used to discover which usernames exist.
- `?next=` is validated against the current host before redirecting, closing
  the open-redirect hole that a login form otherwise offers.
- Sign-out is POST-only, so a third-party page cannot end a session with a
  plain `<img src="/logout">`.
- Every state-changing form carries a CSRF token. `_csrf.html` exists because
  Flask-WTF's `csrf_token()` returns only the value, not a form field.
- Role checks live on the `Role` enum and are applied with `roles_required()`,
  so a view never re-states the permission table.

## Repository layout

```
.
├── index.html          # landing page (served by Flask at /)
├── style.css           # styles
├── script.js           # front-end behaviour
├── logo.png            # archdiocesan seal
├── church.png          # hero image
├── config.py           # application configuration (environment-driven)
├── requirements.txt    # Python dependencies
├── .env.example        # environment template (.env is git-ignored)
├── run.py              # development entry point
├── rcal/               # application package
│   ├── __init__.py     # create_app() factory
│   ├── extensions.py   # db, login_manager, csrf singletons
│   ├── services.py     # parish scoping, record search, aggregate counts
│   ├── forms.py        # lightweight form validation
│   ├── auth.py         # sign-in, sign-out, account administration
│   ├── directory.py    # parish and clergy directory
│   ├── records.py      # register entry, search, annotations, intentions
│   ├── certificates.py # certified-copy workflow
│   ├── pages.py        # public routes
│   ├── cli.py          # flask init-db [--seed]
│   ├── seed.py         # flask seed-demo (development data)
│   ├── static/
│   │   ├── style.css        # landing page styling
│   │   ├── portal.css       # signed-in portal styling
│   │   ├── portal_nav.css   # portal navigation strip
│   │   └── certificate.css  # print styling for the certified copy
│   ├── templates/
│   │   ├── index.html       # landing page
│   │   ├── portal_base.html # shared portal layout
│   │   ├── _csrf.html       # CSRF hidden field
│   │   ├── _flashes.html
│   │   ├── _fields.html     # shared form/listing macros
│   │   ├── auth/            # login, dashboard, change password
│   │   ├── admin/           # account list and form
│   │   ├── directory/       # parishes, clergy, appointments
│   │   ├── records/         # search, entry, detail, annotate, analytics
│   │   ├── certificates/    # queue, request, workflow, printable copy
│   │   └── errors/          # 403
│   └── models/
│       ├── __init__.py # re-exports everything
│       ├── enums.py    # domain vocabulary (roles, sacraments, statuses, workflow)
│       ├── base.py     # mixins: timestamps, name parts, enum columns
│       ├── user.py     # accounts and roles
│       ├── parish.py   # vicariates and parishes
│       ├── clergy.py   # clergy and parish assignments
│       ├── person.py   # persons named in the registers
│       ├── record.py   # sacramental records + append-only annotations
│       ├── request.py  # certificate request workflow
│       ├── mass.py     # mass intentions
│       └── audit.py    # record access log
├── tests/              # smoke, auth, and feature tests
└── README.md
```
