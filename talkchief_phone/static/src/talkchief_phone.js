/** @odoo-module **/
/*
 * TalkChief Phone for Odoo Online (18.0, 19.0, 20.0): a TalkChief item in
 * Odoo's top bar that shows the TalkChief calling panel in an iframe
 * (https://app.talkchief.io/crm-dialer/odoo, allow="microphone; autoplay").
 * The panel is TalkChief's own page: the agent signs in there, and calls
 * ring and are placed there. This file keeps no TalkChief credential and
 * stores nothing in Odoo.
 *
 * - Click-to-dial: the Call button next to a phone number (Odoo 20's
 *   "phone_call_handlers") and tel: links (Odoo 18 and 19) put the number in
 *   the panel's dial pad; the agent clicks Call there. Nothing here places a
 *   call.
 * - From the panel this page accepts only: "show" (show the panel) and
 *   "open" (open a lead or contact form by model and id), and only from the
 *   panel's own frame at https://app.talkchief.io.
 * - The panel checks this page's origin against the Odoo database its
 *   TalkChief company is connected to and refuses to work anywhere else.
 * - Opt-in: nothing loads from TalkChief and no number goes anywhere until
 *   the user clicks the TalkChief item once (remembered in this browser as
 *   OPT_IN_KEY). From then on the panel loads, hidden, with Odoo so incoming
 *   calls reach it, and clicked numbers go to it.
 */
import { Component, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const TALKCHIEF = "https://app.talkchief.io";
const PANEL_URL = TALKCHIEF + "/crm-dialer/odoo";
const ODOO_SOURCE = "talkchief-odoo";
const PANEL_SOURCE = "talkchief-panel";
const NUMBER = /^[0-9+*#\s().-]{3,32}$/;
const RECORD_MODELS = ["crm.lead", "res.partner"];
/** Set when the user first opens TalkChief from the top bar (their opt-in, per browser). */
const OPT_IN_KEY = "talkchief_phone.enabled";

function optedIn() {
    try {
        return window.localStorage.getItem(OPT_IN_KEY) === "1";
    } catch {
        return false;
    }
}

function optIn() {
    try {
        window.localStorage.setItem(OPT_IN_KEY, "1");
    } catch {
        // Private mode: the panel still opens now, and on the next click.
    }
}

const panel = {
    root: null,
    frame: null,
    /** The panel said hello: it listens, so numbers go straight to it. */
    ready: false,
    /** A number clicked before the panel was listening (only the last one). */
    pending: null,
    action: null,
};

function cleanNumber(value) {
    const number = String(value || "").trim();
    return NUMBER.test(number) && number.replace(/\D/g, "").length >= 3 ? number : null;
}

function toPanel(message) {
    const win = panel.frame && panel.frame.contentWindow;
    if (win) {
        win.postMessage(message, TALKCHIEF);
    }
}

function ensurePanel() {
    if (panel.root) {
        return panel;
    }
    const root = document.createElement("div");
    root.className = "o_talkchief_panel";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "TalkChief");
    Object.assign(root.style, {
        position: "fixed",
        right: "16px",
        bottom: "16px",
        width: "360px",
        height: "640px",
        maxHeight: "calc(100vh - 72px)",
        zIndex: "1060",
        display: "none",
        flexDirection: "column",
        background: "#ffffff",
        border: "1px solid rgba(0, 0, 0, 0.12)",
        borderRadius: "12px",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
        overflow: "hidden",
    });

    const bar = document.createElement("div");
    Object.assign(bar.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 8px 6px 12px",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        font: "600 13px/1.4 system-ui, sans-serif",
    });
    const title = document.createElement("span");
    title.textContent = "TalkChief";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn btn-link btn-sm";
    close.setAttribute("aria-label", "Hide TalkChief");
    close.textContent = "×";
    close.addEventListener("click", () => setShown(false));
    bar.append(title, close);

    const frame = document.createElement("iframe");
    frame.src = PANEL_URL;
    frame.title = "TalkChief";
    // The browser phone needs the microphone; without it the panel offers its own window.
    frame.allow = "microphone; autoplay";
    Object.assign(frame.style, { flex: "1 1 auto", width: "100%", border: "0" });

    root.append(bar, frame);
    document.body.appendChild(root);
    panel.root = root;
    panel.frame = frame;
    return panel;
}

function setShown(shown) {
    ensurePanel().root.style.display = shown ? "flex" : "none";
}

function isShown() {
    return !!panel.root && panel.root.style.display !== "none";
}

/** Puts a number in the panel's dial pad (never a call). False when it is not a number, or before the opt-in. */
function prefill(value) {
    const number = cleanNumber(value);
    if (!number || !optedIn()) {
        return false;
    }
    setShown(true);
    if (panel.ready) {
        toPanel({ source: ODOO_SOURCE, type: "prefill", number });
    } else {
        panel.pending = number;
    }
    return true;
}

window.addEventListener("message", (event) => {
    // Only TalkChief's panel, in our own frame.
    if (event.origin !== TALKCHIEF || !panel.frame || event.source !== panel.frame.contentWindow) {
        return;
    }
    const m = event.data;
    if (!m || typeof m !== "object" || m.source !== PANEL_SOURCE) {
        return;
    }
    if (m.type === "hello" && m.version === 1) {
        panel.ready = true;
        toPanel({ source: ODOO_SOURCE, type: "hello", version: 1 });
        if (panel.pending) {
            const number = panel.pending;
            panel.pending = null;
            toPanel({ source: ODOO_SOURCE, type: "prefill", number });
        }
    } else if (m.type === "show") {
        setShown(true);
    } else if (m.type === "open" && RECORD_MODELS.includes(m.model) && Number.isSafeInteger(m.id) && m.id > 0 && panel.action) {
        panel.action.doAction({
            type: "ir.actions.act_window",
            res_model: m.model,
            res_id: m.id,
            views: [[false, "form"]],
            target: "current",
        });
    }
});

// Odoo 18 and 19 render phone numbers as tel: links: a plain click puts the number in the panel.
document.addEventListener(
    "click",
    (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }
        const link = event.target && event.target.closest ? event.target.closest('a[href^="tel:"]') : null;
        if (!link) {
            return;
        }
        let number = null;
        try {
            number = decodeURIComponent(link.getAttribute("href").slice(4));
        } catch {
            number = null;
        }
        if (prefill(number)) {
            event.preventDefault();
            event.stopPropagation();
        }
    },
    true
);

// Odoo 20: the Call button next to a phone number runs the first handler in this registry.
registry.category("phone_call_handlers").add(
    "talkchief_phone",
    {
        execute(env, params, options) {
            if (!prefill(params && params.phoneNumber) && options && options.fallback) {
                options.fallback();
            }
        },
    },
    { sequence: 5 }
);

class TalkChiefSystray extends Component {
    // Handlers as arrow functions on `this`: Odoo 20 runs OWL 3, where a bare method name in a
    // template is undefined; OWL 2 (Odoo 18 and 19) gives templates `this` too.
    static template = xml`
        <div class="o_nav_entry o_talkchief_systray" role="button" tabindex="0"
             title="TalkChief" aria-label="TalkChief" t-on-click="() => this.toggle()" t-on-keydown="(ev) => this.onKeydown(ev)">
            <img src="/talkchief_phone/static/description/icon.png" alt="" style="width: 18px; height: 18px;"/>
        </div>`;

    setup() {
        panel.action = useService("action");
        // After the opt-in the panel loads with Odoo, hidden: incoming calls reach it without a click first.
        if (optedIn()) {
            ensurePanel();
        }
    }

    toggle() {
        // The first click is the user's opt-in.
        optIn();
        setShown(!isShown());
    }

    onKeydown(ev) {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this.toggle();
        }
    }
}

registry.category("systray").add("talkchief_phone.systray", { Component: TalkChiefSystray }, { sequence: 5 });
