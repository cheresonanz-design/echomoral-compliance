(function () {
  "use strict";

  const engine = window.EchoMoralCompliance;
  if (!engine) return;

  let lastResult = null;

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readFormPayload() {
    return {
      org_name: el("orgName").value,
      ai_domain: el("aiDomain").value,
      sector: el("sectorSelect").value,
      employees: Number(el("employeesInput").value || 0),
      revenue_mio_eur: Number(el("revenueInput").value || 0),
      dora_in_scope: Boolean(el("doraCheck").checked),
      controls: {
        ai_literacy: Boolean(el("ctrlLiteracy").checked),
        ai_transparency_notice: Boolean(el("ctrlTransparency").checked),
        human_oversight: Boolean(el("ctrlOversight").checked),
        incident_playbook_24h: Boolean(el("ctrlIncident").checked),
        mfa_and_backups: Boolean(el("ctrlMfa").checked),
        ict_vendor_register: Boolean(el("ctrlVendor").checked),
      },
    };
  }

  function applySample(sample) {
    el("orgName").value = sample.org_name;
    el("aiDomain").value = sample.ai_domain;
    el("sectorSelect").value = sample.sector;
    el("employeesInput").value = sample.employees;
    el("revenueInput").value = sample.revenue_mio_eur;
    el("doraCheck").checked = Boolean(sample.dora_in_scope);
    const c = sample.controls || {};
    el("ctrlLiteracy").checked = Boolean(c.ai_literacy);
    el("ctrlTransparency").checked = Boolean(c.ai_transparency_notice);
    el("ctrlOversight").checked = Boolean(c.human_oversight);
    el("ctrlIncident").checked = Boolean(c.incident_playbook_24h);
    el("ctrlMfa").checked = Boolean(c.mfa_and_backups);
    el("ctrlVendor").checked = Boolean(c.ict_vendor_register);
    runTriage();
  }

  function runTriage() {
    const res = engine.evaluateCompliance(readFormPayload());
    lastResult = res;
    el("resultCard").classList.remove("hidden");
    el("scoreKpi").textContent = `${res.readiness_score_percent} %`;
    el("aiTierKpi").textContent = res.ai_risk_tier;
    el("nis2Kpi").textContent = res.nis2_status;
    el("doraKpi").textContent = res.dora_status;
    el("resultHeadline").textContent = res.ok
      ? `${res.org_name}: Readiness im Plan (${res.readiness_score_percent} %)`
      : `${res.org_name}: Handlungsbedarf (${res.summary.fail} kritische Lücken)`;

    el("checksBody").innerHTML = res.checks
      .map((c) => {
        const cls = c.status === "PASS" ? "badge-pass" : c.status === "WARN" ? "badge-warn" : "badge-fail";
        return (
          `<tr>` +
          `<td><code>${escapeHtml(c.id)}</code></td>` +
          `<td><strong>${escapeHtml(c.framework)}</strong></td>` +
          `<td><span class="badge ${cls}">${escapeHtml(c.status)}</span></td>` +
          `<td><strong>${escapeHtml(c.title)}</strong><div class="muted">${escapeHtml(c.detail)}</div></td>` +
          `</tr>`
        );
      })
      .join("");

    const remList = el("remediationList");
    if (res.remediations.length) {
      remList.innerHTML = res.remediations
        .map((r) => `<li><strong>[${escapeHtml(r.id)} · ${escapeHtml(r.framework)}]</strong> ${escapeHtml(r.action)}</li>`)
        .join("");
    } else {
      remList.innerHTML = "<li>Keine offenen kritischen Maßnahmen erkannt.</li>";
    }
  }

  function init() {
    if (!el("runTriageBtn")) return;
    el("runTriageBtn").addEventListener("click", runTriage);
    el("sampleHrBtn").addEventListener("click", () => applySample(engine.SAMPLES.hr_high_risk));
    el("sampleBotBtn").addEventListener("click", () => applySample(engine.SAMPLES.chatbot_transparency));
    el("sampleDoraBtn").addEventListener("click", () => applySample(engine.SAMPLES.nis2_dora_vendor));

    el("copyMdBtn").addEventListener("click", async () => {
      if (!lastResult) return;
      const md = engine.formatAuditReportMarkdown(lastResult);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(md);
        el("copyMdBtn").textContent = "Protokoll kopiert!";
        setTimeout(() => (el("copyMdBtn").textContent = "Markdown-Protokoll kopieren"), 1800);
      }
    });

    el("dlJsonBtn").addEventListener("click", () => {
      if (!lastResult) return;
      const blob = new Blob([engine.formatAuditReportJson(lastResult)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "echomoral_compliance_audit.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    applySample(engine.SAMPLES.hr_high_risk);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
