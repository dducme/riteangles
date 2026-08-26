/* ==========================================================================
   K K Wagh Cubs — landing page behaviour
   1. capture UTM parameters (first touch wins, kept for the session)
   2. "Learn more" jumps to the form and preselects that programme
   3. submit the lead to the Apps Script endpoint, then go to the thank-you page
   ========================================================================== */
(function () {
  "use strict";

  // ---------------------------------------------------------------- config
  // Paste the /exec URL from your Apps Script deployment here.
  var ENDPOINT = "https://script.google.com/macros/s/AKfycby8GdBnv1DEFDnouS1IB4-eRdPSC2HddX6MG_0h0ZsvBwxOK9rwkBap5Ek2oGO2leOD/exec";
  var THANK_YOU = "thank-you.html";

  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var STORE_KEY = "kkw_utm";

  // ------------------------------------------------------------------ utm
  // First touch wins: if someone arrives from an ad and then clicks around,
  // the original campaign is what gets credited, not the last page they saw.
  function captureUtm() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = {};
    var found = false;

    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) { fromUrl[k] = v.slice(0, 200); found = true; }
    });

    var stored = {};
    try {
      stored = JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}");
    } catch (e) { stored = {}; }

    // only overwrite the stored set when this visit actually carries UTMs
    var utm = found ? fromUrl : stored;

    if (found) {
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify(utm)); } catch (e) {}
    }

    UTM_KEYS.forEach(function (k) {
      var field = document.getElementById(k);
      if (field) field.value = utm[k] || "";
    });

    return utm;
  }

  // ------------------------------------------------- learn more -> form
  function wireProgrammeLinks() {
    var select = document.getElementById("programme");

    document.querySelectorAll("[data-programme]").forEach(function (link) {
      link.addEventListener("click", function () {
        if (!select) return;
        var wanted = link.getAttribute("data-programme");
        for (var i = 0; i < select.options.length; i++) {
          if (select.options[i].value === wanted) {
            select.selectedIndex = i;
            break;
          }
        }
        // let the browser finish its jump to #enquiry before highlighting
        window.setTimeout(function () {
          var card = document.getElementById("enquiry");
          if (card) card.classList.add("is-flash");
          window.setTimeout(function () {
            if (card) card.classList.remove("is-flash");
          }, 1200);
        }, 400);
      });
    });
  }

  // --------------------------------------------------------------- submit
  function wireForm(utm) {
    var form = document.getElementById("lead-form");
    if (!form) return;

    var button = document.getElementById("lead-submit");
    var status = document.getElementById("form-status");
    var original = button ? button.textContent : "Book a Visit";

    function setStatus(message, kind) {
      if (!status) return;
      status.textContent = message || "";
      status.className = "form-status" + (kind ? " is-" + kind : "");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      // silently drop anything that filled the honeypot
      if (form.company && form.company.value) return;

      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus("Please fill in every field above.", "error");
        return;
      }

      if (ENDPOINT.indexOf("PASTE_YOUR") === 0) {
        setStatus("Form endpoint isn't configured yet — see README.", "error");
        return;
      }

      var payload = {
        parent:    form.parent.value.trim(),
        mobile:    form.mobile.value.trim(),
        email:     form.email.value.trim(),
        child:     form.child.value.trim(),
        age:       form.age.value.trim(),
        programme: form.programme.value,
        page_url:  window.location.href,
        referrer:  document.referrer || ""
      };
      UTM_KEYS.forEach(function (k) { payload[k] = (utm && utm[k]) || ""; });

      if (button) { button.disabled = true; button.textContent = "Sending…"; }
      setStatus("");

      // text/plain keeps this a "simple" request, so the browser skips the
      // CORS preflight that Apps Script can't answer.
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json().catch(function () { return { ok: true }; }); })
        .then(function (data) {
          if (data && data.ok === false) throw new Error(data.error || "Server error");
          window.location.href = THANK_YOU;
        })
        .catch(function (err) {
          if (button) { button.disabled = false; button.textContent = original; }
          setStatus(
            "Sorry, something went wrong. Please call us on +91 96070 09871 or try again.",
            "error"
          );
          if (window.console) console.error("Lead submit failed:", err);
        });
    });
  }

  // ----------------------------------------------------------------- init
  function init() {
    var utm = captureUtm();
    wireProgrammeLinks();
    wireForm(utm);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
