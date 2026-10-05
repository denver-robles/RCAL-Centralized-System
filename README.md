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

**Front-end prototype only.** The repository currently contains a static landing page:

- `index.html` — landing page and a separate login view
- `style.css` — all styling, no framework
- `script.js` — view switching and non-functional login handlers

There is no database, no API, and no real authentication. The figures shown on the Analytics section (64 churches, 216 priests, 34 cities/municipalities) are hardcoded in the HTML, not computed. The login forms accept any non-empty username and never validate the password.

## Roadmap

- [ ] Set up version control, repository structure, and project documentation
- [ ] Define the data model (parishes, clergy, persons, sacramental records, annotations, requests, users)
- [ ] Scaffold the application and database
- [ ] Implement authentication with hashed passwords and role-based access
- [ ] Implement the parish directory (vicariates, parishes, clergy assignments)
- [ ] Implement sacramental record entry and search
- [ ] Implement the certificate request → verify → issue workflow
- [ ] Replace hardcoded analytics with database-driven counts
- [ ] Seed the real parish and clergy data

## Repository layout

```
.
├── index.html      # landing page
├── style.css       # styles
├── script.js       # front-end behaviour
├── logo.png        # archdiocesan seal
├── church.png      # hero image
└── README.md
```

The layout will be reorganised as the server-side application is added.
