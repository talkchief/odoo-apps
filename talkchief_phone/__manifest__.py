# TalkChief Phone for Odoo Online: an importable data module (no Python code).
# Published through odoo-app/publish-mirror.sh; see odoo-app/README.md.
# No "description" key: Odoo then shows static/description/index.html (the branded
# page with the images) in its Apps screen, as on apps.odoo.com.
{
    "name": "TalkChief Phone",
    "version": "19.0.1.1.6",
    "category": "Productivity",
    "summary": "Call and answer with TalkChief from Odoo's top bar",
    "author": "TalkChief",
    "website": "https://talkchief.io",
    "license": "OPL-1",
    "support": "support@talkchief.io",
    "images": ["static/description/cover.png"],
    "depends": ["web"],
    "data": [],
    "assets": {
        "web.assets_backend": [
            "talkchief_phone/static/src/talkchief_phone.js",
        ],
    },
    "installable": True,
    "application": False,
}
