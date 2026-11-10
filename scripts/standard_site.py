#!/usr/bin/env python3
"""Publish this site to the AT Protocol using Standard.site lexicons.

The website is one site.standard.publication record. Every page in the
collections listed under standard_site.collections in _config.yml is a
site.standard.document record. Jekyll renders the records the site wants into
/standard-site.json and emits the verification markers that point at them:
/.well-known/site.standard.publication and a <link rel="site.standard.document">
tag on each document page.

Record keys are assigned ahead of time and committed (standard_site_rkey in
front matter, standard_site.publication in _config.yml), so each page knows its
record's AT-URI before the record exists. Publishing writes each record to
that key, which creates it the first time and updates it afterwards.

  assign [FILE ...]   give documents that lack one a record key
  check               validate a built site offline (CI runs this)
  plan                compare the deployed site with the PDS (read-only)
  publish             verify the deployed site, then write records to the PDS
"""

import argparse
import base64
import datetime as dt
import getpass
import hashlib
import html
from html.parser import HTMLParser
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = "/standard-site.json"
WELL_KNOWN_PATH = "/.well-known/site.standard.publication"
PUBLICATION = "site.standard.publication"
DOCUMENT = "site.standard.document"
RKEY_FIELD = "standard_site_rkey"
USER_AGENT = "standard-site-sync/1"
DID = re.compile(r"^did:(?:plc:[a-z2-7]{24}|web:[a-zA-Z0-9.%-]+)$")
MAX_BLOB_BYTES = 1_000_000
THEME_ROLES = ("background", "foreground", "accent", "accentForeground")


# --- Record keys -------------------------------------------------------------
#
# Both lexicons declare `"key": "tid"`, so record keys must be TIDs: 13
# characters of sortable base32 encoding a 64-bit integer whose top bit is 0,
# then 53 bits of microseconds since the epoch, then a 10-bit clock id.

TID_ALPHABET = "234567abcdefghijklmnopqrstuvwxyz"
TID = re.compile(r"^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$")


def encode_tid(micros, clock_id):
    if not (0 <= micros < 1 << 53 and 0 <= clock_id < 1 << 10):
        raise ValueError("TID timestamp or clock id out of range")
    value = micros << 10 | clock_id
    return "".join(TID_ALPHABET[value >> shift & 31] for shift in range(60, -1, -5))


def decode_tid(tid):
    """Return (microseconds since the epoch, clock id)."""
    if not TID.match(tid):
        raise ValueError(f"Not a TID: {tid!r}")
    value = 0
    for character in tid:
        value = value << 5 | TID_ALPHABET.index(character)
    return value >> 10, value & 1023


class TidClock:
    """Mint TIDs that strictly increase, as the spec requires for one writer."""

    def __init__(self, now_ns=time.time_ns, clock_id=None):
        self.now_ns = now_ns
        self.clock_id = secrets.randbelow(1024) if clock_id is None else clock_id
        self.last = 0

    def next(self):
        self.last = max(self.now_ns() // 1000, self.last + 1)
        return encode_tid(self.last, self.clock_id)


def blob_cid(data):
    """The CID a PDS reports for an uploaded blob: CIDv1, raw codec, sha2-256."""
    raw = bytes((0x01, 0x55, 0x12, 0x20)) + hashlib.sha256(data).digest()
    return "b" + base64.b32encode(raw).decode("ascii").lower().rstrip("=")


def at_uri(did, collection, rkey):
    return f"at://{did}/{collection}/{rkey}"


# --- Reading the built or deployed site -------------------------------------


class HttpError(Exception):
    def __init__(self, status, url, body):
        self.status, self.url, self.body = status, url, body
        try:
            payload = json.loads(body)
        except ValueError:
            payload = {}
        self.error = payload.get("error") if isinstance(payload, dict) else None
        message = payload.get("message") if isinstance(payload, dict) else None
        super().__init__(f"HTTP {status} from {url}: {self.error or ''} {message or ''}".strip())


def http(method, url, body=None, headers=None):
    request = urllib.request.Request(
        url, data=body, method=method, headers={"User-Agent": USER_AGENT, **(headers or {})}
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        raise HttpError(error.code, url, error.read()) from None


class Site:
    """Files of a built site directory or a deployed URL.

    Paths resolve the way GitHub Pages resolves them: the exact file, then the
    same path with .html, then index.html inside a directory.
    """

    def __init__(self, location):
        self.location = str(location).rstrip("/")
        self.is_url = self.location.startswith(("http://", "https://"))
        if not self.is_url and not Path(self.location).is_dir():
            raise ValueError(
                f"No built site at {self.location}. Build it first (see README.md), "
                "or pass --site."
            )

    def file_for(self, path):
        """The file a built site serves for a URL path, or None."""
        relative = urllib.parse.unquote(path).strip("/")
        candidates = (
            [relative, relative + ".html", relative + "/index.html"]
            if relative else ["index.html"]
        )
        for candidate in candidates:
            file = Path(self.location, candidate)
            if file.is_file():
                return file
        return None

    def read(self, path):
        """Return the file's bytes, or None if the site has no such path."""
        if self.is_url:
            try:
                return http("GET", self.location + path)
            except HttpError as error:
                if error.status == 404:
                    return None
                raise
        file = self.file_for(path)
        return file.read_bytes() if file else None

    def html_files(self):
        if self.is_url:
            return []
        return sorted(Path(self.location).rglob("*.html"))


class LinkCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag == "link":
            attributes = dict(attrs)
            for rel in (attributes.get("rel") or "").lower().split():
                self.links.append((rel, attributes.get("href")))

    handle_startendtag = handle_starttag


def link_hrefs(page, rel):
    collector = LinkCollector()
    collector.feed(page.decode("utf-8", errors="replace"))
    return [href for found, href in collector.links if found == rel]


# --- The records the site wants ----------------------------------------------


def is_empty(value):
    return value is None or (isinstance(value, (str, list, dict)) and len(value) == 0)


def drop_nulls(value):
    """Liquid writes nil as null; absent optional fields belong out of the record."""
    if isinstance(value, dict):
        cleaned = {k: drop_nulls(v) for k, v in value.items()}
        return {k: v for k, v in cleaned.items() if not is_empty(v)}
    if isinstance(value, list):
        return [v for v in (drop_nulls(item) for item in value) if not is_empty(v)]
    return value


def one_line(text):
    return " ".join(html.unescape(text).split())


def paragraphs(text):
    """Plain text with Jekyll's tag-stripped HTML collapsed into paragraphs."""
    blocks = re.split(r"\n\s*\n", html.unescape(text))
    return "\n\n".join(" ".join(block.split()) for block in blocks if block.split())


def to_utc(timestamp):
    moment = dt.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    if moment.tzinfo is None:
        raise ValueError(f"Timestamp has no time zone: {timestamp}")
    return moment.astimezone(dt.timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


def git(*args):
    return subprocess.run(
        ["git", *args], cwd=ROOT, text=True, capture_output=True, check=True
    ).stdout.strip()


def first_commit_date(source):
    """When the page was first committed, or None if it is not committed yet.

    Entries that only know a publication year have no date to publish, so the
    document's publishedAt is when the page itself first appeared on the site.
    """
    if git("rev-parse", "--is-shallow-repository") == "true":
        raise ValueError(
            "Dates of undated documents come from git history, but this clone is "
            "shallow. Run: git fetch --unshallow"
        )
    dates = git("log", "--diff-filter=A", "--follow", "--format=%aI", "--", source).split()
    return to_utc(dates[-1]) if dates else None


class Desired:
    """The publication and documents the site declares, ready to write."""

    def __init__(self, manifest, commit_date=first_commit_date):
        self.did = manifest["did"]
        publication = manifest["publication"]
        self.publication_rkey = publication["rkey"]
        self.publication_uri = at_uri(self.did, PUBLICATION, self.publication_rkey)
        self.publication = drop_nulls(publication["record"])
        self.icon_path = publication.get("icon") or None
        self.missing = manifest.get("missing", [])
        self.documents = {}
        self.sources = {}
        self.undated = []
        # Jekyll gives a collection document without a date the build time.
        build_time = manifest.get("buildTime")
        for entry in manifest["documents"]:
            rkey = entry["rkey"]
            record = drop_nulls(entry["record"])
            record["title"] = one_line(record.get("title", ""))
            for key, clean in (("description", one_line), ("textContent", paragraphs)):
                if key in record:
                    record[key] = clean(record[key])
                    if not record[key]:
                        del record[key]
            if entry.get("date") and entry["date"] != build_time:
                record["publishedAt"] = to_utc(entry["date"])
            else:
                published = commit_date(entry["source"])
                if published:
                    record["publishedAt"] = published
                else:
                    self.undated.append(entry["source"])
            if rkey in self.documents:
                raise ValueError(f"Record key {rkey} is used by more than one document.")
            self.documents[rkey] = record
            self.sources[rkey] = entry["source"]

    def document_uri(self, rkey):
        return at_uri(self.did, DOCUMENT, rkey)


def load_desired(site):
    raw = site.read(MANIFEST_PATH)
    if raw is None:
        raise ValueError(f"{site.location}{MANIFEST_PATH} not found.")
    return Desired(json.loads(raw))


# --- Validation against the lexicons ----------------------------------------
#
# AT Protocol string limits count UTF-8 bytes (maxLength) and graphemes
# (maxGraphemes). The standard library cannot segment graphemes, so this counts
# code points instead. A string never has more graphemes than code points, so
# the check never passes a string that is too long.


def check_string(problems, where, value, max_bytes, max_graphemes, required=False):
    if value is None:
        if required:
            problems.append(f"{where} is required.")
        return
    if not isinstance(value, str) or (required and not value.strip()):
        problems.append(f"{where} must be a non-empty string.")
    elif len(value.encode("utf-8")) > max_bytes or len(value) > max_graphemes:
        problems.append(f"{where} is longer than {max_graphemes} characters.")


def check_datetime(problems, where, value):
    try:
        to_utc(value)
    except (TypeError, ValueError):
        problems.append(f"{where} must be an RFC 3339 timestamp with a time zone.")


def luminance(color):
    def channel(value):
        value /= 255
        return value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4

    return 0.2126 * channel(color["r"]) + 0.7152 * channel(color["g"]) + 0.0722 * channel(color["b"])


def contrast(first, second):
    lighter, darker = sorted((luminance(first), luminance(second)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def validate(desired):
    problems = []
    if not DID.match(desired.did):
        problems.append(f"standard_site.did is not a did:plc or did:web: {desired.did!r}")
    if not TID.match(desired.publication_rkey):
        problems.append(f"standard_site.publication is not a TID: {desired.publication_rkey!r}")

    publication = desired.publication
    if publication.get("$type") != PUBLICATION:
        problems.append(f"The publication record must have $type {PUBLICATION}.")
    url = publication.get("url", "")
    host = urllib.parse.urlsplit(url).hostname or ""
    if not url.startswith("https://") or url.endswith("/") or host in ("localhost", "127.0.0.1"):
        problems.append(
            f"Publication url must be the production https:// URL without a trailing "
            f"slash, not {url!r}. Build with the production configuration (_config.yml only)."
        )
    check_string(problems, "Publication name", publication.get("name"), 5000, 500, required=True)
    check_string(problems, "Publication description", publication.get("description"), 30000, 3000)
    theme = publication.get("basicTheme")
    if theme is not None:
        colors = {role: theme.get(role) for role in THEME_ROLES}
        for role, color in colors.items():
            valid = isinstance(color, dict) and all(
                isinstance(color.get(c), int) and 0 <= color[c] <= 255 for c in "rgb"
            )
            if not valid:
                problems.append(f"basicTheme.{role} needs integer r, g and b from 0 to 255.")
                break
        else:
            for text, surface in (("foreground", "background"), ("accentForeground", "accent")):
                ratio = contrast(colors[text], colors[surface])
                if ratio < 4.5:
                    problems.append(
                        f"basicTheme.{text} on {surface} has contrast {ratio:.2f}:1; "
                        "WCAG AA needs 4.5:1."
                    )
    discover = publication.get("preferences", {}).get("showInDiscover")
    if discover is not None and not isinstance(discover, bool):
        problems.append("standard_site.show_in_discover must be true or false.")

    for rkey, record in desired.documents.items():
        where = desired.sources[rkey]
        if not TID.match(rkey):
            problems.append(f"{where}: {RKEY_FIELD} is not a TID: {rkey!r}")
        if record.get("$type") != DOCUMENT or record.get("site") != desired.publication_uri:
            problems.append(f"{where}: record must be a {DOCUMENT} in this publication.")
        if not str(record.get("path", "")).startswith("/"):
            problems.append(f"{where}: path must start with a slash.")
        check_string(problems, f"{where}: title", record.get("title"), 5000, 500, required=True)
        check_string(problems, f"{where}: description", record.get("description"), 30000, 3000)
        if "publishedAt" in record:
            check_datetime(problems, f"{where}: publishedAt", record["publishedAt"])
        for tag in record.get("tags", []):
            check_string(problems, f"{where}: tag", tag, 1280, 128, required=True)
        if "textContent" in record and not isinstance(record["textContent"], str):
            problems.append(f"{where}: textContent must be a string.")

    for source in desired.missing:
        problems.append(
            f"{source} has no {RKEY_FIELD}. Run: python3 scripts/standard_site.py assign {source}"
        )
    return problems


def verify(site, desired):
    """Check the markers that let readers verify the records against the site."""
    problems = []
    published = site.read(WELL_KNOWN_PATH)
    if published is None:
        problems.append(f"{WELL_KNOWN_PATH} is missing.")
    elif published.decode("utf-8", errors="replace").strip() != desired.publication_uri:
        problems.append(
            f"{WELL_KNOWN_PATH} contains {published.decode('utf-8', 'replace').strip()!r}, "
            f"expected {desired.publication_uri!r}."
        )

    claimed = {}
    for rkey, record in desired.documents.items():
        path, uri = record["path"], desired.document_uri(rkey)
        claimed[uri] = path
        page = site.read(path)
        if page is None:
            problems.append(f"{path}: page not found.")
            continue
        found = link_hrefs(page, DOCUMENT)
        if found != [uri]:
            problems.append(f"{path}: expected one {DOCUMENT} link to {uri}, found {found}.")
        hint = link_hrefs(page, PUBLICATION)
        if hint != [desired.publication_uri]:
            problems.append(f"{path}: expected one {PUBLICATION} link to the publication, found {hint}.")

    # A document link on a page that is not in the manifest would claim a record
    # that is never published (or belongs to another page).
    if not site.is_url:
        root = Path(site.location)
        for file in site.html_files():
            for href in link_hrefs(file.read_bytes(), DOCUMENT):
                path = "/" + file.relative_to(root).as_posix()
                expected = claimed.get(href)
                if expected is None:
                    problems.append(f"{path} links to {href}, which is not a document in the manifest.")
                elif site.file_for(expected) != file:
                    problems.append(f"{path} links to {href}, which belongs to {expected}.")

    if desired.icon_path:
        icon = site.read(desired.icon_path)
        if icon is None:
            problems.append(f"Publication icon {desired.icon_path} is missing.")
        elif len(icon) > MAX_BLOB_BYTES:
            problems.append(f"Publication icon {desired.icon_path} is over 1 MB.")
    return problems


# --- The PDS ----------------------------------------------------------------


def get_json(url):
    return json.loads(http("GET", url, headers={"Accept": "application/json"}))


def resolve_pds(did):
    if did.startswith("did:plc:"):
        document = get_json(f"https://plc.directory/{did}")
    elif did.startswith("did:web:"):
        host = urllib.parse.unquote(did[len("did:web:"):])
        document = get_json(f"https://{host}/.well-known/did.json")
    else:
        raise ValueError(f"Unsupported DID method: {did}")
    for service in document.get("service", []):
        if service.get("id") in ("#atproto_pds", f"{did}#atproto_pds"):
            return service["serviceEndpoint"].rstrip("/")
    raise ValueError(f"{did} does not list a PDS in its DID document.")


class Pds:
    def __init__(self, endpoint, token=None):
        self.endpoint, self.token = endpoint, token

    def call(self, method, nsid, params=None, body=None, content_type="application/json"):
        url = f"{self.endpoint}/xrpc/{nsid}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        headers = {"Accept": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if body is not None:
            headers["Content-Type"] = content_type
            if content_type == "application/json":
                body = json.dumps(body).encode("utf-8")
        response = http(method, url, body, headers)
        return json.loads(response) if response else {}

    def get_record(self, did, collection, rkey):
        try:
            return self.call("GET", "com.atproto.repo.getRecord",
                             {"repo": did, "collection": collection, "rkey": rkey})
        except HttpError as error:
            if error.error == "RecordNotFound" or error.status == 404:
                return None
            raise

    def list_records(self, did, collection):
        records, cursor = [], None
        while True:
            params = {"repo": did, "collection": collection, "limit": 100}
            if cursor:
                params["cursor"] = cursor
            page = self.call("GET", "com.atproto.repo.listRecords", params)
            records += page.get("records", [])
            cursor = page.get("cursor")
            if not cursor or not page.get("records"):
                return records

    def put_record(self, did, collection, rkey, record, swap=None):
        body = {"repo": did, "collection": collection, "rkey": rkey, "record": record}
        if swap:
            body["swapRecord"] = swap
        return self.call("POST", "com.atproto.repo.putRecord", body=body)

    def delete_record(self, did, collection, rkey, swap=None):
        body = {"repo": did, "collection": collection, "rkey": rkey}
        if swap:
            body["swapRecord"] = swap
        return self.call("POST", "com.atproto.repo.deleteRecord", body=body)

    def upload_blob(self, data, mime_type):
        return self.call("POST", "com.atproto.repo.uploadBlob", body=data,
                         content_type=mime_type)["blob"]


def login(endpoint, did):
    identifier = os.environ.get("ATPROTO_IDENTIFIER", did)
    password = os.environ.get("ATPROTO_APP_PASSWORD")
    if not password:
        if not sys.stdin.isatty():
            raise ValueError("Set ATPROTO_APP_PASSWORD to an app password for this account.")
        password = getpass.getpass(f"App password for {identifier}: ")
    session = Pds(endpoint).call("POST", "com.atproto.server.createSession",
                                 body={"identifier": identifier, "password": password})
    if session.get("did") != did:
        raise ValueError(f"Logged in as {session.get('did')}, but the site belongs to {did}.")
    return Pds(endpoint, session["accessJwt"])


# --- Planning and applying changes ------------------------------------------


class Change:
    def __init__(self, action, collection, rkey, record=None, swap=None, label="", fields=()):
        self.action, self.collection, self.rkey = action, collection, rkey
        self.record, self.swap, self.label, self.fields = record, swap, label, fields


def changed_fields(desired, existing):
    keys = (set(desired) | set(existing)) - {"updatedAt"}
    return sorted(k for k in keys if desired.get(k) != existing.get(k))


def icon_blob(site, desired):
    if not desired.icon_path:
        return None, None
    data = site.read(desired.icon_path)
    if data is None:
        raise ValueError(f"Publication icon {desired.icon_path} is missing.")
    mime_type = mimetypes.guess_type(desired.icon_path)[0] or "application/octet-stream"
    ref = {"$type": "blob", "ref": {"$link": blob_cid(data)}, "mimeType": mime_type,
           "size": len(data)}
    return ref, data


def plan_changes(desired, icon, existing_publication, existing_documents, now):
    """Diff the site's records against the PDS.

    existing_publication is a getRecord result or None; existing_documents maps
    record keys to listRecords entries for documents in this publication.
    """
    changes = []
    publication = dict(desired.publication)
    if icon:
        publication["icon"] = icon
    if existing_publication is None:
        changes.append(Change("create", PUBLICATION, desired.publication_rkey, publication,
                              label=publication["name"]))
    else:
        fields = changed_fields(publication, existing_publication["value"])
        if fields:
            changes.append(Change("update", PUBLICATION, desired.publication_rkey, publication,
                                  existing_publication["cid"], publication["name"], fields))

    for rkey, record in desired.documents.items():
        current = existing_documents.get(rkey)
        if current is None:
            changes.append(Change("create", DOCUMENT, rkey, record, label=record["path"]))
            continue
        fields = changed_fields(record, current["value"])
        if fields:
            changes.append(Change("update", DOCUMENT, rkey, {**record, "updatedAt": now},
                                  current["cid"], record["path"], fields))

    for rkey, current in existing_documents.items():
        if rkey not in desired.documents:
            changes.append(Change("delete", DOCUMENT, rkey, swap=current["cid"],
                                  label=current["value"].get("path", "")))
    return changes


def fetch_existing(pds, desired):
    publication = pds.get_record(desired.did, PUBLICATION, desired.publication_rkey)
    documents = {}
    for entry in pds.list_records(desired.did, DOCUMENT):
        rkey = entry["uri"].rsplit("/", 1)[-1]
        if rkey in desired.documents or entry["value"].get("site") == desired.publication_uri:
            documents[rkey] = entry
    return publication, documents


def print_plan(changes, desired, prune):
    if not changes:
        print(f"Up to date: {desired.publication_uri} and {len(desired.documents)} documents.")
        return
    for change in changes:
        action = change.action
        if action == "delete" and not prune:
            action = "extra"
        detail = f" ({', '.join(change.fields)})" if change.fields else ""
        print(f"  {action:<7} {change.collection.rsplit('.', 1)[-1]:<12} {change.label}{detail}")
    if not prune and any(c.action == "delete" for c in changes):
        print("Records marked extra belong to this publication but not to the site; "
              "--prune deletes them.")


def apply_changes(pds, desired, changes, icon_data, prune):
    for change in changes:
        if change.action == "delete":
            if prune:
                pds.delete_record(desired.did, change.collection, change.rkey, change.swap)
                print(f"Deleted {at_uri(desired.did, change.collection, change.rkey)}")
            continue
        record = change.record
        if change.collection == PUBLICATION and "icon" in record and icon_data is not None:
            # Upload only when the icon changed; an unchanged ref stays valid.
            if "icon" in change.fields or change.action == "create":
                record = {**record, "icon": pds.upload_blob(icon_data, record["icon"]["mimeType"])}
        pds.put_record(desired.did, change.collection, change.rkey, record, change.swap)
        print(f"{change.action.capitalize()}d {at_uri(desired.did, change.collection, change.rkey)}")


# --- Commands ---------------------------------------------------------------


def production_url():
    config = (ROOT / "_config.yml").read_text()
    match = re.search(r"^url\s*:\s*['\"]?([^'\"\s#]+)", config, re.MULTILINE)
    if not match:
        raise ValueError("_config.yml has no url.")
    return match.group(1).rstrip("/")


FRONT_MATTER = re.compile(r"\A---[ \t]*\r?\n(.*?)^---[ \t]*\r?$", re.DOTALL | re.MULTILINE)


def add_rkey(text, rkey):
    """Return text with rkey added to its front matter, or None if it has one."""
    match = FRONT_MATTER.match(text)
    if not match:
        raise ValueError("no YAML front matter")
    if re.search(rf"^{RKEY_FIELD}\s*:", match.group(1), re.MULTILINE):
        return None
    return text[:match.end(1)] + f"{RKEY_FIELD}: {rkey}\n" + text[match.end(1):]


def command_assign(args):
    files = [(name, Path(name)) for name in args.files]
    if not files:
        manifest = Site(args.site).read(MANIFEST_PATH)
        if manifest is None:
            raise ValueError(f"No {MANIFEST_PATH} in {args.site}. Build the site or name the files.")
        files = [(source, ROOT / source) for source in json.loads(manifest).get("missing", [])]
        if not files:
            print("Every document already has a record key.")
            return
    clock = TidClock()
    for name, file in files:
        try:
            updated = add_rkey(file.read_text(), clock.next())
        except ValueError as error:
            raise ValueError(f"{name}: {error}") from None
        if updated is None:
            print(f"{name}: already has a record key")
        else:
            file.write_text(updated)
            print(f"{name}: assigned a record key")


def command_check(args):
    site = Site(args.site)
    desired = load_desired(site)
    problems = validate(desired) + verify(site, desired)
    if problems:
        raise ValueError("Standard.site check failed:\n  " + "\n  ".join(problems))
    for source in desired.undated:
        print(f"Note: {source} is not committed yet; its publishedAt will be its first commit date.")
    print(f"OK: {desired.publication_uri} and {len(desired.documents)} documents "
          f"are valid and verifiable in {site.location}.")


def prepare(site):
    desired = load_desired(site)
    problems = validate(desired)
    if site.is_url:
        problems += verify(site, desired)
    if desired.undated:
        problems.append("Commit these documents first: " + ", ".join(desired.undated))
    if problems:
        raise ValueError("The site is not ready to publish:\n  " + "\n  ".join(problems))
    endpoint = resolve_pds(desired.did)
    icon, icon_data = icon_blob(site, desired)
    existing_publication, existing_documents = fetch_existing(Pds(endpoint), desired)
    now = to_utc(dt.datetime.now(dt.timezone.utc).isoformat())
    changes = plan_changes(desired, icon, existing_publication, existing_documents, now)
    return desired, endpoint, changes, icon_data


def command_plan(args):
    desired, endpoint, changes, _ = prepare(Site(args.site or production_url()))
    print(f"Publication {desired.publication_uri} on {endpoint}")
    print_plan(changes, desired, args.prune)


def command_publish(args):
    site = Site(args.site or production_url())
    if not site.is_url:
        raise ValueError("publish reads the deployed site so records match what readers see; "
                         "--site must be a URL.")
    desired, endpoint, changes, icon_data = prepare(site)
    print(f"Publication {desired.publication_uri} on {endpoint}")
    print_plan(changes, desired, args.prune)
    writes = [c for c in changes if c.action != "delete" or args.prune]
    if not writes:
        return
    if not args.yes:
        if not sys.stdin.isatty():
            raise ValueError("Pass --yes to publish without a prompt.")
        if input(f"Write {len(writes)} change(s)? [y/N] ").strip().lower() != "y":
            print("Nothing written.")
            return
    apply_changes(login(endpoint, desired.did), desired, writes, icon_data, args.prune)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    commands = parser.add_subparsers(dest="command", required=True)

    assign = commands.add_parser("assign", help="add record keys to documents")
    assign.add_argument("files", nargs="*", help="markdown files; default: those the build lists as missing")
    assign.add_argument("--site", default=str(ROOT / "_site"), help="built site (default: _site)")
    assign.set_defaults(run=command_assign)

    check = commands.add_parser("check", help="validate a built site offline")
    check.add_argument("--site", default=str(ROOT / "_site"), help="built site (default: _site)")
    check.set_defaults(run=command_check)

    for name, run, text in (
        ("plan", command_plan, "show what publish would change"),
        ("publish", command_publish, "write the records to the PDS"),
    ):
        command = commands.add_parser(name, help=text)
        command.add_argument("--site", help="site URL or built directory (default: url in _config.yml)")
        command.add_argument("--prune", action="store_true",
                             help="delete records in this publication that the site no longer has")
        if name == "publish":
            command.add_argument("--yes", action="store_true", help="do not ask for confirmation")
        command.set_defaults(run=run)

    args = parser.parse_args(argv)
    args.run(args)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        print(error.stderr.strip() or str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, HttpError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
