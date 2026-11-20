"""Standalone Streamlit host for the ATW Studio portfolio."""
from base64 import b64encode
from functools import lru_cache
from pathlib import Path
import re

import streamlit as st

ASSETS = Path(__file__).with_name("dist")


@lru_cache(maxsize=2)
def portfolio_html():
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
    page = page.replace('href="emirati/"', 'href="/?experience=emirati" target="_blank" rel="noopener noreferrer"')
    page = page.replace('"emirati/frames/orbit/000.webp"', '"' + watch_frame_url("orbit/000.webp") + '"')
    video = b64encode((ASSETS / "office-intro.mp4").read_bytes()).decode("ascii")
    page = page.replace('src="office-intro.mp4"', f'src="data:video/mp4;base64,{video}"')
    watch_page = (ASSETS / "emirati" / "index.html").read_text(encoding="utf-8")
    three, model, *_ = re.findall(r"<script>(.*?)</script>", watch_page, flags=re.S)
    preview_script = f"""
<script type="text/plain" id="watch-renderer">{three}
{model}</script>
<script>
const watchPreview = document.querySelector('.collection-watch');
const watchLoader = new IntersectionObserver(([entry]) => {{
  if (!entry.isIntersecting) return;
  watchLoader.disconnect();
  const program = document.createElement('script');
  program.textContent = document.getElementById('watch-renderer').textContent;
  document.body.append(program);
}});
watchLoader.observe(watchPreview);
</script>"""
    return page.replace("</body>", f"<script>{script}</script>{preview_script}</body>")


def watch_frame_url(path):
    data = (ASSETS / "emirati" / "frames" / path).read_bytes()
    return "data:image/webp;base64," + b64encode(data).decode("ascii")


@lru_cache(maxsize=1)
def emirati_html():
    page = (ASSETS / "emirati" / "index.html").read_text(encoding="utf-8")
    for name in ("athar-together.webp", "athar-sand.webp"):
        encoded = b64encode((ASSETS / "emirati" / name).read_bytes()).decode("ascii")
        page = page.replace(f'src="{name}"', f'src="data:image/webp;base64,{encoded}"')
    page = page.replace('<script src="sand.js"></script>', f'<script>{(ASSETS / "emirati" / "sand.js").read_text(encoding="utf-8")}</script>')
    return page.replace('href="../"', 'href="/" target="_blank" rel="noopener noreferrer"')


st.set_page_config(page_title="ATW Studio · Anjalo Theophine Wilson", layout="wide")
st.html("""
<style>
[data-testid="stMainBlockContainer"]{max-width:none;padding:0}
#MainMenu,[data-testid="stHeader"],[data-testid="stToolbar"],[data-testid="stFooter"]{display:none}
iframe[title="ATW Studio portfolio"]{display:block;width:100%;height:100dvh!important;border:0}
</style>
""")
page = emirati_html() if st.query_params.get("experience") == "emirati" else portfolio_html()
st.iframe(page, height=850, alt="ATW Studio portfolio")
