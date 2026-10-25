A Github Pages template for academic websites. This was forked (then detached) by [Stuart Geiger](https://github.com/staeiou) from the [Minimal Mistakes Jekyll Theme](https://mmistakes.github.io/minimal-mistakes/), which is © 2016 Michael Rose and released under the MIT License. See LICENSE.md.

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

Publication entries without `publication_status` are treated as published. Use
`publication_status: accepted` for accepted, peer-reviewed contributions and
`publication_status: under_review` for preprints still in review. Both the
publications page and HTML CV show accepted work first, then work under review,
then published entries in reverse date order. Within the first two groups,
entries are ordered by title. Use `publication_year` when only the year is known;
omit `date` rather than inventing an acceptance or publication day. Year-only
entries do not emit an inferred publication date in page metadata. Add `paperurl`
and `link` only when a public manuscript is available, and keep the status in the
`citation` text consistent with the entry's metadata. Summaries are optional.

The read-only `Resume` workflow runs on pushes and PRs targeting `jerry` or `main`.
It validates the artifact without committing files or replacing native GitHub
Pages deployment. To require validation before publication, configure the Pages
publishing branch to require PRs and the `Verify resume` check; a failing workflow
by itself does not block deployment after a direct push. Confirm the Linux CI
check passes before merging changes produced on another platform.

I think I've got things running smoothly and fixed some major bugs, but feel free to file issues or make pull requests if you want to improve the generic template / theme.

### Note: if you are using this repo and now get a notification about a security vulnerability, delete the Gemfile.lock file. 

# Instructions

1. Register a GitHub account if you don't have one and confirm your e-mail (required!)
1. Fork [this repository](https://github.com/academicpages/academicpages.github.io) by clicking the "fork" button in the top right. 
1. Go to the repository's settings (rightmost item in the tabs that start with "Code", should be below "Unwatch"). Rename the repository "[your GitHub username].github.io", which will also be your website's URL.
1. Set site-wide configuration and create content & metadata (see below -- also see [this set of diffs](http://archive.is/3TPas) showing what files were changed to set up [an example site](https://getorg-testacct.github.io) for a user with the username "getorg-testacct")
1. Upload any files (like PDFs, .zip files, etc.) to the files/ directory. They will appear at https://[your GitHub username].github.io/files/example.pdf.  
1. Check status by going to the repository settings, in the "GitHub pages" section
1. (Optional) Use the Jupyter notebooks or python scripts in the `markdown_generator` folder to generate markdown files for publications and talks from a TSV file.

See more info at https://academicpages.github.io/

## To run locally (not on GitHub Pages, to serve on your own computer)

1. Clone the repository and made updates as detailed above
1. Make sure you have ruby-dev, bundler, and nodejs installed: `sudo apt install ruby-dev ruby-bundler nodejs`
1. Run `bundle clean` to clean up the directory (no need to run `--force`)
1. Run `bundle install` to install ruby dependencies. If you get errors, delete Gemfile.lock and try again.
1. Start the local preview:

   ```sh
   bundle exec jekyll serve --config _config.yml,_config.local.yml --destination /tmp/jlin-site-preview
   ```

   Open <http://127.0.0.1:4001/>. The local configuration keeps navigation links
   on localhost and polls for file changes so edits trigger a rebuild. Refresh
   the browser after a rebuild; restart the server after changing configuration.
   GitHub Pages continues to use `_config.yml` for the production site.

   For a one-off local build, use the same configuration:

   ```sh
   bundle exec jekyll build --config _config.yml,_config.local.yml --destination /tmp/jlin-site-preview
   ```

# Changelog -- bugfixes and enhancements

There is one logistical issue with a ready-to-fork template theme like academic pages that makes it a little tricky to get bug fixes and updates to the core theme. If you fork this repository, customize it, then pull again, you'll probably get merge conflicts. If you want to save your various .yml configuration files and markdown files, you can delete the repository and fork it again. Or you can manually patch. 

To support this, all changes to the underlying code appear as a closed issue with the tag 'code change' -- get the list [here](https://github.com/academicpages/academicpages.github.io/issues?q=is%3Aclosed%20is%3Aissue%20label%3A%22code%20change%22%20). Each issue thread includes a comment linking to the single commit or a diff across multiple commits, so those with forked repositories can easily identify what they need to patch.
