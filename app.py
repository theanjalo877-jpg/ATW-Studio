"""Standalone Streamlit host for the ATW Studio portfolio."""
from base64 import b64encode
from functools import lru_cache
from pathlib import Path
import re

import streamlit as st

ASSETS = Path(__file__).with_name("dist")


@lru_cache(maxsize=1)
def portfolio_html():
    page = (ASSETS / "index.html").read_text(encoding="utf-8")
    styles = (ASSETS / "studio.css").read_text(encoding="utf-8")
    scripts = []
    for name in ("three.min.js", "depot.js", "studio.js"):
        scripts.append((ASSETS / name).read_text(encoding="utf-8"))
        page = page.replace(f'<script src="{name}" defer></script>', "")
    page = page.replace('<link rel="stylesheet" href="studio.css">', f"<style>{styles}</style>")

    def embed_image(match):
        name = match[1]
        encoded = b64encode((ASSETS / name).read_bytes()).decode("ascii")
        return f'"data:image/webp;base64,{encoded}"'

    page = re.sub(r'"([a-z0-9-]+\.webp)"', embed_image, page)
    embedded = "".join(f"<script>{code}</script>" for code in scripts)
    return page.replace("</body>", embedded + "</body>")


st.set_page_config(page_title="ATW Studio · Anjalo Theophine Wilson", layout="wide")
st.html("""
<style>
[data-testid="stMainBlockContainer"]{max-width:none;padding:0}
[data-testid="stHeader"]{display:none}
iframe[title="ATW Studio portfolio"]{display:block;width:100%;height:100dvh!important;border:0}
</style>
""")
st.iframe(portfolio_html(), height=850, alt="ATW Studio portfolio")
