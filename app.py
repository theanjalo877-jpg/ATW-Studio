"""Standalone Streamlit host for the ATW Studio portfolio."""
from base64 import b64encode
from functools import lru_cache
from pathlib import Path
import re

import streamlit as st

ASSETS = Path(__file__).with_name("dist")


@lru_cache(maxsize=2)
def portfolio_html(mobile=False):
    page = (ASSETS / "index.html").read_text(encoding="utf-8")
    styles = (ASSETS / "studio.css").read_text(encoding="utf-8")
    script = (ASSETS / "studio.js").read_text(encoding="utf-8")
    page = page.replace('<script src="studio.js" defer></script>', "")
    page = page.replace('<link rel="stylesheet" href="studio.css">', f"<style>{styles}</style>")

    def embed_image(match):
        name = match[1]
        encoded = b64encode((ASSETS / name).read_bytes()).decode("ascii")
        return f'"data:image/webp;base64,{encoded}"'

    page = re.sub(r'"([a-z0-9-]+\.webp)"', embed_image, page)
    video_name = "depot-mobile.mp4" if mobile else "depot-intro.mp4"
    video = b64encode((ASSETS / video_name).read_bytes()).decode("ascii")
    page = page.replace('src="depot-intro.mp4"', f'src="data:video/mp4;base64,{video}"')
    return page.replace("</body>", f"<script>{script}</script></body>")


st.set_page_config(page_title="ATW Studio · Anjalo Theophine Wilson", layout="wide")
st.html("""
<style>
[data-testid="stMainBlockContainer"]{max-width:none;padding:0}
[data-testid="stHeader"]{display:none}
iframe[title="ATW Studio portfolio"]{display:block;width:100%;height:100dvh!important;border:0}
</style>
""")
user_agent = st.context.headers.get("User-Agent", "")
mobile = bool(re.search(r"Android|iPhone|iPad|iPod|Mobile", user_agent, re.I))
st.iframe(portfolio_html(mobile), height=850, alt="ATW Studio portfolio")
