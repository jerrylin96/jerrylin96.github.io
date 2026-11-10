"""Tests for scripts/standard_site.py. Run: python3 -m unittest discover scripts"""

import contextlib
import copy
import datetime as dt
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import standard_site as ss  # noqa: E402


DID = "did:plc:qszahaiylwp5kys2irw4fllu"
PUB = "3mzwnpagwzs57"
DOC = "3mzwnrqmtteuk"
PUB_URI = f"at://{DID}/site.standard.publication/{PUB}"
DOC_URI = f"at://{DID}/site.standard.document/{DOC}"
JPEG = b"\xff\xd8\xff\xe0 jpeg"


def color(r, g, b):
    return {"$type": "site.standard.theme.color#rgb", "r": r, "g": g, "b": b}


def manifest(**document_overrides):
    document = {
        "rkey": DOC,
        "source": "_publications/signoff.md",
        "date": "2026-05-13T00:00:00-07:00",
        "publicationYear": None,
        "record": {
            "$type": "site.standard.document",
            "site": PUB_URI,
            "path": "/publication/signoff",
            "title": "<p>Signoff:\n N &lt; 100 </p>\n",
            "description": "<p>Tom &amp; Jerry</p>",
            "textContent": "<p>First   line\nwraps.</p>\n<p>Second &lt;p&gt;</p>",
            "tags": [],
        },
    }
    for key, value in document_overrides.items():
        if key in document:
            document[key] = value
        else:
            document["record"][key] = value
    return {
        "did": DID,
        "buildTime": "2026-11-10T04:00:00-08:00",
        "publication": {
            "rkey": PUB,
            "icon": "/images/icon.jpg",
            "record": {
                "$type": "site.standard.publication",
                "url": "https://example.github.io",
                "name": "Example",
                "description": None,
                "basicTheme": {
                    "$type": "site.standard.theme.basic",
                    "background": color(255, 255, 255),
                    "foreground": color(28, 32, 36),
                    "accent": color(18, 94, 150),
                    "accentForeground": color(255, 255, 255),
                },
                "preferences": {"showInDiscover": True},
            },
        },
        "documents": [document],
        "missing": [],
    }


def desired(data=None, commit_date=lambda source: "2026-10-24T23:49:34.000Z"):
    return ss.Desired(data or manifest(), commit_date=commit_date)


class TidTests(unittest.TestCase):
    def test_encoding_boundaries(self):
        self.assertEqual(ss.encode_tid(0, 0), "2222222222222")
        self.assertEqual(ss.encode_tid((1 << 53) - 1, 1023), "bzzzzzzzzzzzz")
        with self.assertRaises(ValueError):
            ss.encode_tid(1 << 53, 0)
        with self.assertRaises(ValueError):
            ss.encode_tid(0, 1024)

    def test_decodes_a_key_minted_by_a_pds(self):
        # A real document record whose publishedAt is 2025-12-17T19:11:12.873Z.
        micros, clock_id = ss.decode_tid("3ma7eht63lc2d")
        moment = dt.datetime.fromtimestamp(micros / 1e6, dt.timezone.utc)
        self.assertEqual(moment.isoformat(timespec="milliseconds"), "2025-12-17T19:11:12.873+00:00")
        self.assertEqual(ss.encode_tid(micros, clock_id), "3ma7eht63lc2d")

    def test_rejects_malformed_keys(self):
        for bad in ("3ma7eht63lc2", "3MA7EHT63LC2D", "1ma7eht63lc2d", "self"):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                ss.decode_tid(bad)

    def test_clock_never_repeats_when_time_stands_still(self):
        clock = ss.TidClock(now_ns=lambda: 1_700_000_000_000_000_000, clock_id=7)
        keys = [clock.next() for _ in range(5)]
        self.assertEqual(keys, sorted(set(keys)))
        self.assertTrue(all(ss.TID.match(key) for key in keys))


class BlobTests(unittest.TestCase):
    def test_cid_of_empty_block(self):
        self.assertEqual(ss.blob_cid(b""), "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku")


class FrontMatterTests(unittest.TestCase):
    def test_adds_key_before_closing_fence(self):
        text = "---\ntitle: A\n---\nBody\n---\nnot front matter\n"
        self.assertEqual(
            ss.add_rkey(text, DOC),
            f"---\ntitle: A\n{ss.RKEY_FIELD}: {DOC}\n---\nBody\n---\nnot front matter\n",
        )

    def test_handles_empty_front_matter(self):
        self.assertEqual(ss.add_rkey("---\n---\nBody\n", DOC), f"---\n{ss.RKEY_FIELD}: {DOC}\n---\nBody\n")

    def test_leaves_existing_key(self):
        self.assertIsNone(ss.add_rkey(f"---\n{ss.RKEY_FIELD}: {DOC}\n---\n", PUB))

    def test_requires_front_matter(self):
        with self.assertRaises(ValueError):
            ss.add_rkey("# No front matter\n", DOC)


class TextTests(unittest.TestCase):
    def test_paragraphs_entities_and_angle_brackets(self):
        html = "<h2>Head</h2><p>N &lt; 100 and\n  leads &gt; 10 &amp; more</p><ul><li>a</li><li><em>b</em>c</li></ul>"
        self.assertEqual(ss.html_to_text(html), "Head\n\nN < 100 and leads > 10 & more\n\na\n\nbc")
        self.assertEqual(ss.html_to_text(html, paragraphs=False), "Head N < 100 and leads > 10 & more a bc")

    def test_drops_kramdown_footnotes_and_scripts(self):
        html = (
            '<p>Claim<sup id="fnref:1" role="doc-noteref"><a href="#fn:1" class="footnote">1</a></sup>.</p>'
            '<script>var x = "<p>no</p>";</script>'
            '<div class="footnotes" role="doc-endnotes"><ol><li id="fn:1"><div><p>Note.</p></div>'
            '<a href="#fnref:1" class="reversefootnote">&#8617;</a></li></ol></div><p>After.</p>'
        )
        self.assertEqual(ss.html_to_text(html), "Claim.\n\nAfter.")


class LinkTests(unittest.TestCase):
    def test_finds_links_by_rel_token(self):
        page = (
            f'<head><link rel="site.standard.document" href="{DOC_URI}" />'
            f'<link rel="alternate SITE.STANDARD.PUBLICATION" href="{PUB_URI}">'
            '<link rel="stylesheet" href="/main.css"></head>'
        ).encode()
        self.assertEqual(ss.link_hrefs(page, "site.standard.document"), [DOC_URI])
        self.assertEqual(ss.link_hrefs(page, "site.standard.publication"), [PUB_URI])


class DesiredTests(unittest.TestCase):
    def test_cleans_records(self):
        result = desired()
        record = result.documents[DOC]
        self.assertEqual(record["title"], "Signoff: N < 100")
        self.assertEqual(record["description"], "Tom & Jerry")
        self.assertEqual(record["textContent"], "First line wraps.\n\nSecond <p>")
        self.assertEqual(record["publishedAt"], "2026-05-13T07:00:00.000Z")
        self.assertNotIn("tags", record)
        self.assertNotIn("description", result.publication)
        self.assertEqual(result.publication_uri, PUB_URI)

    def test_undated_documents_use_the_first_commit(self):
        for date in (None, "2026-11-10T04:00:00-08:00"):  # absent, or Jekyll's build time
            with self.subTest(date=date):
                record = desired(manifest(date=date)).documents[DOC]
                self.assertEqual(record["publishedAt"], "2026-10-24T23:49:34.000Z")

    def test_publication_year_overrides_date_with_a_note(self):
        result = desired(manifest(publicationYear=2026))
        self.assertEqual(result.documents[DOC]["publishedAt"], "2026-10-24T23:49:34.000Z")
        self.assertIn("sets both date and publication_year", result.notes[0])

    def test_uncommitted_undated_documents_are_reported(self):
        result = desired(manifest(date=None), commit_date=lambda source: None)
        self.assertEqual(result.undated, ["_publications/signoff.md"])
        self.assertNotIn("publishedAt", result.documents[DOC])

    def test_rejects_duplicate_keys(self):
        data = manifest()
        data["documents"].append(copy.deepcopy(data["documents"][0]))
        with self.assertRaises(ValueError):
            desired(data)


class ValidateTests(unittest.TestCase):
    def test_valid_site_has_no_problems(self):
        self.assertEqual(ss.validate(desired()), [])

    def problems(self, edit):
        data = manifest()
        edit(data)
        return "\n".join(ss.validate(desired(data)))

    def test_rejects_local_urls(self):
        problems = self.problems(lambda d: d["publication"]["record"].update(url="http://127.0.0.1:4001"))
        self.assertIn("production https:// URL", problems)

    def test_rejects_low_contrast_themes(self):
        problems = self.problems(
            lambda d: d["publication"]["record"]["basicTheme"].update(accent=color(200, 220, 255))
        )
        self.assertIn("accentForeground on accent", problems)

    def test_rejects_bad_documents(self):
        def edit(data):
            document = data["documents"][0]
            document["rkey"] = "not-a-tid"
            document["record"].update(title="", path="publication/x", site="at://elsewhere")
            data["missing"] = ["_publications/new.md"]

        problems = self.problems(edit)
        for expected in ("not a TID", "title", "path must start", "in this publication",
                         "_publications/new.md has no"):
            self.assertIn(expected, problems)

    def test_counts_long_titles(self):
        problems = self.problems(lambda d: d["documents"][0]["record"].update(title="x" * 501))
        self.assertIn("longer than 500", problems)


class VerifyTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.write(".well-known/site.standard.publication", PUB_URI)
        (self.root / "images").mkdir()
        (self.root / "images/icon.jpg").write_bytes(JPEG)
        self.write("publication/signoff.html", self.page(DOC_URI))
        self.write("index.html", self.page())

    def tearDown(self):
        self.directory.cleanup()

    def write(self, path, text):
        file = self.root / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(text)

    @staticmethod
    def page(document=None):
        links = f'<link rel="site.standard.publication" href="{PUB_URI}">'
        if document:
            links += f'<link rel="site.standard.document" href="{document}">'
        return f"<!doctype html><html><head>{links}</head><body></body></html>"

    def verify(self):
        return "\n".join(ss.verify(ss.Site(self.root), desired()))

    def test_verified_site(self):
        self.assertEqual(self.verify(), "")

    def test_wrong_well_known(self):
        self.write(".well-known/site.standard.publication", PUB_URI.replace(PUB, "3mzwnpagwzs58"))
        self.assertIn("expected", self.verify())

    def test_missing_or_wrong_document_link(self):
        wrong = DOC_URI.replace(DOC, "3mzwnrqmtteul")
        for page in (self.page(), self.page(wrong), self.page(DOC_URI) + self.page(DOC_URI)):
            with self.subTest(page=page):
                self.write("publication/signoff.html", page)
                self.assertIn("/publication/signoff: expected one site.standard.document link",
                              self.verify())

    def test_document_link_on_another_page(self):
        self.write("cv/index.html", self.page(DOC_URI))
        self.assertIn("/cv/index.html links to", self.verify())

    def test_unknown_document_link(self):
        self.write("cv/index.html", self.page(DOC_URI.replace(DOC, "3mzwnrqmtteul")))
        self.assertIn("not a document in the manifest", self.verify())

    def test_icon_must_be_an_image(self):
        (self.root / "images/icon.jpg").write_text("not an image")
        self.assertIn("is not a PNG, JPEG, GIF or WebP image", self.verify())

    def test_missing_page(self):
        (self.root / "publication/signoff.html").unlink()
        self.assertIn("/publication/signoff: page not found", self.verify())


class FakePds:
    def __init__(self, publication=None, documents=()):
        self.calls = []
        self.publication, self.documents = publication, list(documents)

    def get_record(self, did, collection, rkey):
        return self.publication

    def list_records(self, did, collection):
        return self.documents

    def create_record(self, did, collection, rkey, record):
        self.calls.append(("create", collection, rkey, record))

    def put_record(self, did, collection, rkey, record, swap=None):
        self.calls.append(("put", collection, rkey, record, swap))

    def delete_record(self, did, collection, rkey, swap=None):
        self.calls.append(("delete", collection, rkey, swap))

    def upload_blob(self, data, mime_type):
        self.calls.append(("upload", mime_type))
        return {"$type": "blob", "ref": {"$link": ss.blob_cid(data)}, "mimeType": mime_type,
                "size": len(data)}


def apply(pds, site, changes, icon_data, prune):
    with contextlib.redirect_stdout(io.StringIO()):
        ss.apply_changes(pds, site, changes, icon_data, prune)


class PlanTests(unittest.TestCase):
    NOW = "2026-11-10T12:00:00.000Z"
    ICON_DATA = JPEG
    ICON = {"$type": "blob", "ref": {"$link": ss.blob_cid(JPEG)}, "mimeType": "image/jpeg",
            "size": len(JPEG)}

    def setUp(self):
        self.site = desired()
        publication = {**self.site.publication, "icon": self.ICON}
        self.existing_publication = {"cid": "pub-cid", "value": publication}
        self.existing_documents = {
            DOC: {"cid": "doc-cid", "value": {**self.site.documents[DOC], "updatedAt": "x"}}
        }

    def plan(self):
        return ss.plan_changes(self.site, self.ICON, self.existing_publication,
                               self.existing_documents, self.NOW)

    def test_first_publish_creates_everything_and_uploads_the_icon(self):
        self.existing_publication, self.existing_documents = None, {}
        changes = self.plan()
        self.assertEqual([(c.action, c.collection) for c in changes],
                         [("create", ss.PUBLICATION), ("create", ss.DOCUMENT)])
        pds = FakePds()
        apply(pds, self.site, changes, self.ICON_DATA, prune=False)
        self.assertEqual([call[0] for call in pds.calls], ["upload", "create", "create"])

    def test_unchanged_records_are_left_alone(self):
        self.assertEqual(self.plan(), [])

    def test_updates_name_fields_and_compare_and_swap(self):
        self.site.documents[DOC]["title"] = "New title"
        self.site.publication["name"] = "New name"
        changes = self.plan()
        self.assertEqual([(c.action, c.fields, c.swap) for c in changes],
                         [("update", ["name"], "pub-cid"), ("update", ["title"], "doc-cid")])
        self.assertEqual(changes[1].record["updatedAt"], self.NOW)
        self.assertNotIn("updatedAt", changes[0].record)
        pds = FakePds()
        apply(pds, self.site, changes, self.ICON_DATA, prune=False)
        self.assertNotIn("upload", [call[0] for call in pds.calls])  # icon did not change

    def test_extra_records_are_deleted_only_with_prune(self):
        self.existing_documents["3mzwnrqmtteul"] = {"cid": "old", "value": {"path": "/old"}}
        changes = self.plan()
        self.assertEqual([(c.action, c.rkey) for c in changes], [("delete", "3mzwnrqmtteul")])
        for prune, expected in ((False, []), (True, [("delete", ss.DOCUMENT, "3mzwnrqmtteul", "old")])):
            pds = FakePds()
            apply(pds, self.site, changes, self.ICON_DATA, prune=prune)
            self.assertEqual(pds.calls, expected)

    def test_refuses_a_publication_key_that_belongs_to_another_site(self):
        self.existing_publication["value"] = {**self.existing_publication["value"],
                                              "url": "https://coupledsystems.leaflet.pub"}
        with self.assertRaisesRegex(ValueError, "publication for https://coupledsystems"):
            self.plan()

    def test_refuses_a_document_key_that_belongs_to_another_publication(self):
        other = PUB_URI.replace(PUB, "3m6v3hmb64k2h")
        self.existing_documents[DOC]["value"] = {**self.existing_documents[DOC]["value"], "site": other}
        with self.assertRaisesRegex(ValueError, "Give _publications/signoff.md a new"):
            self.plan()

    def test_a_trailing_slash_is_the_same_site_and_gets_normalized(self):
        self.existing_publication["value"] = {**self.existing_publication["value"],
                                              "url": "https://example.github.io/"}
        self.assertEqual([(c.action, c.fields) for c in self.plan()], [("update", ["url"])])


class FetchTests(unittest.TestCase):
    def test_keeps_this_publications_documents_and_the_sites_keys_only(self):
        def entry(rkey, site):
            return {"uri": f"at://{DID}/site.standard.document/{rkey}", "cid": rkey,
                    "value": {"site": site, "path": "/" + rkey}}

        leaflet = PUB_URI.replace(PUB, "3m6v3hmb64k2h")
        pds = FakePds(publication={"cid": "p", "value": {}}, documents=[
            entry("3ma7eht63lc2d", leaflet),          # another publication: ignored
            entry("3mzwnrqmtteul", PUB_URI + "/"),    # this publication, removed page
            entry(DOC, leaflet),                       # a key the site uses: kept, then refused
        ])
        publication, documents = ss.fetch_existing(pds, desired())
        self.assertEqual(publication, {"cid": "p", "value": {}})
        self.assertEqual(sorted(documents), sorted([DOC, "3mzwnrqmtteul"]))


class StubPds(ss.Pds):
    """A Pds whose HTTP calls return canned responses."""

    def __init__(self, responses):
        super().__init__("https://pds.example")
        self.responses, self.requests = list(responses), []

    def call(self, method, nsid, params=None, body=None, content_type="application/json"):
        self.requests.append((nsid, params))
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class PdsTests(unittest.TestCase):
    def test_lists_every_page(self):
        pds = StubPds([{"records": [1, 2], "cursor": "c1"}, {"records": [3], "cursor": "c2"},
                       {"records": []}])
        self.assertEqual(pds.list_records(DID, ss.DOCUMENT), [1, 2, 3])
        self.assertEqual([params.get("cursor") for _, params in pds.requests], [None, "c1", "c2"])

    def test_missing_record_is_none_and_other_errors_raise(self):
        not_found = ss.HttpError(400, "u", b'{"error": "RecordNotFound", "message": "x"}')
        self.assertIsNone(StubPds([not_found]).get_record(DID, ss.PUBLICATION, PUB))
        with self.assertRaises(ss.HttpError):
            StubPds([ss.HttpError(500, "u", b"oops")]).get_record(DID, ss.PUBLICATION, PUB)


class ImageTypeTests(unittest.TestCase):
    def test_reads_the_type_from_the_bytes(self):
        self.assertEqual(ss.image_type(b"\x89PNG\r\n\x1a\n...."), "image/png")
        self.assertEqual(ss.image_type(JPEG), "image/jpeg")
        self.assertEqual(ss.image_type(b"RIFF\0\0\0\0WEBPVP8 "), "image/webp")
        self.assertIsNone(ss.image_type(b"<svg></svg>"))


if __name__ == "__main__":
    unittest.main()
