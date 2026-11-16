# TalkChief Phone for Odoo Online: an importable data module (no Python code).
# Built and published by odoo-app/build.sh; see odoo-app/README.md.
{
    "name": "TalkChief Phone",
    "version": "19.0.1.1.3",
    "category": "Productivity",
    "summary": "Call and answer with TalkChief from Odoo's top bar",
    "description": "Adds a TalkChief item to Odoo's top bar that shows the TalkChief calling panel (a TalkChief service), where agents sign in, make and answer calls. After the user opens it once, a phone number clicked in Odoo goes into the panel's dial pad. Nothing is stored in Odoo.",
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
