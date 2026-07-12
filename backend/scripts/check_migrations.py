#!/usr/bin/env python3
import sys
import subprocess

def main():
    print("Checking if Alembic migrations are up-to-date with models...")
    try:
        # Running 'alembic check' returns exit code 1 if migrations are missing
        result = subprocess.run(
            ["alembic", "check"],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print("ERROR: Migrations are out of sync with models. Did you forget to generate a migration?")
            print(result.stdout)
            print(result.stderr)
            sys.exit(1)
        else:
            print("Migrations are up to date.")
            print(result.stdout)
            sys.exit(0)
    except FileNotFoundError:
        print("ERROR: Alembic is not installed or not in PATH.")
        sys.exit(1)

if __name__ == "__main__":
    main()
