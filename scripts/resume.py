#!/usr/bin/env python3
"""Build or verify the committed resume using the pinned Typst compiler."""

import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "main.typ"
PDF = ROOT / "files" / "resume.pdf"
PHONE = re.compile(r"(?<!\w)(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}(?!\w)")


def run(command, **kwargs):
    result = subprocess.run(
        command, cwd=ROOT, text=True, capture_output=True, check=True, **kwargs
    )
    return result


def validate_pdf(path):
    if not path.is_file() or not path.read_bytes().startswith(b"%PDF-"):
        raise ValueError(f"Missing or invalid PDF: {path}")
    info = run(["pdfinfo", str(path)], env={**os.environ, "LC_ALL": "C"}).stdout
    if not re.search(r"^Pages:\s+1\s*$", info, re.MULTILINE):
        raise ValueError(f"Resume must have exactly one page: {path}\n{info}")
    text = run(["pdftotext", "-enc", "UTF-8", str(path), "-"]).stdout
    if not text.strip():
        raise ValueError(f"PDF has no extractable text: {path}")
    if PHONE.search(text):
        raise ValueError(f"Phone number detected in {path}; remove it before publishing.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("build", "check"))
    args = parser.parse_args()

    typst = os.environ.get("TYPST", "typst")
    expected = (ROOT / ".typst-version").read_text().strip()
    actual = run([typst, "--version"]).stdout.strip()
    if not re.match(rf"^typst {re.escape(expected)}(?:\s|$)", actual):
        raise ValueError(f"Expected Typst {expected}, found {actual}. See README.md.")
    for tool in ("pdfinfo", "pdftotext"):
        if shutil.which(tool) is None:
            raise ValueError(f"{tool} is required. Install Poppler (see README.md).")
    for source in (SOURCE, *sorted((ROOT / "resume").rglob("*.typ"))):
        if PHONE.search(source.read_text()):
            raise ValueError(
                f"Phone number detected in {source.relative_to(ROOT)}; "
                "remove it before committing."
            )

    with tempfile.TemporaryDirectory(prefix="resume-") as directory:
        temporary = Path(directory)
        compiled = temporary / "resume.pdf"
        # Use only fonts embedded in the pinned compiler.
        environment = os.environ.copy()
        environment.pop("TYPST_FONT_PATHS", None)
        result = run(
            [
                typst, "--color", "never", "compile",
                "--ignore-system-fonts",
                "--creation-timestamp", "0",
                "--diagnostic-format", "short",
                str(SOURCE), str(compiled),
            ],
            env=environment,
        )
        warnings = [
            line for line in result.stderr.splitlines()
            if re.search(r"(?:^|: )warning:", line)
        ]
        if warnings:
            raise ValueError("Typst emitted warnings:\n" + "\n".join(warnings))
        validate_pdf(compiled)
        if args.command == "build":
            PDF.parent.mkdir(exist_ok=True)
            shutil.copyfile(compiled, PDF)
            print("Built files/resume.pdf (one page).")
        else:
            validate_pdf(PDF)
            if PDF.read_bytes() != compiled.read_bytes():
                raise ValueError(
                    "files/resume.pdf is stale. Run: python3 scripts/resume.py build"
                )
            print("files/resume.pdf matches the pinned build byte for byte (one page).")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.stderr.strip() or str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
