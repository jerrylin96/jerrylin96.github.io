// Local presentation helpers. Uses only Typst built-ins and embedded fonts.
#let resume(author: "", email: "", github: "", linkedin: "", personal-site: "", body) = {
  let accent = rgb("#26428b")
  set document(title: author + " - Resume", author: author)
  set page(paper: "us-letter", margin: 0.5in)
  set text(font: "Libertinus Serif", size: 11pt, lang: "en", ligatures: false)
  set par(leading: 0.65em, spacing: 0.65em)
  set list(indent: 0.8em, body-indent: 0.45em, tight: false, spacing: 4pt)
  show link: set text(fill: accent)
  show heading.where(level: 2): it => block(
    width: 100%, above: 12pt, below: 6pt,
    stack(
      dir: ttb, spacing: 3pt,
      text(size: 11pt, weight: "bold", fill: accent, it.body),
      line(length: 100%, stroke: 0.4pt + accent),
    ),
  )

  text(size: 22pt, weight: "bold", fill: accent, author)
  v(3pt)
  let contacts = (
    link("mailto:" + email, email),
    link("https://" + github, github),
    link("https://" + linkedin, linkedin),
    link("https://" + personal-site, personal-site),
  )
  text(size: 9pt, contacts.join([ #h(0.3em) | #h(0.3em) ]))
  v(2pt)
  body
}

#let dates-helper(start-date: "", end-date: "") = start-date + " - " + end-date

#let entry(primary: "", secondary: "", dates: "", location: "") = block(
  above: 8pt, below: 4pt, breakable: false,
  grid(
    columns: (1fr, auto), column-gutter: 1em, row-gutter: 3pt,
    align: (left, right),
    strong(primary), dates,
    secondary, emph(location),
  ),
)

#let work(title: "", company: "", dates: "", location: "") = entry(
  primary: title, secondary: company, dates: dates, location: location,
)

#let edu(institution: "", degree: "", dates: "", location: "") = entry(
  primary: institution, secondary: emph(degree), dates: dates, location: location,
)

#let extracurriculars(activity: "") = block(above: 5pt, below: 2pt, strong(activity))
