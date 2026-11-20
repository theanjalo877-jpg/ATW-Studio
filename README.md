# ATW Studio

Anjalo Theophine Wilson’s portfolio. The GitHub version includes a Streamlit launcher and standalone front-end files.

## Run locally

```sh
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

For Streamlit Community Cloud, select this repository, the `main` branch and `app.py`. The app needs no API keys. If the repository is private, the Streamlit account needs access to the repository.

Edit the portfolio in `dist/index.html`, its layout in `dist/studio.css`, and the intro timing in `dist/studio.js`. The contact links open the visitor’s email app or WhatsApp.

### Emirati motion study

Serve the static portfolio locally from the repository root:

```sh
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000/emirati/` for the launch, or open the portfolio root and choose **Explore Emirati**. The Streamlit entry point also supports `/?experience=emirati`. The private waitlist is a fictional demo that only saves interest locally in the browser.

The live watch scenes, styles, scripts and static fallback images are embedded in `dist/emirati/index.html`. The GPU renderer uses WebGL2 with a 4096px dial texture and adaptive resolution. Blender source for the static fallback is in `artwork/render_emirati.py`.
