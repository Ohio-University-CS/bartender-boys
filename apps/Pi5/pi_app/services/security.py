from __future__ import annotations

from fastapi import HTTPException, Request, status

TOKEN_HEADER = "x-firmware-token"


def enforce_token(request: Request, expected_token: str | None) -> None:
    """Validate the shared secret if configured."""
    if not expected_token:
        return

    provided = request.headers.get(TOKEN_HEADER)
    if not provided:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            provided = auth_header.split(" ", 1)[1]

    if provided != expected_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

