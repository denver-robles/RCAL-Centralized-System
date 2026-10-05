"""Form definitions.

WTForms is not in the dependency list, so these are hand-written validators
over ``flask.request.form`` instead. They follow the same three-method
protocol (``validate``, ``validate_<field>``, and attribute access) so that
templates can treat a form object the way they would treat a WTForms form.
"""

import re

from flask import request

from .models.enums import Role

#: Usernames appear in URLs and audit rows, so they are kept plain ASCII.
VALID_USERNAME = re.compile(r"^[A-Za-z0-9._-]+$")


class Form:
    """Base class for the project's form objects.

    Subclasses declare their fields as class attributes of ``Field``
    instances and implement :meth:`validate_on_submit` for cross-field rules.
    """

    def __init__(self, formdata=None):
        self._data = {}
        self._errors = {}

        if formdata is None:
            formdata = getattr(request, "form", None)
        for name, field in self._fields().items():
            raw = formdata.get(name) if formdata is not None else None
            self._data[name] = raw.strip() if isinstance(raw, str) else raw
            field.name = name

    @classmethod
    def _fields(cls):
        return {
            name: value
            for name, value in vars(cls).items()
            if isinstance(value, Field)
        }

    def __getattr__(self, name):
        # Only reached for names that are neither real instance attributes nor
        # declared fields, so a stray form.choices still resolves normally.
        fields = type(self)._fields()
        if name in fields:
            return fields[name]
        try:
            return self.__dict__["_data"][name]
        except KeyError as exc:
            raise AttributeError(name) from exc

    def __contains__(self, name):
        return name in self._data

    @property
    def errors(self) -> dict[str, str]:
        return dict(self._errors)

    def _error(self, name: str, message: str) -> None:
        self._errors.setdefault(name, message)

    def validate(self) -> bool:
        """Run every field validator, then the cross-field rules."""
        for name, field in self._fields().items():
            message = field.validate(self._data.get(name))
            if message:
                self._error(name, message)
        self.validate_on_submit()
        return not self._errors

    def validate_on_submit(self) -> None:
        """Cross-field rules; subclasses override."""

    def error_messages(self) -> list[str]:
        """All messages, for a single summary block."""
        return list(self._errors.values())


class Field:
    """A single form value with an optional set of rules.

    Instances live on the *class* as declarations, so they act as
    descriptors: reading ``form.username`` returns the submitted value
    (see :meth:`__get__`) rather than the field object itself.
    """

    required = False
    label = ""
    max_length = None

    def __get__(self, instance, owner):
        # Class-level access (Form.username) returns the declaration, which
        # is what _fields() and the templates expect.
        if instance is None:
            return self
        return instance._data.get(self.name)

    def __set__(self, instance, value):
        instance._data[self.name] = value

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<{type(self).__name__} {self.name}>"

    def validate(self, value) -> str | None:
        """Return an error message, or ``None`` when the value is acceptable."""
        if self.required and not value:
            return f"{self.label} is required."
        if value and self.max_length and len(value) > self.max_length:
            return f"{self.label} must be at most {self.max_length} characters."
        return None


class StringField(Field):
    def __init__(self, label: str, required: bool = True, max_length: int | None = None):
        self.label = label
        self.required = required
        self.max_length = max_length


class PasswordField(StringField):
    def validate(self, value) -> str | None:
        message = super().validate(value)
        if message:
            return message
        if not value:
            return None
        if len(value) < 8:
            return "Password must be at least 8 characters."
        return None


class TextAreaField(StringField):
    """A multi-line value. Same rules; only the markup differs."""

    def __init__(self, label: str, required: bool = True, max_length: int | None = None):
        super().__init__(label, required=required, max_length=max_length)


class BooleanField(Field):
    """A checkbox. Its "value" is present when checked."""

    required = False

    def __init__(self, label: str = "Remember me"):
        self.label = label

    def validate(self, value) -> str | None:
        return None


class SelectField(Field):
    """A dropdown backed by a fixed set of choices or by the domain enums.

    ``choices`` is a value -> label mapping. For a dropdown over database
    ids (a parish, say) pass ``choices=None`` and ``validate_choice=False``:
    the option list is supplied by the view at render time, and the chosen
    id is re-resolved against the database before use, so there is no
    fixed set to check membership against here.
    """

    def __init__(
        self,
        label: str,
        choices: dict | None = None,
        required: bool = True,
        validate_choice: bool = True,
    ):
        self.label = label
        self.required = required
        self.max_length = None
        #: Maps the submitted string back to the enum member.
        self.choices = choices or {}
        self.validate_choice = validate_choice

    def validate(self, value) -> str | None:
        message = super().validate(value)
        if message:
            return message
        if self.validate_choice and value is not None and value not in self.choices:
            return f"{self.label} is not a valid choice."
        return None


class LoginForm(Form):
    """Sign-in with either a username or an email address."""

    identifier = StringField("Username or email", max_length=255)
    password = StringField("Password")
    remember = BooleanField()

    def validate_on_submit(self) -> None:
        # Deliberately no "password too short" rule here: requiring a minimum
        # length on sign-in would tell an attacker which accounts are old.
        if not self.password and not self._errors.get("password"):
            self._error("password", "Password is required.")


class ChangePasswordForm(Form):
    """Forced rotation of one's own password."""

    current_password = StringField("Current password")
    new_password = PasswordField("New password")
    confirm_password = PasswordField("Confirm new password")

    def validate_on_submit(self) -> None:
        if self.new_password and self.new_password != self.confirm_password:
            self._error("confirm_password", "The two passwords do not match.")


class UserForm(Form):
    """Create or edit an account (administrators only)."""

    username = StringField("Username", max_length=80)
    email = StringField("Email", max_length=255, required=False)
    display_name = StringField("Display name", max_length=160, required=False)
    role = SelectField("Role", {r.value: r for r in Role})
    password = PasswordField("Password", required=False)

    def validate_on_submit(self) -> None:
        if self.username and not VALID_USERNAME.match(self.username):
            self._error(
                "username",
                "Username may only contain letters, digits, dots, dashes and underscores.",
            )
        if self.email and "@" not in self.email:
            self._error("email", "Enter a valid email address.")