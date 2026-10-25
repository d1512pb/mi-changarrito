class DomainError(Exception):
    """Error de negocio con código HTTP. Un handler global lo convierte en respuesta,
    así un 404 nunca se disfraza de 500 dentro de un try/except genérico."""
    status_code = 400

    def __init__(self, detail: str, extra: dict | None = None):
        self.detail = detail
        self.extra = extra or {}


class NotFound(DomainError):
    status_code = 404


class Forbidden(DomainError):
    status_code = 403


class Unauthorized(DomainError):
    status_code = 401


class Conflict(DomainError):
    status_code = 409


class Invalid(DomainError):
    status_code = 422
