"""Standalone Streamlit host for the ATW Studio portfolio."""
from functools import lru_cache
from pathlib import Path
import re

import streamlit as st

ASSETS = Path(__file__).with_name("dist")


def portfolio_html():
    # Streamlit may rerun this launcher without reloading the embedded files.
    assets = (*ASSETS.glob("*.*"), ASSETS / "emirati" / "index.html",
              ASSETS / "emirati" / "frames" / "orbit" / "000.webp")
    revision = tuple((path.name, path.stat().st_mtime_ns) for path in sorted(assets) if path.is_file())
    return _portfolio_html(revision)


@lru_cache(maxsize=1)
def _portfolio_html(_revision):
    page = (ASSETS / "index.html").read_text(encoding="utf-8")
    styles = (ASSETS / "studio.css").read_text(encoding="utf-8")
    script = (ASSETS / "studio.js").read_text(encoding="utf-8")
    page = page.replace('<script src="studio.js" defer></script>', "")
    page = page.replace('<link rel="stylesheet" href="studio.css">', f"<style>{styles}</style>")

    page = page.replace('href="emirati/"', 'href="/?experience=emirati" target="_blank" rel="noopener noreferrer"')
    page = static_media_urls(page)
    return page.replace("</body>", f"<script>{script}</script></body>")


def static_media_urls(page, directory=""):
    return re.sub(
        r'(?P<attr>src|poster|data-mobile-src|data-watch-source)="(?P<file>[a-z0-9/.-]+\.(?:webp|mp4|html|js))"',
        lambda match: f'{match["attr"]}="/app/static/{directory}{match["file"]}"',
        page,
    )


def emirati_html():
    page = (ASSETS / "emirati" / "index.html").read_text(encoding="utf-8")
    page = static_media_urls(page, "emirati/")
    return page.replace('href="../"', 'href="/" target="_blank" rel="noopener noreferrer"')


st.set_page_config(page_title="ATW Studio · Anjalo Theophine Wilson", layout="wide")
st.html("""
<style>
[data-testid="stMainBlockContainer"]{max-width:none;padding:0}
#MainMenu,[data-testid="stHeader"],[data-testid="stToolbar"],[data-testid="stFooter"]{display:none}
html:has(.st-key-portfolio_viewport iframe),
body:has(.st-key-portfolio_viewport iframe),
[data-testid="stMain"]:has(.st-key-portfolio_viewport iframe){
    overflow:hidden;
    overscroll-behavior:none;
}
.st-key-portfolio_viewport iframe{
    position:fixed;
    inset:0;
    display:block;
    width:100%!important;
    height:100vh!important;
    height:100dvh!important;
    border:0;
}
</style>
""")
page = emirati_html() if st.query_params.get("experience") == "emirati" else portfolio_html()
with st.container(key="portfolio_viewport"):
    st.iframe(page, height=850, alt="ATW Studio portfolio")
