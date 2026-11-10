# jerrylin96.github.io

Source for [Jerry Lin's website](https://jerrylin96.github.io). GitHub Pages
builds it with Jekyll. It is also a [Standard.site](https://standard.site)
publication on the AT Protocol: each paper and post is published as a record
that Standard.site readers and search indexes can find and verify.

| Path | Contents |
| --- | --- |
| `_pages/` | Home (`about.md`), publications, CV, writing, and 404 pages |
| `_publications/` | One file per paper |
| `_posts/` | Blog posts (create the folder with the first post) |
| `_layouts/`, `_includes/` | Page templates |
| `_data/navigation.yml` | The navigation tabs |
| `assets/css/main.css` | The only stylesheet |
| `images/` | The photo and the avatar and icons cropped from it |
| `_config.yml` | Site settings, author links, and Standard.site settings |
| `scripts/standard_site.py` | Checks and publishes the Standard.site records |
| `main.typ`, `resume/`, `scripts/resume.py` | The resume PDF |

`images/avatar-320.jpg` (home page), `images/icon-512.jpg` (link previews and the
Standard.site publication icon), `images/favicon-32.png` and
`images/apple-touch-icon.png` are square crops of `images/bio-photo.jpg`. To
change the photo, replace all four, then run `publish` so the publication record
gets the new icon.

## Local preview

Install Ruby and Bundler, run `bundle install`, then start the preview:

```sh
bundle exec jekyll serve --config _config.yml,_config.local.yml --destination /tmp/jlin-site-preview
```

Open <http://127.0.0.1:4001/>. The local configuration sets the site URL used in
canonical links to localhost and polls for file changes so edits trigger a
rebuild. Refresh the browser after a rebuild; restart the server after changing
configuration. GitHub Pages builds with `_config.yml` alone.

GitHub Pages builds with Jekyll 3.10. `Gemfile.lock` pins Jekyll 3.9.3, which
renders this site identically but fails on Ruby 3.3 or newer with
``undefined method `[]' for nil`` in `logger.rb`. If you see that error,
`bundle update github-pages` moves the lockfile to Jekyll 3.10.

## Publications

Publication entries without `publication_status` are treated as published. Use
`publication_status: accepted` for accepted, peer-reviewed contributions and
`publication_status: under_review` for preprints still in review. Both the
publications page and HTML CV show accepted work first, then work under review,
then published entries in reverse date order. Within the first two groups,
entries are ordered by title. Use `publication_year` when only the year is known;
omit `date` rather than inventing an acceptance or publication day. Year-only
entries do not emit an inferred publication date in page metadata. Set `paperurl`
when a public manuscript is available. Publication titles and "Read paper"
buttons use that URL unless an explicit `link` overrides it. Keep the status in
the `citation` text consistent with the entry's metadata. Summaries are optional.
Verify a paper URL against the title and authors on a publisher, proceedings, or
preprint record, or use a URL supplied by the author. Leave unavailable manuscript
links unset; never invent URLs or use placeholders.

A paper dated in the future stays off the site and out of the Standard.site
records until that date. GitHub Pages rebuilds only when something is pushed,
so the paper appears with the first push after its date.

Every entry also needs a `standard_site_rkey`; see [Standard.site](#standardsite).

## Writing

Posts go in `_posts/YYYY-MM-DD-short-title.md` with a `title` in the front
matter. A post appears at `/writing/short-title/`. Its summary is the
`description` in its front matter, or else its first paragraph. The Writing link
appears in the navigation once a post exists.
Add `math: true` to a page's front matter to typeset LaTeX math with MathJax.
Like papers, posts need a `standard_site_rkey`.

## Standard.site

[Standard.site](https://standard.site) defines AT Protocol records for long-form
publishing. This site is the publication
`at://did:plc:qszahaiylwp5kys2irw4fllu/site.standard.publication/3mzwnpagwzs57`,
owned by the Bluesky account `@jlin404.com`. Each paper and post is a
`site.standard.document` in that publication.

### How it fits together

- `standard_site` in `_config.yml` holds the account's DID, the publication's
  record key, its icon and discovery setting, which collections become
  documents, and the theme colors.
- Each paper and post has a `standard_site_rkey` in its front matter: the record
  key of its document, assigned once. Never change or reuse one. It is the
  document's identity on the network, so a new key creates a separate record.
- Jekyll renders the verification the spec requires:
  `/.well-known/site.standard.publication` contains the publication's AT-URI,
  each document page links its record with
  `<link rel="site.standard.document">`, and every page links the publication
  with `<link rel="site.standard.publication">`.
- Jekyll also renders `/standard-site.json`, the records the site declares,
  from the same front matter and content as the pages.
  `scripts/standard_site.py` validates that file and writes its records to the
  account's server.

Because record keys are chosen before the records exist, the pages and the
records can go live in either order, and publishing again updates records in
place instead of adding duplicates.

A document's description is the entry's summary, or its citation if it has
none. Its text content is the page's text without formatting or footnotes.
`publishedAt` is the entry's `date` (for a post, the date in its filename).
Entries with a `publication_year` have no date to state, so their `publishedAt`
is when the page was first committed. If such an entry also sets `date`, the
date is ignored, as it is on the page, and `check` prints a note. Entries dated
in the future are published once their date has passed and the site is rebuilt.

### Adding a paper or post

Write the entry, then give it a record key and commit both:

```sh
python3 scripts/standard_site.py assign _publications/new-paper.md
```

Run `assign` with no arguments to key every entry that a build lists as
missing. CI fails if a paper or post has no key.

### Publishing the records

Publish after the change is live on <https://jerrylin96.github.io>:

1. Create an app password in Bluesky under Settings → Privacy and security →
   App passwords. Do not use the account password.
2. Preview the changes, which only reads:

   ```sh
   python3 scripts/standard_site.py plan
   ```

3. Publish:

   ```sh
   ATPROTO_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx python3 scripts/standard_site.py publish
   ```

`publish` reads the deployed site at the `url` in `_config.yml` rather than a
local build. It refuses to write unless that site's verification matches the
records, shows the plan, and asks before writing. It writes only records that
changed, creates new ones only where no record exists, and stops without
writing anything if a record key belongs to another site or publication (such
as one made in Leaflet). When a paper is removed, its record is listed as
`extra`, and `publish --prune` deletes it. Run `publish` again after any change
to a paper or post.

### Checking a build

```sh
bundle exec jekyll build
python3 scripts/standard_site.py check
python3 -m unittest discover -s scripts
```

Build with `_config.yml` alone: `check` rejects the localhost URL from
`_config.local.yml`. It validates the records against the lexicons and confirms
that every verification marker matches. The `Standard.site` workflow runs these
steps on pushes and PRs targeting `jerry` or `main`, building with
`actions/jekyll-build-pages`, the same build GitHub Pages runs.

### Colors

`standard_site.theme` sets the publication's `basicTheme`, which readers use to
show it, and the site's own palette in `assets/css/main.css`, so the two always
match. Dark mode, which follows the reader's system setting, is defined only in
the stylesheet. `check` requires 4.5:1 contrast for text on the background and on
the accent color.

### Seeing the records

- The publication record:
  <https://pdsls.dev/at://did:plc:qszahaiylwp5kys2irw4fllu/site.standard.publication/3mzwnpagwzs57>
- The [Standard.site validator](https://site-validator.fly.dev) checks a
  document URL.
- [Readers and indexes](https://standard.site/docs/implementations/) list
  publications that allow discovery (`show_in_discover`).

## Resume

Edit `main.typ`, then build and verify the PDF served at `/files/resume.pdf`:

```sh
python3 scripts/resume.py build
python3 scripts/resume.py check
```

Requirements: Python 3, the exact Typst version in `.typst-version` (currently
0.15.1), and Poppler (`brew install poppler` on macOS or
`sudo apt-get install poppler-utils` on Ubuntu). Download the matching compiler
archive for your platform from [Typst's 0.15.1 release](https://github.com/typst/typst/releases/tag/v0.15.1),
extract it, and put the executable on `PATH`, or set `TYPST=/path/to/typst` when
running the commands above. `brew install typst` does not pin this version.

`main.typ` contains the resume content; `resume/template.typ` contains the small
local layout. Both use native Typst features, with no external packages or fonts
to download. Once the tools are installed, builds work offline.

The shared script uses only the compiler's embedded fonts, fixes the creation
timestamp, and rejects all compiler errors and warnings, including unknown fonts.
It checks that the PDF has one page, contains extractable text, and contains no
US-style phone number. `check` recompiles into a temporary directory and compares
the complete PDF bytes, including layout and hyperlink destinations. Comment-only
edits do not require a changed PDF when they leave the output identical. Commit
the changed Typst sources and `files/resume.pdf` together when the output changes,
and inspect the rendered PDF before submitting a resume change.

The homepage and `/cv/` link to this PDF. The HTML CV retains additional academic
history and its publications list; it is a separate, longer document, so changes
to facts appearing in both documents should update both. Resume build sources and
scripts are excluded from Jekyll's published output.

The read-only `Resume` workflow runs on pushes and PRs targeting `jerry` or `main`.
It validates the artifact without committing files or replacing native GitHub
Pages deployment. To require validation before publication, configure the Pages
publishing branch to require PRs and the `Verify resume` check; a failing workflow
by itself does not block deployment after a direct push. Confirm the Linux CI
check passes before merging changes produced on another platform.

## Credits

The site began as a fork of [academicpages](https://github.com/academicpages/academicpages.github.io),
itself derived from the [Minimal Mistakes](https://mademistakes.com/work/minimal-mistakes-jekyll-theme/)
Jekyll theme © 2016 Michael Rose, released under the MIT License (see `LICENSE`).
