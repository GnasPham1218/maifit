#!/usr/bin/env python3
"""Turn saved web pages into the Markdown files the RAG chatbot ingests.

Usage (from tools/rag-import):
  python convert.py                      convert every source listed in sources.json
  python convert.py list raw/page.html   show the sections of a saved page (to fill in "keep")
Reads : sources.json, raw/<page>.html  (pages saved with Ctrl+S, "Webpage, HTML Only")
Writes: ../../backend/src/main/resources/rag/<id>.md

Why a script: the text is copied by the machine, never retyped, so every sentence stays
exactly as published. Only whole sections are dropped (references, acknowledgements...) and
the in-text citation numbers are removed; both are stated in the "changes" line of each file,
as the CC BY licence requires.

Adding a source from a site that is already supported = one more entry in sources.json:
  keep           top-level sections to keep (names as printed by "list")
  drop_headings  optional: sub-headings to remove, each with everything under it
  keep_headings  optional: {"Section": ["Sub-heading", ...]} keeps ONLY those sub-headings
                 (with everything under them) inside that section
  tables         optional: {"1": "raw/<saved page of Table 1>.html"} adds that table, as a list,
                 right after the paragraph that mentions it. The site shows each table on its own
                 page ("Full size table"). A table that is not listed is left out, together with
                 the sentence that only introduces it
A new site needs one more extractor function registered in EXTRACTORS.
"""
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE.parent.parent / "backend" / "src" / "main" / "resources" / "rag"


# ---------- shared: HTML fragment -> Markdown blocks ----------

class BlockParser(HTMLParser):
    """Collects headings, paragraphs and list items of one section as Markdown lines."""

    SKIP_TAGS = {"script", "style", "figure", "table", "img", "h2"}  # h2 = the section title itself

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []       # finished Markdown blocks
        self.kind = None       # block being built: "p", "li", "h3", "h4"
        self.buf = []
        self.skip_stack = []   # tags whose content is ignored (citations, figures...)
        self.li_depth = 0

    def handle_starttag(self, tag, attrs):
        if self.skip_stack:
            if tag == self.skip_stack[-1]:
                self.skip_stack.append(tag)
            return
        attrs = dict(attrs)
        if tag in self.SKIP_TAGS or (tag == "a" and attrs.get("data-test") == "citation-ref"):
            if tag != "img":   # img is a void tag: nothing to skip
                self.skip_stack.append(tag)
            return
        if tag in ("h3", "h4"):
            self.flush()
            self.kind = tag
        elif tag == "li":
            self.flush()
            self.kind = "li"
            self.li_depth += 1
        elif tag == "p":
            if self.li_depth:
                self.buf.append(" ")   # a paragraph inside a list item stays part of that item
            else:
                self.flush()
                self.kind = "p"

    def handle_endtag(self, tag):
        if self.skip_stack:
            if tag == self.skip_stack[-1]:
                self.skip_stack.pop()
            return
        if tag == "li":
            self.li_depth = max(self.li_depth - 1, 0)
            self.flush()
        elif tag in ("h3", "h4") or (tag == "p" and not self.li_depth):
            self.flush()

    def handle_data(self, data):
        if not self.skip_stack and self.kind:
            self.buf.append(data)

    def flush(self):
        text = clean("".join(self.buf))
        if text and self.kind:
            if self.kind == "h3":
                self.blocks.append("### " + text)
            elif self.kind == "h4":
                self.blocks.append("#### " + text)
            elif self.kind == "li" and not re.match(r"\d+[).]\s", text):
                self.blocks.append("- " + text)
            else:
                self.blocks.append(text)   # paragraph, or a list item numbered by the source ("1) ...")
        self.kind, self.buf = None, []


def clean(text: str) -> str:
    text = text.replace(" ", " ")
    text = re.sub(r"\s+", " ", text)
    # What is left of "[12, 13]" / "[4–6]" once the citation links are gone
    text = re.sub(r"\s*\[(?:\s|,|;|–|-|and)*\]", "", text)
    text = re.sub(r"\s+([,.;:)])", r"\1", text)
    text = re.sub(r"\(\s+", "(", text)
    return text.strip()


def to_blocks(fragment: str) -> list:
    parser = BlockParser()
    parser.feed(fragment)
    parser.flush()
    return parser.blocks


# ---------- per-site extractors: return (metadata, [(section title, html fragment)]) ----------

def meta_all(page: str, name: str) -> list:
    return [html.unescape(v) for v in
            re.findall(r'<meta[^>]*name="%s"[^>]*content="([^"]*)"' % re.escape(name), page)]


def extract_bmc(page: str):
    """BioMed Central / Springer article pages (e.g. jissn.biomedcentral.com)."""
    meta = {
        "title": meta_all(page, "citation_title")[0],
        "authors": "; ".join(meta_all(page, "citation_author")),
        "publisher": meta_all(page, "citation_journal_title")[0],
        "published": meta_all(page, "citation_publication_date")[0].replace("/", "-"),
        "doi": meta_all(page, "citation_doi")[0],
    }
    sections = [(html.unescape(m.group(1)), m.group(2)) for m in
                re.finditer(r'<section[^>]*data-title="([^"]*)"[^>]*>(.*?)</section>', page, re.S)]
    return meta, sections


def cell_paragraphs(cell_html: str) -> list:
    """Text of one table cell, one string per paragraph, citation links removed."""
    cell_html = re.sub(r'<a[^>]*(?:data-test="citation-ref"|#ref-CR)[^>]*>.*?</a>', "", cell_html, flags=re.S)
    # Footnote markers (<sup>a</sup>) would otherwise glue to the value: "500 mg/d" + "a" -> "500 mg/da"
    cell_html = re.sub(r"<sup>([a-z])</sup>", r" [\1] ", cell_html)
    parts = re.findall(r"<p[^>]*>(.*?)</p>", cell_html, re.S) or [cell_html]
    texts = [clean(html.unescape(re.sub(r"<[^>]+>", "", part))) for part in parts]
    return [text for text in texts if text]


def extract_bmc_table(page: str):
    """A "Full size table" page of BioMed Central / Springer: (caption, header cells, rows, footnote)."""
    caption = clean(html.unescape(re.sub(r"<[^>]+>", "", re.search(r"<h1[^>]*>(.*?)</h1>", page, re.S).group(1))))
    tables = re.findall(r"<table.*?</table>", page, re.S)
    if len(tables) != 1:
        sys.exit(f"expected exactly one <table> on a table page, found {len(tables)}: {caption}")
    header, rows = [], []
    for row in re.findall(r"<tr.*?</tr>", tables[0], re.S):
        if "colspan" in row.replace('colspan="1"', "") and "<th" in row:
            sys.exit(f"merged header cells are not supported: {caption}")
        cells = re.findall(r"<(t[hd])[^>]*>(.*?)</t[hd]>", row, re.S)
        if cells and all(kind == "th" for kind, _ in cells):
            header = [" ".join(cell_paragraphs(cell)) for _, cell in cells]
        else:
            rows.append([cell_paragraphs(cell) for _, cell in cells])
    footer = re.search(r'c-article-table-footer[^>]*>(.*?)</div>', page, re.S)
    note = " ".join(cell_paragraphs(footer.group(1))) if footer else ""
    return caption, header, rows, note


EXTRACTORS = {"bmc": extract_bmc}
TABLE_EXTRACTORS = {"bmc": extract_bmc_table}


def table_blocks(caption: str, header: list, rows: list, note: str) -> list:
    """A table as Markdown: the caption, then one list item per row ("Column: value; Column: value")."""
    blocks = [caption]
    for row in rows:
        if header:
            if len(row) != len(header):
                sys.exit(f"row with {len(row)} cells under {len(header)} columns: {caption}")
            blocks.append("- " + "; ".join(f"{name}: {' '.join(cell)}" for name, cell in zip(header, row)))
        else:   # no header row: every paragraph of every cell is its own item
            for cell in row:
                blocks.extend("- " + re.sub(r"^[•\-]\s*", "", paragraph) for paragraph in cell)
    if note and not re.fullmatch(r"(?:Adapted )?[Ff]rom\b.*", note):   # a bare "from <citation>" says nothing once citations are gone
        blocks.append("Table note: " + note)
    return blocks


def insert_tables(blocks: list, converted: dict, placed: set) -> list:
    """Put each table right after the first paragraph that mentions "Table N"."""
    out = []
    for block in blocks:
        out.append(block)
        for number, table in converted.items():
            if number not in placed and re.search(r"\bTables? %s\b" % number, block) and not heading_level(block):
                out.extend(table)
                placed.add(number)
    return out


# ---------- shared: filter the sub-headings of one section ----------

def heading_level(block: str) -> int:
    """3 for "### x", 4 for "#### x", 0 for normal text."""
    match = re.match(r"(#{3,4}) ", block)
    return len(match.group(1)) if match else 0


def heading_text(block: str) -> str:
    return block.lstrip("#").strip()


def drop_subtrees(blocks: list, names: list, used: set) -> list:
    """Remove each listed heading and everything under it (up to the next heading of the same or a higher level)."""
    out, skip_level = [], 0
    for block in blocks:
        level = heading_level(block)
        if skip_level and (level == 0 or level > skip_level):
            continue
        skip_level = 0
        if level and heading_text(block) in names:
            used.add(heading_text(block))
            skip_level = level
            continue
        out.append(block)
    return out


def keep_subtrees(blocks: list, names: list, used: set) -> list:
    """Keep only the listed headings with everything under them; the text before the first heading is dropped."""
    out, keep_level = [], 0
    for block in blocks:
        level = heading_level(block)
        if keep_level and (level == 0 or level > keep_level):
            out.append(block)
            continue
        keep_level = 0
        if level and heading_text(block) in names:
            used.add(heading_text(block))
            keep_level = level
            out.append(block)
    return out


# ---------- shared: sentences that only introduce a table ----------

TABLE_INTRO = re.compile(r"Tables? (\d+) (?:presents|outlines|describes|summari[sz]es|shows|lists|provides)\b")


def drop_table_intros(blocks: list, available: set) -> tuple:
    """Remove sentences like "Table 2 outlines ..." when that table is not part of the output.

    Tables live on separate pages of the site, so without the table such a sentence points at nothing.
    Returns (blocks, numbers of the tables whose introduction was removed).
    """
    out, removed = [], []
    for block in blocks:
        if heading_level(block):
            out.append(block)
            continue
        kept = []
        for sentence in re.split(r"(?<=[.!?])\s+", block):
            match = TABLE_INTRO.match(sentence)
            if match and match.group(1) not in available:
                removed.append(match.group(1))
            else:
                kept.append(sentence)
        if kept:
            out.append(" ".join(kept))
    return out, removed


# ---------- main ----------

def front_matter(fields: dict) -> str:
    lines = ["---"]
    for key, value in fields.items():
        if '"' in value or "\n" in value:
            sys.exit(f'front matter value of "{key}" contains a quote or a line break: {value!r}')
        lines.append(f'{key}: "{value}"')
    lines.append("---")
    return "\n".join(lines)


def convert(source: dict) -> None:
    page = (HERE / source["input"]).read_text(encoding="utf-8")
    meta, sections = EXTRACTORS[source["site"]](page)
    found = [title for title, _ in sections]

    missing = [title for title in source["keep"] if title not in found]
    if missing:   # fail fast: the page layout changed or a section name is misspelled
        sys.exit(f'{source["id"]}: sections not found: {missing}\n  found: {found}')

    dropped = [title for title in found if title not in source["keep"]]
    drop_headings = source.get("drop_headings", [])
    keep_headings = source.get("keep_headings", {})
    used = set()   # sub-headings that were really found, to catch typos below
    tables = source.get("tables", {})   # {"1": "raw/<page of table 1>.html"}
    converted = {number: table_blocks(*TABLE_EXTRACTORS[source["site"]]((HERE / path).read_text(encoding="utf-8")))
                 for number, path in tables.items()}
    placed = set()
    intros_removed = []
    body = ["# " + meta["title"]]
    for title, fragment in sections:
        if title not in source["keep"]:
            continue
        blocks = to_blocks(fragment)
        if title in keep_headings:
            blocks = keep_subtrees(blocks, keep_headings[title], used)
        blocks = drop_subtrees(blocks, drop_headings, used)
        blocks, removed = drop_table_intros(blocks, set(tables))
        intros_removed += removed
        blocks = insert_tables(blocks, converted, placed)
        if not blocks:
            sys.exit(f'{source["id"]}: section "{title}" is empty after conversion')
        body.append("## " + title)
        body.extend(blocks)

    wanted = set(drop_headings) | {name for names in keep_headings.values() for name in names}
    if wanted - used:   # fail fast, same reason as for sections
        sys.exit(f'{source["id"]}: sub-headings not found: {sorted(wanted - used)}')

    changes = "Excerpt of the original article. Sections removed: " + ", ".join(dropped) + "."
    for title, names in keep_headings.items():
        changes += f" From the section '{title}' only these parts were kept: " + ", ".join(names) + "."
    if drop_headings:
        changes += " Sub-sections removed: " + ", ".join(drop_headings) + "."
    if set(converted) - placed:   # the table is never mentioned in the kept text: nowhere to put it
        sys.exit(f'{source["id"]}: no paragraph mentions Table {sorted(set(converted) - placed)}')

    if converted:
        changes += " Table " + ", ".join(sorted(converted)) + " rewritten as a list (one item per row);" \
                   " figures, the other tables and in-text citation numbers removed."
    else:
        changes += " Figures, tables and in-text citation numbers removed."
    if intros_removed:
        changes += " Sentences that only introduce a removed table (Table " \
                   + ", ".join(sorted(set(intros_removed))) + ") removed."
    changes += " Text otherwise unchanged."

    fields = {
        **meta,
        "url": source["url"],
        "license": source["license"],
        "license_url": source["license_url"],
        "accessed": source["accessed"],
        "changes": changes,
    }
    text = front_matter(fields) + "\n\n" + "\n\n".join(body) + "\n"

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / (source["id"] + ".md")
    with open(out, "w", encoding="utf-8", newline="\n") as f:   # LF on every OS: same file from any machine
        f.write(text)

    leftovers = re.findall(r"\[[^\]]{0,40}\]", text)
    print(f'{source["id"]}: {len(source["keep"])} sections kept, {len(dropped)} dropped, '
          f'{len(text):,} chars -> {out.relative_to(HERE.parent.parent)}')
    if leftovers:
        print(f"  check these {len(leftovers)} bracketed leftovers: {leftovers[:10]}")


def list_sections(path: str, site: str) -> None:
    """Print what a saved page contains, so "keep" can be written from real section names."""
    page = Path(path).read_text(encoding="utf-8")
    meta, sections = EXTRACTORS[site](page)
    print(meta["title"])
    for title, fragment in sections:
        chars = sum(len(block) for block in to_blocks(fragment))
        print(f"  {chars:>7,} chars  {title}")


def main() -> None:
    if len(sys.argv) >= 3 and sys.argv[1] == "list":
        list_sections(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "bmc")
        return
    config = json.loads((HERE / "sources.json").read_text(encoding="utf-8"))
    for source in config["sources"]:
        convert(source)


if __name__ == "__main__":
    main()
