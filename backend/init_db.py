from app.db import Base, engine
from app.models import Credential, VaultMeta  # noqa: F401


def main() -> None:
    Base.metadata.create_all(bind=engine)
    print("Tabelas criadas com sucesso")


if __name__ == "__main__":
    main()