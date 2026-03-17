"""
Resume templates — 5 premium Tailwind CSS HTML templates.
All CSS {{ }} braces are doubled for _safe_render() compatibility.
Placeholders use {single_braces} and are substituted by resume_generator.py.
"""

# ─── Common head block ────────────────────────────────────────────────────────
_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <script>
    tailwind.config = {{ theme: {{ extend: {{ fontFamily: {{ sans: ['Inter','system-ui','sans-serif'] }} }} }} }}
  </script>
  <style>
    /* ── Page canvas: zero margin kills browser headers/footers ────────────── */
    @page {{ margin: 0; size: letter; }}

    @media print {{

      /* ── Universal box model + color rendering ────────────────────────────── */
      /* box-sizing:border-box ensures padding/border are INCLUDED in any element's
         declared width — prevents padding from pushing columns past their allotted
         share and is the single most effective overflow-prevention rule.          */
      * {{
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }}

      /* ── Base: 9pt font, body padding creates the visual margins ──────────── */
      html {{
        margin: 0 !important;
        padding: 0 !important;
      }}
      body {{
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        margin: 0 !important;
        padding: 8mm 10mm !important;
        background: white !important;
        font-size: 9pt !important;
        line-height: 1.2 !important;
      }}

      /* ── 3. Expand outer wrappers to the full printable width ────────────── */
      .resume,
      .card-layout {{
        max-width: 100% !important;
        width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        overflow: visible !important;
        min-height: unset !important;
      }}
      /* T2/T3/T4 use a block-stacked resume wrapper — forcing flex here would
         pull their header beside their first section.  Flex is added only for
         T1 in the body.sidebar-dark scope below.                             */
      .resume {{ display: block !important; }}

      /* ── Nuke ALL Tailwind max-width constraints + centering ─────────────── */
      /* Tailwind max-w-[860px], max-w-3xl, max-w-screen-lg etc. all trap
         content in a narrow centered box.  Force every such element to fill
         the full printable width.                                             */
      [class*="max-w-"],
      .container {{
        max-width: 100% !important;
        width: 100% !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }}

      /* ══ NUCLEAR COMPACTION — class-selector specificity (0,0,1,0+)
         matches Tailwind's own tier so !important is the decisive factor.
         Tailwind CDN does NOT add !important; ours does → we always win. ══ */

      /* 1. Universal line-height — beats any Tailwind leading-* class */
      body * {{ line-height: 1.2 !important; }}
      [class*="leading-"] {{ line-height: 1.2 !important; }}

      /* 2. Nuke ALL vertical padding classes (py-*, pt-*, pb-*) */
      [class*="py-"] {{
        padding-top:    0.2rem !important;
        padding-bottom: 0.2rem !important;
      }}
      [class*="pt-"] {{ padding-top:    0.15rem !important; }}
      [class*="pb-"] {{ padding-bottom: 0.15rem !important; }}
      /* Large padding shorthands (p-7 through p-10) */
      [class*="p-7"],[class*="p-8"],[class*="p-9"],[class*="p-10"] {{
        padding-top:    0.2rem !important;
        padding-bottom: 0.2rem !important;
      }}

      /* 2. Nuke ALL vertical margin classes */
      [class*="mb-"] {{ margin-bottom: 0.15rem !important; }}
      [class*="mt-"] {{ margin-top:    0.1rem  !important; }}
      [class*="my-"] {{
        margin-top:    0.1rem  !important;
        margin-bottom: 0.15rem !important;
      }}
      [class*="space-y-"] > * + * {{ margin-top: 0.15rem !important; }}
      [class*="gap-"]              {{ gap:        0.3rem  !important; }}

      /* Destroy artificial left indents — Tailwind ml-* / pl-* / responsive
         breakpoint variants (md:ml-*, lg:ml-*) all create empty left gutters.
         NOTE: our .job-entry ul rule uses a class-qualified element selector
         at higher specificity and will correctly override this for bullets.   */
      [class*="ml-"],
      [class*="pl-"],
      [class*="md:ml-"],
      [class*="md:pl-"],
      [class*="lg:ml-"] {{
        margin-left:  0 !important;
        padding-left: 0 !important;
      }}

      /* 3. Shrink large heading font sizes for print */
      h1 {{ font-size: 1.2rem !important; margin-bottom: 0.1rem !important; }}
      h2 {{ font-size: 0.75rem !important; margin-bottom: 0.1rem !important; }}
      h3 {{ font-size: 0.72rem !important; margin-bottom: 0.05rem !important; }}
      p  {{ margin-bottom: 0.05rem !important; }}
      ul, ol {{ margin-bottom: 0.05rem !important; }}
      li {{ margin-bottom: 0.02rem !important; }}

      /* Semantic element fallback (element selectors, lower priority but kept) */
      main, aside, header, section, article {{
        padding-top:    0.2rem !important;
        padding-bottom: 0.2rem !important;
      }}

      /* 4. Fix page-2 background — body gets fixed-attachment gradient for T1 */
      html {{
        height: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }}

      /* ══════════════════════════════════════════════════════════════════════
         NUCLEAR TEXT RESET
         Tailwind CDN injects .flex/.grid AFTER our <style> block, so bare
         element selectors (li, ul) lose the specificity war even with
         !important.  Every rule below is class-qualified (.job-entry …) to
         reach specificity ≥ 0,0,1,1 — beating Tailwind's 0,0,1,0.
         ══════════════════════════════════════════════════════════════════════ */

      /* ── 1. Nuke nested grids / flex on content wrappers ─────────────────── */
      /* Destroy grid-template-columns and flex on EVERY div/ul/ol/section
         nested inside a job-entry or the main content column so Tailwind's
         .grid/.flex/.grid-cols-* cannot force columnar layout.                */
      .job-entry div,
      .job-entry ul,
      .job-entry ol,
      .job-entry section {{
        display: block !important;
        grid-template-columns: none !important;
        width: 100% !important;
      }}
      /* Exception: keep the title/date row as flex-wrap so title and date
         sit on the same line when there's room, wrapping if not.             */
      .job-entry > div:first-child {{
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: baseline !important;
        gap: 0.25rem !important;
      }}

      /* ── 2. Reset bullet lists — class-qualified to beat .flex/.grid ───── */
      /* list-style-position:outside + padding-left creates a proper hanging
         indent: bullet stays at left edge, wrapped text aligns with text
         start (not under the bullet dot).                                   */
      .job-entry ul,
      .job-entry ol {{
        display: block !important;
        width: 100% !important;
        list-style-type: disc !important;
        list-style-position: outside !important;
        padding-left: 1.5rem !important;
        margin-left: 0 !important;
      }}
      .job-entry li {{
        display: list-item !important;
        text-align: left !important;
        width: 100% !important;
        list-style-type: disc !important;
        list-style-position: outside !important;
        padding-left: 0 !important;
        margin-bottom: 0.25rem !important;
      }}

      /* ── 2. Force inline sentences — the critical $24M fix ──────────────── */
      /* Named text-level elements inside <li> are forced inline so bolded
         metrics ($24M, 40%) never break into their own visual column.
         NOTE: the `li *` wildcard is intentionally NOT used here — it would
         catch <div> layout wrappers and break them.  Specificity 0,0,1,2+.  */
      .job-entry li strong,
      .job-entry li span,
      .job-entry li em,
      .job-entry li a,
      .job-entry li p,
      .job-entry li b,
      .job-entry li i,
      .job-entry li code {{
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
      }}

      /* ── Lock job and education blocks — never split across a page ─────── */
      .job-entry {{
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        margin-bottom: 0.5rem !important;
      }}
      .edu-entry {{
        display: block !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        margin-bottom: 0.5rem !important;
      }}

      /* ══ DESIGN ENHANCEMENTS — All Templates ══════════════════════════════════ */

      /* Better spacing: section headers & content */
      section h2, header h2, .section-header {{
        margin-top: 0.4rem !important;
        margin-bottom: 0.3rem !important;
        letter-spacing: 0.05em !important;
        font-weight: 700 !important;
      }}

      /* Improved section dividers */
      section > *:first-child, header > *:first-child {{
        padding-top: 0.3rem !important;
        padding-bottom: 0.2rem !important;
        border-bottom: 1px solid #e5e7eb !important;
        margin-bottom: 0.3rem !important;
      }}

      /* Better job/education entry spacing */
      .job-entry {{ margin-bottom: 0.6rem !important; }}
      .edu-entry {{ margin-bottom: 0.4rem !important; }}

      /* Typography: improved hierarchy */
      h1 {{ font-weight: 800 !important; letter-spacing: -0.01em !important; }}
      h2 {{ font-weight: 700 !important; font-size: 0.85rem !important; }}
      h3 {{ font-weight: 600 !important; }}

      /* Better readability for bullet points */
      .job-entry li {{ margin-bottom: 0.15rem !important; }}

      /* Skill tags: improved styling */
      [class*="bg-"][class*="text-"] span,
      .skill-tag {{ padding: 0.15rem 0.4rem !important; font-size: 0.75rem !important; }}

      /* Contact/header info: better spacing */
      .contact-info span {{ display: block !important; margin-bottom: 0.1rem !important; }}

      /* Flex children: never collapse below their content width */
      main > *, .flex-1 {{ min-width: 0 !important; flex-shrink: 1 !important; }}
      /* stretch (not flex-start) so sidebar fills the full column height */
      .resume-sidebar    {{ align-self: stretch !important; }}


      /* ══ ENHANCED DESIGN — Color Accents & Visual Hierarchy ════════════════════════ */

      /* Better spacing around job/education titles */
      .job-entry > div:first-child {{
        margin-bottom: 0.2rem !important;
        padding-bottom: 0.15rem !important;
      }}

      /* Enhanced section dividers with subtle color */
      section > h2:first-of-type,
      header > h2:first-of-type {{
        border-bottom: 2px solid #d1d5db !important;
        padding-bottom: 0.25rem !important;
        margin-bottom: 0.35rem !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        font-size: 0.70rem !important;
      }}

      /* Better spacing between skill items and lists */
      .skill-tag, [class*="badge"] {{
        margin-right: 0.3rem !important;
        margin-bottom: 0.2rem !important;
      }}

      /* Enhanced job entry title styling */
      .job-entry strong {{
        font-weight: 700 !important;
        display: block !important;
        margin-bottom: 0.05rem !important;
      }}

      /* Better company/institution styling */
      .job-entry em {{
        font-style: italic !important;
        font-size: 0.85rem !important;
        display: block !important;
        margin-bottom: 0.05rem !important;
      }}


      /* ═══ Template 1 — Modern Split (dark sidebar) ══════════════════════════
         Two-layer gradient strategy for reliable multi-page sidebar color:
         Layer 1: html:has(body.sidebar-dark) — stamps gradient onto the ROOT
           (page canvas) element.  Chrome's print engine clips `body` to its
           content height, but `html` propagates to every physical page.
           :has() scopes this to T1 only; T2–T5 are completely unaffected.
         Layer 2: body.sidebar-dark — retained as a fallback for engines that
           don't propagate html background to the page canvas.
         `body.sidebar-dark html` was INVALID (html is body's ancestor).      */

      html:has(body.sidebar-dark) {{
        background: linear-gradient(
          to right,
          #0f172a 0%, #0f172a 33.333333%,
          #ffffff 33.333333%, #ffffff 100%
        ) !important;
        background-attachment: fixed !important;
        background-size: 100% 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }}
      body.sidebar-dark {{
        padding: 0 !important;
        height: 100% !important;
        min-height: 100vh !important;
        background: linear-gradient(
          to right,
          #0f172a 0%, #0f172a 33.333333%,
          #ffffff 33.333333%, #ffffff 100%
        ) !important;
        background-attachment: fixed !important;
        background-size: 100% 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }}
      /* T1 only: CSS Grid for the two-column layout.
         Grid tracks are HARD BOUNDS — a cell cannot grow past its defined
         track width regardless of content, unlike flex where flex:1 1 auto
         can allow main to expand and bleed past the paper edge.
         33.333333% + 66.666666% = exactly 100% of the grid container width.
         align-items:stretch is the GRID DEFAULT — sidebar fills full row
         height automatically so the dark background reaches every page bottom.
         column-gap:0 ensures the gradient color stop aligns with the
         sidebar element's right edge with no gap between columns.             */
      body.sidebar-dark .resume {{
        display: grid !important;
        grid-template-columns: 33.333333% 66.666666% !important;
        width: 100% !important;
        column-gap: 0 !important;
        background: transparent !important;
      }}
      /* Sidebar carries its own solid dark background — if the body gradient
         fails (some engines ignore fixed-attachment) the column stays dark.  */
      body.sidebar-dark .resume-sidebar {{
        background-color: #0f172a !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }}
      /* Main placed in grid column 2 (track width = 66.666666%).
         width:100% fills the cell; min-width:0 prevents wide content (long
         URLs, unbreakable strings) from overflowing the cell boundary.
         All flex sizing properties removed — no-ops on grid children.       */
      body.sidebar-dark main {{
        grid-column: 2 !important;
        width: 100% !important;
        min-width: 0 !important;
        background-color: transparent !important;
        box-sizing: border-box !important;
        padding-left: 2rem !important;
        padding-right: 2rem !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
      }}
      /* Hide the profile circle for print — saves ~120px of vertical space */
      body.sidebar-dark .resume-sidebar > div:first-child {{
        display: none !important;
      }}
      /* Sidebar placed in grid column 1 (track width = 33.333333%).
         width:100% means 100% of the grid cell, not the page.
         All flex sizing properties removed — they are no-ops on grid children. */
      body.sidebar-dark .resume-sidebar {{
        grid-column: 1 !important;
        width: 100% !important;
        box-sizing: border-box !important;
        padding: 0.8rem 1rem !important;
      }}
      /* Restore padding/margin inside the sidebar that the global
         [class*="pl-"] / [class*="ml-"] zeroing would otherwise strip.
         Higher specificity (0,0,3,0) beats the global (0,0,1,0) rules.     */
      body.sidebar-dark .resume-sidebar [class*="pl-"],
      body.sidebar-dark .resume-sidebar [class*="ml-"] {{
        padding-left: 0.25rem !important;
        margin-left:  0.25rem !important;
      }}
      body.sidebar-dark .resume-sidebar * {{
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        hyphens: auto !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }}
      body.sidebar-dark .resume-sidebar h1 {{
        font-size: 0.9rem !important;
        line-height: 1.2 !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        hyphens: auto !important;
      }}
      body.sidebar-dark .resume-sidebar h2 {{
        margin-bottom: 0.15rem !important;
      }}
      body.sidebar-dark .resume-sidebar .border-t {{
        width: 100% !important;
        box-sizing: border-box !important;
        display: block !important;
        margin-bottom: 0.3rem !important;
      }}
      /* Sidebar mb-* and space-y-* — scoped with class selector for full specificity */
      body.sidebar-dark .resume-sidebar [class*="mb-"] {{
        margin-bottom: 0.2rem !important;
      }}
      body.sidebar-dark .resume-sidebar [class*="space-y-"] > * + * {{
        margin-top: 0.15rem !important;
      }}

      /* T1 Enhanced dividers and spacing */
      body.sidebar-dark .resume-sidebar .border-t {{
        border-top-color: rgba(255, 255, 255, 0.2) !important;
        margin-top: 0.3rem !important;
        margin-bottom: 0.3rem !important;
      }}
      body.sidebar-dark .resume-sidebar section h2 {{
        color: #e0f2fe !important;
        font-size: 0.75rem !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
        padding-bottom: 0.2rem !important;
        margin-bottom: 0.25rem !important;
      }}

      /* T1 Improved contact info styling */
      body.sidebar-dark .resume-sidebar .contact-info {{
        margin-bottom: 0.3rem !important;
      }}
      body.sidebar-dark .resume-sidebar .contact-info span {{
        font-size: 0.80rem !important;
        line-height: 1.3 !important;
        margin-bottom: 0.08rem !important;
      }}


      /* ═══ Template 2 — Executive Header (indigo banner · two-column) ══════════
         Layout: .resume (block) > <header> banner + <div class="flex"> columns.
         The flex CONTAINER is the inner div, NOT .resume itself — so we target
         it as body.executive-header .resume > div (the only direct-div child;
         the banner is a <header> element so it doesn't match > div).
         Sidebar is w-60 (15rem fixed); main is flex-1 taking the rest.          */

      body.executive-header .resume > div {{
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
        width: 100% !important;
      }}
      body.executive-header .resume-sidebar {{
        flex: 0 0 15rem !important;
        width: 15rem !important;
        max-width: 15rem !important;
        min-width: 15rem !important;
        flex-shrink: 0 !important;
        flex-grow: 0 !important;
        box-sizing: border-box !important;
      }}
      body.executive-header main {{
        flex: 1 1 auto !important;
        min-width: 0 !important;
        max-width: calc(100% - 15rem) !important;
        box-sizing: border-box !important;
        padding-left: 2rem !important;
        padding-right: 2rem !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
      }}

      /* T2 Enhanced header styling with dividers */
      body.executive-header header {{
        border-bottom: 2px solid #4f46e5 !important;
        padding-bottom: 0.4rem !important;
        margin-bottom: 0.4rem !important;
      }}
      body.executive-header header h1 {{
        color: #1e293b !important;
        font-size: 1.3rem !important;
        letter-spacing: -0.02em !important;
      }}
      body.executive-header .resume-sidebar h2 {{
        color: #4f46e5 !important;
        border-bottom: 1px solid #e0e7ff !important;
        padding-bottom: 0.15rem !important;
        margin-bottom: 0.2rem !important;
        font-size: 0.75rem !important;
      }}
      body.executive-header section h2 {{
        color: #4f46e5 !important;
        border-bottom: 2px solid #e0e7ff !important;
        padding-bottom: 0.15rem !important;
        margin-bottom: 0.25rem !important;
      }}


      /* ═══ Template 3 — Minimalist Grid ══════════════════════════════════════
         3. Stack the Grid Headers: the label column ("PROFESSIONAL SUMMARY",
         "WORK EXPERIENCE" etc.) was stealing horizontal space.  For print we
         switch the flex row to display:block so the label sits ABOVE the
         content and bullets get the full paper width to spread out.            */

      /* Band flex row → stacked block: label on top, content below */
      body.minimalist-grid section > div,
      body.minimalist-grid header  > div {{
        display: block !important;
        width: 100% !important;
      }}
      /* Label column: full width, small bottom margin, then content follows */
      body.minimalist-grid section > div > div:first-child,
      body.minimalist-grid header  > div > div:first-child {{
        width: 100% !important;
        margin-bottom: 0.2rem !important;
      }}
      /* Content column: full width below the label */
      body.minimalist-grid section > div > div:last-child,
      body.minimalist-grid header  > div > div:last-child {{
        width: 100% !important;
        overflow: visible !important;
      }}
      /* Skills 3-col grid: keep as grid but explicit columns */
      body.minimalist-grid .grid-cols-3 {{
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        width: 100% !important;
      }}
      /* Custom dot-bullet paragraphs: dot + text on same line (block flow) */
      body.minimalist-grid .job-entry p {{
        display: block !important;
        width: 100% !important;
        white-space: normal !important;
        word-break: break-word !important;
        padding-left: 0.75rem !important;
        text-indent: -0.75rem !important;
      }}
      body.minimalist-grid .job-entry p > span:first-child {{
        display: inline-block !important;
        width: 0.4rem !important;
        height: 0.4rem !important;
        margin-right: 0.35rem !important;
        vertical-align: middle !important;
        flex: none !important;
      }}
      /* T3 bullet <p> inline children — force inline so highlight_metrics()
         <strong> tags ($24M, 12%) flow as part of the sentence, not as
         separate flex/grid columns.
         EXCEPTION: the dot <span> is handled by span:first-child above at
         higher specificity (0,0,3,2) which overrides this (0,0,2,2) rule.  */
      body.minimalist-grid .job-entry p span,
      body.minimalist-grid .job-entry p strong,
      body.minimalist-grid .job-entry p em,
      body.minimalist-grid .job-entry p b,
      body.minimalist-grid .job-entry p a,
      body.minimalist-grid .job-entry p code {{
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
      }}
      /* Compact T3 section + header padding */
      body.minimalist-grid section,
      body.minimalist-grid header {{
        padding-top: 0.3rem !important;
        padding-bottom: 0.3rem !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }}
      /* Shrink the T3 header name (text-5xl is way too large for print) */
      body.minimalist-grid header h1 {{
        font-size: 1.5rem !important;
        line-height: 1.2 !important;
      }}
      /* Tighten the band horizontal padding (px-14 = 56px is too much) */
      body.minimalist-grid .resume > div {{
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }}

      /* T3 Color Enhancement — Green accent for section headers */
      body.minimalist-grid section > div > div:first-child {{
        border-bottom: 2px solid #10b981 !important;
        padding-bottom: 0.2rem !important;
        margin-bottom: 0.25rem !important;
      }}
      body.minimalist-grid section > div > div:first-child * {{
        color: #059669 !important;
        font-weight: 700 !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
        font-size: 0.70rem !important;
      }}

      /* T3 Section spacing improvements */
      body.minimalist-grid section {{
        margin-bottom: 0.5rem !important;
      }}
      body.minimalist-grid section > *:not(:first-child) {{
        margin-top: 0.15rem !important;
      }}


      /* ═══ Template 4 — Accent Column ════════════════════════════════════════
         The two-column body is a nested flex: .flex-1.flex-col > .flex.flex-1
         main needs flex:1 1 auto + min-width:0 to claim its share of space.
         li bullets use display:flex (SVG + anonymous text node); override to
         display:block so the text wraps naturally across the full li width.     */

      /* Two-column body row: flex-1 items get flex:1 1 auto + min-width:0.
         The inner <div class="flex flex-1"> two-column container gets these too,
         which is correct — it should grow to fill the flex-col parent's height. */
      body.accent-col .flex-1 {{
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }}
      /* Iron-clad column widths for the T4 two-column row.
         T4 has TWO .resume-sidebar elements: a 2px wide accent bar (div) and the
         real right sidebar (aside, w-52 = 13rem).  Element-qualified selectors
         distinguish them so the 2px bar is not given sidebar column dimensions. */
      body.accent-col aside.resume-sidebar {{
        flex: 0 0 13rem !important;
        width: 13rem !important;
        max-width: 13rem !important;
        min-width: 13rem !important;
        flex-shrink: 0 !important;
        flex-grow: 0 !important;
        box-sizing: border-box !important;
      }}
      body.accent-col main {{
        flex: 1 1 auto !important;
        min-width: 0 !important;
        max-width: calc(100% - 13rem) !important;
        box-sizing: border-box !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
      }}
      /* li bullets: drop flex so SVG + text flow as normal inline content */
      body.accent-col .job-entry li {{
        display: block !important;
        width: 100% !important;
        padding-left: 1rem !important;
        white-space: normal !important;
        word-break: break-word !important;
      }}
      body.accent-col .job-entry li > svg {{
        display: inline !important;
        vertical-align: middle !important;
        margin-right: 0.25rem !important;
        flex-shrink: 0 !important;
      }}

      /* T4 Enhanced color accents and dividers */
      body.accent-col header {{
        border-bottom: 2px solid #be185d !important;
        padding-bottom: 0.35rem !important;
        margin-bottom: 0.35rem !important;
      }}
      body.accent-col header h1 {{
        color: #be185d !important;
      }}
      body.accent-col .resume-sidebar h2 {{
        color: #be185d !important;
        border-bottom: 1px solid #fbcfe8 !important;
        padding-bottom: 0.15rem !important;
        margin-bottom: 0.2rem !important;
        font-size: 0.75rem !important;
        letter-spacing: 0.08em !important;
      }}
      body.accent-col section h2 {{
        color: #be185d !important;
        border-bottom: 2px solid #fbcfe8 !important;
        padding-bottom: 0.15rem !important;
        margin-bottom: 0.25rem !important;
      }}
      body.accent-col .resume-sidebar {{
        border-left-color: #fbcfe8 !important;
      }}
      body.accent-col .resume-sidebar .border-t {{
        border-top-color: #fbcfe8 !important;
      }}


      /* ═══ Template 5 — Card UI (preserve aesthetics, fix pagination) ════════ */

      body.card-ui .t5-job-card,
      body.card-ui .t5-edu-card,
      body.card-ui .t5-cert-card,
      body.card-ui .resume-card {{
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        overflow: visible !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }}

      /* T5 summary+skills row: flex so both cards stretch to equal height */
      body.card-ui .t5-top-row {{
        display: flex !important;
        align-items: stretch !important;
        gap: 0.4rem !important;
      }}
      /* T5 top cards: grow to fill available width, equal height, breathing room */
      body.card-ui .t5-top-card {{
        height: auto !important;
        box-sizing: border-box !important;
        padding: 0.5rem 0.85rem !important;
      }}
      body.card-ui .t5-top-card:first-child {{ flex: 3 !important; }}
      body.card-ui .t5-top-card:last-child  {{ flex: 2 !important; }}
      /* T5 job/edu/cert cards: restored internal padding */
      body.card-ui .t5-job-card,
      body.card-ui .t5-edu-card,
      body.card-ui .t5-cert-card {{
        padding: 0.5rem 0.85rem !important;
      }}

      /* T5 Enhanced card styling with color accents */
      body.card-ui .resume-card {{
        border: 1px solid #e2e8f0 !important;
      }}
      body.card-ui .t5-job-card,
      body.card-ui .t5-edu-card,
      body.card-ui .t5-cert-card {{
        border-left: 3px solid #8b5cf6 !important;
      }}
      body.card-ui .t5-job-card {{ border-left-color: #0ea5e9 !important; }}
      body.card-ui .t5-edu-card {{ border-left-color: #8b5cf6 !important; }}
      body.card-ui .t5-cert-card {{ border-left-color: #ec4899 !important; }}

      body.card-ui section h2 {{
        color: #6366f1 !important;
        border-bottom: 2px solid #e0e7ff !important;
        padding-bottom: 0.15rem !important;
        margin-bottom: 0.25rem !important;
        font-size: 0.75rem !important;
        letter-spacing: 0.08em !important;
      }}
      body.card-ui h3 {{
        color: #4f46e5 !important;
        font-weight: 700 !important;
      }}


      /* ── Release all grid children to full page width ───────────────────── */
      /* Any element with class "grid" that still has display:grid will
         compress its children into narrow columns during print.  Force every
         direct <div> child to span all columns so content uses full width.
         EXCEPTION: .t3-skills-grid must keep its 2-col structure — its
         protection rule below has higher specificity (0,0,3,1) and wins.     */
      .grid > div {{
        grid-column: 1 / -1 !important;
        width: 100% !important;
      }}

      /* ═══ Template 3 — Skills Grid alignment fix ════════════════════════════
         2-column grid (1fr 1fr) keeps Core/Domain headers perfectly above
         their respective skill lists, with 1rem column gap for legibility.    */

      body.minimalist-grid .t3-skills-grid {{
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 1rem !important;
        width: 100% !important;
        margin-top: 0.15rem !important;
      }}
      /* Each column header + item list stays as block flow.
         PROTECTION: grid-column:auto restores natural column placement,
         overriding the global ".grid > div { grid-column:1/-1 }" above.
         Specificity here is (0,0,3,1) vs (0,0,1,1) there → we always win. */
      body.minimalist-grid .t3-skills-grid > div {{
        display: block !important;
        grid-column: auto !important;
      }}
      body.minimalist-grid .t3-skills-grid > div > p:first-child {{
        display: block !important;
        margin-bottom: 0.1rem !important;
      }}

    }}
  </style>
</head>"""

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 1 — Modern Split (dark sidebar · sky blue)
# ═══════════════════════════════════════════════════════════════════════════════
TEMPLATE_1 = _HEAD + """
<body class="sidebar-dark bg-slate-200 min-h-screen py-10 font-sans">

<div class="resume max-w-[860px] mx-auto flex shadow-2xl rounded-xl overflow-hidden" style="min-height:1100px">

  <!-- LEFT SIDEBAR — width must exactly match the 33.333333% gradient stop -->
  <aside class="resume-sidebar flex-shrink-0 bg-slate-900 text-white flex flex-col p-8"
         style="width:33.333333%; max-width:33.333333%; box-sizing:border-box; overflow:hidden;">

    <!-- Profile Circle -->
    <div class="flex justify-center mb-6">
      <div class="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold text-white ring-4 ring-slate-700 ring-offset-2 ring-offset-slate-900"
           style="background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)">
        {initials}
      </div>
    </div>

    <!-- Name & Title -->
    <h1 class="text-xl font-bold text-center text-white tracking-tight leading-tight"
        style="overflow-wrap:break-word; word-break:break-word; hyphens:auto;">{full_name}</h1>
    <p class="text-sky-400 text-[10px] font-semibold tracking-[0.2em] uppercase text-center mt-1.5 mb-7"
       style="overflow-wrap:break-word; word-break:break-word;">{current_title}</p>

    <div class="border-t border-slate-700 mb-6" style="width:100%; box-sizing:border-box;"></div>

    <!-- Contact -->
    <div class="mb-7">
      <h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-sky-400 mb-3.5">Contact</h2>
      {contact_items}
    </div>

    <!-- Persönliche Daten (DE only) — includes own divider + wrapper when rendered -->
    {personal_data_section}

    <div class="border-t border-slate-700 mb-6" style="width:100%; box-sizing:border-box;"></div>

    <!-- Skills -->
    <div class="mb-7">
      <h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-sky-400 mb-3.5">Skills</h2>
      {skills_items}
    </div>

    <div class="border-t border-slate-700 mb-6" style="width:100%; box-sizing:border-box;"></div>

    <!-- Certifications -->
    <div>
      <h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-sky-400 mb-3.5">Certifications</h2>
      {certs_items}
    </div>

  </aside>

  <!-- RIGHT MAIN -->
  <main class="flex-1 bg-white p-10">
    {summary_section}
    {experience_section}
    {education_section}
  </main>
</div>
</body>
</html>"""

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 2 — Executive Header (indigo banner · two-column)
# ═══════════════════════════════════════════════════════════════════════════════
TEMPLATE_2 = _HEAD + """
<body class="executive-header bg-indigo-50 min-h-screen py-10 font-sans">

<div class="resume max-w-[860px] mx-auto shadow-2xl rounded-xl overflow-hidden bg-white" style="min-height:1100px">

  <!-- BANNER HEADER -->
  <header style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #3730a3 100%)" class="px-10 py-8 relative overflow-hidden">
    <div class="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style="background:radial-gradient(circle, #a5b4fc, transparent); transform:translate(30%,-30%)"></div>
    <div class="absolute bottom-0 left-1/2 w-40 h-40 rounded-full opacity-5" style="background:radial-gradient(circle, #c7d2fe, transparent); transform:translate(-50%,50%)"></div>

    <div class="flex items-center gap-8 relative z-10">
      <!-- Profile Circle -->
      <div class="flex-shrink-0">
        <div class="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-indigo-900 ring-4 ring-indigo-300 ring-offset-2 ring-offset-transparent"
             style="background: linear-gradient(135deg, #c7d2fe, #a5b4fc)">
          {initials}
        </div>
      </div>
      <!-- Name + Title -->
      <div class="flex-1">
        <h1 class="text-4xl font-extrabold text-white tracking-tight leading-none">{full_name}</h1>
        <p class="text-indigo-300 text-sm font-semibold tracking-[0.15em] uppercase mt-2">{current_title}</p>
      </div>
    </div>
  </header>

  <!-- TWO COLUMNS -->
  <div class="flex">

    <!-- LEFT COLUMN -->
    <div class="resume-sidebar w-60 flex-shrink-0 bg-slate-50 border-r border-slate-100 p-7">
      <div class="mb-6">
        <h2 class="text-[9px] font-bold tracking-[0.22em] uppercase text-indigo-600 mb-3 pb-1.5 border-b border-indigo-100">Contact</h2>
        {contact_items}
      </div>
      {personal_data_section}
      {skills_section}
      {certs_section}
    </div>

    <!-- RIGHT MAIN -->
    <main class="flex-1 p-8 bg-white">
      {summary_section}
      {experience_section}
      {education_section}
    </main>
  </div>
</div>
</body>
</html>"""

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 3 — Minimalist Grid (alternating bands · emerald)
# ═══════════════════════════════════════════════════════════════════════════════
TEMPLATE_3 = _HEAD + """
<body class="minimalist-grid bg-gray-100 min-h-screen py-10 font-sans">

<div class="resume max-w-[840px] mx-auto shadow-2xl rounded-xl overflow-hidden bg-white" style="min-height:1100px">

  <!-- TYPOGRAPHIC HEADER -->
  <header class="px-14 pt-12 pb-8 bg-white border-b border-gray-200">
    <div class="flex justify-between items-end">
      <div>
        <p class="text-[10px] font-semibold tracking-[0.25em] uppercase text-emerald-600 mb-2">{current_title}</p>
        <h1 class="text-5xl font-light text-gray-900 tracking-tight leading-none">{full_name}</h1>
      </div>
      <div class="text-right text-xs text-gray-500 space-y-1 pb-1">
        <p>{email}</p>
        <p>{phone}</p>
        <p>{location}</p>
      </div>
    </div>
  </header>

  <!-- BODY BANDS -->
  <div class="px-14 py-8 space-y-0">
    {summary_band}
    {skills_band}
    {experience_band}
    {edu_certs_band}
  </div>
</div>
</body>
</html>"""

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 4 — Accent Column (rose bar · SVG icon contact)
# ═══════════════════════════════════════════════════════════════════════════════
TEMPLATE_4 = _HEAD + """
<body class="accent-col bg-rose-50 min-h-screen py-10 font-sans">

<div class="resume max-w-[860px] mx-auto flex shadow-2xl rounded-xl overflow-hidden bg-white" style="min-height:1100px">

  <!-- LEFT ACCENT BAR -->
  <div class="resume-sidebar w-2 flex-shrink-0" style="background: linear-gradient(180deg, #e11d48 0%, #be185d 50%, #9d174d 100%)"></div>

  <!-- CONTENT AREA -->
  <div class="flex-1 flex flex-col">

    <!-- HEADER -->
    <header class="px-10 pt-10 pb-7 border-b border-gray-100">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-4xl font-extrabold text-gray-900 tracking-tight leading-none">{full_name}</h1>
          <p class="text-rose-600 text-xs font-bold tracking-[0.2em] uppercase mt-2">{current_title}</p>
        </div>
        <div class="text-right">
          {contact_items}
        </div>
      </div>
    </header>

    <!-- TWO-COLUMN BODY -->
    <div class="flex flex-1">

      <!-- LEFT CONTENT -->
      <main class="flex-1 px-10 py-7 space-y-7">
        {summary_section}
        {experience_section}
      </main>

      <!-- RIGHT SIDEBAR -->
      <aside class="resume-sidebar w-52 flex-shrink-0 border-l border-gray-100 px-6 py-7 space-y-6 bg-rose-50/30">
        {aside_skills}
        <div class="border-t border-rose-100"></div>
        {aside_education}
        <div class="border-t border-rose-100"></div>
        {aside_certs}
        {personal_data_section}
      </aside>
    </div>
  </div>
</div>
</body>
</html>"""

# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 5 — Card Interface (floating cards · violet)
# ═══════════════════════════════════════════════════════════════════════════════
TEMPLATE_5 = _HEAD + """
<body class="card-ui bg-slate-100 min-h-screen py-10 font-sans">

<div class="card-layout max-w-[860px] mx-auto space-y-4 px-2">

  <!-- NAME CARD -->
  <div class="resume-card bg-white rounded-2xl shadow-lg overflow-hidden">
    <div class="h-2 w-full" style="background: linear-gradient(90deg, #0ea5e9 0%, #8b5cf6 50%, #ec4899 100%)"></div>
    <div class="px-10 py-8 flex items-center gap-8">
      <div class="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg"
           style="background: linear-gradient(135deg, #0ea5e9, #8b5cf6)">
        {initials}
      </div>
      <div class="flex-1">
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">{full_name}</h1>
        <p class="text-violet-600 text-xs font-bold tracking-[0.2em] uppercase mt-1">{current_title}</p>
        <div class="flex flex-wrap gap-x-5 gap-y-1 mt-3">
          {contact_spans}
        </div>
      </div>
    </div>
  </div>

  <!-- SUMMARY + SKILLS ROW -->
  <div class="t5-top-row grid grid-cols-5 gap-4">
    {summary_card}
    {skills_card}
  </div>

  <!-- EXPERIENCE CARD -->
  {experience_card}

  <!-- EDUCATION + CERTS -->
  {edu_certs_section}

</div>
</body>
</html>"""


def get_template(template_id: int) -> str:
    templates = {
        1: TEMPLATE_1,
        2: TEMPLATE_2,
        3: TEMPLATE_3,
        4: TEMPLATE_4,
        5: TEMPLATE_5,
    }
    return templates.get(template_id, TEMPLATE_1)
