"""Development seed data.

Fills a fresh database with a realistic slice of the archdiocese so the
directory, register search, and certificate workflow can be exercised
without transcribing real registers by hand.

Usage::

    flask --app rcal seed-demo

This is **development data**. It must never be run against a real
deployment: the parish and clergy names below are illustrative stand-ins,
and real sacramental registers contain real people. The command refuses to
touch a database that already holds parishes, so it cannot quietly
contaminate real records.

The full parish and clergy list is a separate roadmap item; this seeds a
representative sample, not the archdiocese.
"""

from datetime import date, timedelta

import click
from sqlalchemy import select

from .extensions import db
from .models import (
    Clergy,
    ClergyAssignment,
    Parish,
    Person,
    Role,
    SacramentalRecord,
    User,
    Vicariate,
)
from .models.enums import (
    AnnotationType,
    AssignmentRole,
    ClergyTitle,
    LegitimacyStatus,
    RequestStatus,
    SacramentType,
    Sex,
)

#: (vicariate, [(parish, municipality, street)])
#: (vicariate, [(parish, municipality, street)])
DIRECTORY = [
    (
        "Central Vicariate",
        [
            ("St. Sebastian Cathedral", "Lipa City", "C.M. Recto Avenue"),
            ("Our Lady of the Assumption Parish", "Lipa City", "Brgy. Mataaso"),
            ("San Carlos Borromeo Parish", "Tanauan City", "Poblacion"),
        ],
    ),
    (
        "Our Lady of the Piat Vicariate",
        [
            ("Our Lady of Mt. Carmel Parish", "Batangas City", "Poblacion"),
            ("St. Jude Thaddeus Parish", "Talisay", "Brgy. Sampaguita"),
            ("Our Lady of Fatima Parish", "Mabini", "Poblacion"),
        ],
    ),
    (
        "St. John the Baptist Vicariate",
        [
            ("St. John the Baptist Parish", "Batangas City", "Brgy. Bolbok"),
            ("St. Augustine Parish", "Malvar", "Poblacion"),
            ("Our Lady of the Rosary Parish", "San Juan", "Poblacion"),
        ],
    ),
]


#: (first, last, title, ordination year)
CLERGY = [
    ("Marcelo", "Torrevillas", ClergyTitle.ARCHBISHOP, 1998),
    ("Ronaldo", "Aguinaldo", ClergyTitle.BISHOP, 2004),
    ("Jose", "Panganiban", ClergyTitle.MONSIGNOR, 1992),
    ("Pedro", "Perez", ClergyTitle.FATHER, 2005),
    ("Antonio", "Reyes", ClergyTitle.FATHER, 2011),
    ("Ramon", "Villanueva", ClergyTitle.FATHER, 2015),
    ("Miguel", "Santos", ClergyTitle.FATHER, 2009),
    ("Emilio", "Dela Cruz", ClergyTitle.FATHER, 2018),
]

#: (first, last, sex, parish index)
PEOPLE = [
    ("Juan", "Dela Cruz", Sex.MALE, 0),
    ("Maria", "Reyes", Sex.FEMALE, 0),
    ("Carlos", "Villanueva", Sex.MALE, 0),
    ("Ana", "Bautista", Sex.FEMALE, 1),
    ("Jose", "Ramos", Sex.MALE, 1),
    ("Rosa", "Marquez", Sex.FEMALE, 2),
    ("Pedro", "Lim", Sex.MALE, 3),
    ("Teresita", "Alonzo", Sex.FEMALE, 3),
    ("Ricardo", "Austria", Sex.MALE, 4),
    ("Luisa", "Cabrera", Sex.FEMALE, 5),
]


@click.command("seed-demo")
def seed_demo_command() -> None:
    """Fill an empty database with representative development data."""
    existing = db.session.scalar(select(Parish).limit(1))
    if existing is not None:
        click.ClickException(
            "This database already holds parishes; refusing to add demo data "
            "alongside real records."
        ).show()
        raise SystemExit(1)

    vicariates = {}
    parishes = []
    for vicariate_name, entries in DIRECTORY:
        vicariate = Vicariate(name=vicariate_name)
        db.session.add(vicariate)
        vicariates[vicariate_name] = vicariate
        for name, municipality, street in entries:
            parish = Parish(
                name=name,
                municipality=municipality,
                address=f"{street}, {municipality}",
                vicariate=vicariate,
            )
            db.session.add(parish)
            parishes.append(parish)
    db.session.flush()

    # Appoint clergy across the parishes, starting a few years back so the
    # directory shows current and past appointments alike.
    clergy = []
    today = date.today()
    for index, (first, last, title, ordained) in enumerate(CLERGY):
        person = Clergy(
            first_name=first,
            last_name=last,
            sex=Sex.MALE,
            title=title,
            ordination_date=date(ordained, 12, 10),
        )
        db.session.add(person)
        db.session.add(
            ClergyAssignment(
                clergy=person,
                parish=parishes[index % len(parishes)],
                role=(
                    AssignmentRole.PARISH_PRIEST
                    if index >= 3
                    else AssignmentRole.ASSISTANT_PRIEST
                ),
                assigned_from=date(ordained + 1, 1, 15),
            )
        )
        clergy.append(person)

    # Registers are ordinarily kept by whichever priest was assigned at the
    # time, so demo baptisms are credited to a priest rather than to the
    # archbishop or a bishop, who do not normally officiate at them.
    officiants = [c for c in clergy if c.title is ClergyTitle.FATHER]
    if not officiants:  # pragma: no cover - CLERGY always contains priests
        officiants = clergy

    # One cleric who has moved, so a past appointment is on file.
    db.session.add(
        ClergyAssignment(
            clergy=clergy[4],
            parish=parishes[7],
            role=AssignmentRole.ASSISTANT_PRIEST,
            assigned_from=date(2011, 6, 1),
            assigned_to=date(2016, 5, 31),
        )
    )
    db.session.flush()

    people = []
    for first, last, sex, parish_index in PEOPLE:
        person = Person(
            first_name=first,
            last_name=last,
            sex=sex,
            date_of_birth=date(1990, 1, 1),
        )
        db.session.add(person)
        people.append((person, parishes[parish_index]))

    db.session.flush()

    # Transcribe a couple of register entries per person so the search,
    # citation and annotation behaviour can be exercised.
    book, page, entry = 1, 1, 1
    baptisms = []
    for person, parish in people:
        db.session.add(
            SacramentalRecord(
                person=person,
                sacrament_type=SacramentType.BAPTISM,
                event_date=date(1995, 1, 15) + timedelta(days=book * 40),
                book_number=book,
                page_number=page,
                entry_number=entry,
                originating_parish=parish,
                performed_by_clergy=officiants[book % len(officiants)],
                legitimacy=LegitimacyStatus.LEGITIMATE,
                godparents="Jose and Ana Reyes",
            )
        )
        baptisms.append((person, parish, book, page, entry))
        book += 1
        entry += 1
        if entry > 6:
            page += 1
            entry = 1
        if page > 5:
            book += 1
            page = 1

    db.session.flush()

    # A marriage, annotated on the groom's baptismal entry â€” the exact
    # case the append-only annotation rule exists for.
    groom, parish, b, p, e = baptisms[2]
    bride, _ = people[1]
    marriage = SacramentalRecord(
        person=groom,
        spouse=bride,
        sacrament_type=SacramentType.MARRIAGE,
        event_date=date(2021, 6, 12),
        book_number=2,
        page_number=5,
        entry_number=1,
        originating_parish=parish,
        performed_by_clergy=officiants[0],
        witnesses="Tomas A. and Rosa B.",
    )
    db.session.add(marriage)
    db.session.flush()

    baptism_row = db.session.scalar(
        select(SacramentalRecord).where(
            SacramentalRecord.person_id == groom.id,
            SacramentalRecord.sacrament_type == SacramentType.BAPTISM,
        )
    )
    baptism_row.add_annotation(
        AnnotationType.MARRIAGE,
        f"Married 12 June 2021; see marriage register, Book 2, Page 5, Entry 1.",
        event_date=date(2021, 6, 12),
        reference_record=marriage,
    )

    # One account per parish, scoped to it, so parish-level scoping can be
    # seen from the browser. Passwords are fixed and obviously fake.
    for index, parish in enumerate(parishes[:3]):
        account = User(
            username=f"parish{index + 1}",
            display_name=f"{parish.name} Secretary",
            email=f"parish{index + 1}@example.ph",
            role=Role.PARISH_STAFF,
            home_parish=parish,
        )
        account.set_password("parishpw")
        db.session.add(account)

    db.session.commit()

    click.echo(
        f"Demo data added: {len(vicariates)} vicariates, {len(parishes)} parishes, "
        f"{len(clergy)} clergy, {len(people)} persons, "
        f"{len(people) + 1} register entries."
    )
    click.echo(
        "Accounts: parish1/parish2/parish3 with password 'parishpw' "
        "(plus the admin from init-db --seed)."
    )
