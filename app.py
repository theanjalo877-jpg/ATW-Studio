"""Standalone Streamlit host for the ATW Studio portfolio."""
from base64 import b64encode
from functools import lru_cache
from pathlib import Path
import re

import streamlit as st
from streamlit import runtime

ASSETS = Path(__file__).with_name("dist")


PORTFOLIO_VIDEOS = (
    "office-intro.mp4", "qame-film.mp4", "qame-store-film.mp4",
    "studio-closing.mp4", "fab-preview.mp4",
)


@lru_cache(maxsize=10)
def _video_bytes(path, _revision):
    return path.read_bytes()


def portfolio_video_urls(mobile):
    # Register for each Streamlit session so the media route stays available
    # for viewers who reach a film later. Only video uses HTTP; artwork is embedded.
    manager = runtime.get_instance().media_file_mgr
    urls = []
    for name in PORTFOLIO_VIDEOS:
        asset = ASSETS / ("qame-store-mobile.mp4" if mobile and name == "qame-store-film.mp4" else name)
        data = _video_bytes(asset, asset.stat().st_mtime_ns)
        urls.append((name, manager.add(data, "video/mp4", f"portfolio-video:{name}")))
    return tuple(urls)


def portfolio_html(mobile=False):
    # Streamlit may rerun this launcher without reloading the embedded files.
    assets = (*ASSETS.glob("*.*"), ASSETS / "meridian" / "index.html",
              ASSETS / "meridian" / "frames" / "orbit" / "000.webp")
    revision = tuple((path.name, path.stat().st_mtime_ns) for path in sorted(assets) if path.is_file())
    return _portfolio_html(portfolio_video_urls(mobile), revision)


@st.cache_data(max_entries=4, show_spinner=False)
def _portfolio_html(video_urls, revision):
    page = (ASSETS / "index.html").read_text(encoding="utf-8")
    styles = (ASSETS / "studio.css").read_text(encoding="utf-8")
    page = page.replace('<link rel="stylesheet" href="maison.css">', f"<style>{(ASSETS / 'maison.css').read_text(encoding='utf-8')}</style>")
    page = inline_maison_script(page, "maison.js")
    script = (ASSETS / "studio.js").read_text(encoding="utf-8")
    page = page.replace('<script src="studio.js" defer></script>', "")
    page = page.replace('<link rel="stylesheet" href="studio.css">', f"<style>{styles}</style>")

    def embed_image(match):
        name = match[1]
        encoded = b64encode((ASSETS / name).read_bytes()).decode("ascii")
        return f'"data:image/webp;base64,{encoded}"'

    page = re.sub(r'"([a-z0-9-]+\.webp)"', embed_image, page)
    page = page.replace('href="meridian/"', 'href="/?experience=meridian" target="_blank" rel="noopener noreferrer"')
    page = page.replace('"meridian/frames/orbit/000.webp"', '"' + watch_frame_url("orbit/000.webp") + '"')
    for name, url in video_urls:
        # srcdoc inherits the Streamlit document URL. Community Cloud serves
        # that document under /~/+/, so /media/... would bypass its app proxy.
        # Resolve default media paths relative to the embedding app instead.
        media_url = url[1:] if url.startswith("/media/") else url
        page = page.replace(f'src="{name}"', f'src="{media_url}"')
    watch_page = (ASSETS / "meridian" / "index.html").read_text(encoding="utf-8")
    three, model, *_ = re.findall(r"<script>(.*?)</script>", watch_page, flags=re.S)
    preview_script = f"""
<script type="text/plain" id="three-runtime">{three}</script>
<script type="text/plain" id="watch-renderer">{model}</script>
<script>
function loadPortfolioThree() {{
  if (window.THREE) return;
  const script = document.createElement('script');
  script.textContent = document.getElementById('three-runtime').textContent;
  document.body.append(script);
}}
const watchPreview = document.querySelector('.collection-watch');
const watchLoader = new IntersectionObserver(([entry]) => {{
  if (!entry.isIntersecting) return;
  watchLoader.disconnect();
  loadPortfolioThree();
  const program = document.createElement('script');
  program.textContent = document.getElementById('watch-renderer').textContent;
  document.body.append(program);
}});
watchLoader.observe(watchPreview);
</script>"""
    return page.replace("</body>", f"<script>{script}</script>{preview_script}</body>")


def inline_maison_script(page, url):
    script = (ASSETS / "maison.js").read_text(encoding="utf-8")
    return page.replace(f'<script src="{url}"></script>', f"<script>{script}</script>")


def watch_frame_url(path):
    data = (ASSETS / "meridian" / "frames" / path).read_bytes()
    return "data:image/webp;base64," + b64encode(data).decode("ascii")


def meridian_html():
    assets = ASSETS / "meridian"
    files = (ASSETS / "maison.css", ASSETS / "maison.js", *assets.glob("calderis-*.jpg"), *assets.glob("frames/*/poster.webp"),
             assets / "index.html", assets / "sand.js", assets / "editorial.css", assets / "editorial.js")
    revision = tuple((str(path), path.stat().st_mtime_ns) for path in sorted(files))
    return _meridian_html(revision)


@st.cache_data(max_entries=2, show_spinner=False)
def _meridian_html(revision):
    page = (ASSETS / "meridian" / "index.html").read_text(encoding="utf-8")
    page = page.replace('<link rel="stylesheet" href="../maison.css">', f"<style>{(ASSETS / 'maison.css').read_text(encoding='utf-8')}</style>")
    for name in ("calderis-together.jpg", "calderis-sand.jpg"):
        encoded = b64encode((ASSETS / "meridian" / name).read_bytes()).decode("ascii")
        page = page.replace(f'src="{name}"', f'src="data:image/jpeg;base64,{encoded}"')
    for chapter in ("orbit", "macro", "assembly"):
        path = f"{chapter}/poster.webp"
        page = page.replace(f'src="frames/{path}"', f'src="{watch_frame_url(path)}"')
    watch_assets = ASSETS / "meridian"
    page = page.replace('<link rel="stylesheet" href="editorial.css">',
                        f'<style>{(watch_assets / "editorial.css").read_text(encoding="utf-8")}</style>')
    for script in ("sand.js", "editorial.js"):
        page = page.replace(f'<script src="{script}"></script>',
                            f'<script>{(watch_assets / script).read_text(encoding="utf-8")}</script>')
    page = inline_maison_script(page, "../maison.js")
    return page.replace('href="../"', 'href="/" target="_blank" rel="noopener noreferrer"')


experience = st.query_params.get("experience")
is_watch = experience in {"meridian", "emirati"}
st.set_page_config(
    page_title="Meridian · L. Calderis · ATW Studio" if is_watch else "ATW Studio · Anjalo Theophine Wilson",
    layout="wide",
)
st.html("""
<style>
html,body,.stApp,[data-testid="stAppViewContainer"],[data-testid="stMain"],
[data-testid="stMainBlockContainer"],.st-key-portfolio_viewport{
    background:#0b0e0c;
}
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
    background:#0b0e0c;
}
</style>
""")
if experience == "emirati":
    st.query_params["experience"] = "meridian"
user_agent = st.context.headers.get("User-Agent", "")
is_mobile = bool(re.search(r"Android|iPhone|iPad|iPod|Mobile", user_agent, re.I))
page = meridian_html() if is_watch else portfolio_html(mobile=is_mobile)
with st.container(key="portfolio_viewport"):
    st.iframe(page, height=850, alt="Meridian · L. Calderis" if is_watch else "ATW Studio portfolio")
