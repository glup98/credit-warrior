import json
from pathlib import Path

from app.main import app


def dump_openapi() -> None:
    schema = app.openapi()
    target_path = Path(__file__).resolve().parent.parent / "openapi.json"
    target_path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
    print(f"OpenAPI schema successfully dumped to {target_path}")


if __name__ == "__main__":
    dump_openapi()
