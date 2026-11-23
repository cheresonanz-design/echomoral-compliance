/**
 * EchoMoral (by VeriTakt Collective) — B3 Client-Side Compliance Triage Engine
 * Deterministic EU AI Act, NIS2 & DORA readiness evaluator (100 % local in browser / Node.js).
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.EchoMoralCompliance = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const PROHIBITED_DOMAINS = new Set([
    "social_scoring",
    "emotion_workplace_edu",
    "subliminal_manipulation",
    "biometric_categorization_sensitive",
  ]);

  const HIGH_RISK_DOMAINS = new Set([
    "hr_recruiting",
    "credit_insurance",
    "biometric_id",
    "critical_infra",
    "education_vocational",
    "justice_law",
  ]);

  const TRANSPARENCY_DOMAINS = new Set(["chatbot_assistant", "synthetic_media"]);

  const NIS2_ESSENTIAL_SECTORS = new Set(["energy", "transport", "finance_banking", "health", "digital_infra", "ict_managed"]);
  const NIS2_IMPORTANT_SECTORS = new Set(["manufacturing", "postal_logistics", "food", "digital_providers"]);

  function evaluateCompliance(rawInput) {
    const inp = rawInput || {};
    const orgName = String(inp.org_name || "Unbenanntes Unternehmen").trim();
    const aiDomain = String(inp.ai_domain || "none").trim();
    const sector = String(inp.sector || "other").trim();
    const employees = Math.max(0, Number(inp.employees) || 0);
    const revenueMio = Math.max(0, Number(inp.revenue_mio_eur) || 0);
    const isFinancialOrIctToFinance = Boolean(inp.dora_in_scope) || sector === "finance_banking";

    const controls = inp.controls || {};
    const checks = [];
    const remediations = [];

    const addCheck = (id, framework, status, title, detail, fix = "") => {
      checks.push({ id, framework, status, title, detail });
      if (status !== "PASS" && fix) {
        remediations.push({ id, framework, severity: status, action: fix });
      }
    };

    // 1. EU AI Act Classification
    let aiRiskTier = "MINIMAL_RISK";
    if (aiDomain === "none") {
      aiRiskTier = "NO_AI_DEPLOYED";
      addCheck("AIA-01", "EU AI Act", "PASS", "KI-Einsatzklassifizierung", "Aktuell kein produktives KI-System angegeben.");
    } else if (PROHIBITED_DOMAINS.has(aiDomain)) {
      aiRiskTier = "PROHIBITED_ART_5";
      addCheck(
        "AIA-01",
        "EU AI Act",
        "FAIL",
        "Art. 5 Verbotene KI-Praktik erkannt",
        `Einsatzbereich '${aiDomain}' fällt unter verbotene KI-Praktiken (Art. 5 EU AI Act).`,
        "Sofortigen Produktionsstopp und Ersatz durch nicht-biometrisches/nicht-manipulatives Verfahren anordnen."
      );
    } else if (HIGH_RISK_DOMAINS.has(aiDomain)) {
      aiRiskTier = "HIGH_RISK_ANNEX_III";
      addCheck(
        "AIA-01",
        "EU AI Act",
        "WARN",
        "Hochrisiko-KI gemäß Art. 6 / Anhang III",
        `Anwendungsfall '${aiDomain}' unterliegt strengen Betreiber-/Anbieterpflichten (Human Oversight, Logging, DPIA).`,
        "Risikomanagement, menschliche Aufsicht (Human-in-the-Loop) und Protokollierung nach Anhang III dokumentieren."
      );
    } else if (TRANSPARENCY_DOMAINS.has(aiDomain)) {
      aiRiskTier = "LIMITED_RISK_ART_50";
      addCheck(
        "AIA-01",
        "EU AI Act",
        "WARN",
        "Transparenzpflicht nach Art. 50",
        "Nutzer müssen klar erkennen, dass sie mit KI interagieren bzw. synthetische Inhalte vorliegen.",
        "Sichtbaren KI-Hinweis (Chatbot / Deepfake / synthetisches Audio-Video) im UI & Footer verankern."
      );
    } else {
      addCheck("AIA-01", "EU AI Act", "PASS", "Minimales KI-Risiko", "Standard-B2B-Automatisierung ohne Anhang-III-Hochrisiko.");
    }

    // Art. 4 AI Literacy
    if (aiDomain !== "none") {
      if (controls.ai_literacy) {
        addCheck("AIA-04", "EU AI Act", "PASS", "Art. 4 AI-Literacy (KI-Kompetenz)", "Nachweisbare KI-Schulung für Mitarbeitende vorhanden.");
      } else {
        addCheck(
          "AIA-04",
          "EU AI Act",
          "FAIL",
          "Art. 4 AI-Literacy fehlt",
          "Seit 02.02.2025 müssen Unternehmen bei KI-Nutzung ausreichende KI-Kompetenz nachweisen.",
          "Kompakte AI-Literacy-Schulung + Teilnahmelog für alle KI-Nutzenden einführen."
        );
      }

      if (aiRiskTier === "HIGH_RISK_ANNEX_III" || TRANSPARENCY_DOMAINS.has(aiDomain)) {
        if (controls.ai_transparency_notice) {
          addCheck("AIA-50", "EU AI Act", "PASS", "Transparenz- & Betreiberhinweis", "Offenlegung gegenüber Betroffenen dokumentiert.");
        } else {
          addCheck(
            "AIA-50",
            "EU AI Act",
            "FAIL",
            "Fehlender Transparenz- oder Betreiberhinweis",
            "Pflichtinformation nach Art. 26 / Art. 50 für Betroffene noch nicht hinterlegt.",
            "Standard-Transparenztext in Produkt, Bewerber-/Kundenportal und Datenschutzhinweis aufnehmen."
          );
        }
      }

      if (aiRiskTier === "HIGH_RISK_ANNEX_III") {
        if (controls.human_oversight) {
          addCheck("AIA-14", "EU AI Act", "PASS", "Human Oversight (Art. 14 / Art. 26)", "Vier-Augen-Prinzip und Eingriffsmöglichkeit bestätigt.");
        } else {
          addCheck(
            "AIA-14",
            "EU AI Act",
            "FAIL",
            "Human Oversight nicht etabliert",
            "Hochrisiko-KI darf keine vollautomatischen Personal-, Kredit- oder Rechtsentscheidungen ohne Aufsicht treffen.",
            "Stopp-Button, Prüfschwelle und verantwortlichen AI Officer schriftlich festlegen."
          );
        }
      }
    }

    // 2. NIS2 Scope & Controls
    const exceedsMediumThreshold = employees >= 50 || revenueMio >= 10;
    let nis2Status = "OUT_OF_DIRECT_SCOPE";
    if (NIS2_ESSENTIAL_SECTORS.has(sector) && exceedsMediumThreshold) {
      nis2Status = "ESSENTIAL_ENTITY";
    } else if ((NIS2_IMPORTANT_SECTORS.has(sector) || NIS2_ESSENTIAL_SECTORS.has(sector)) && exceedsMediumThreshold) {
      nis2Status = "IMPORTANT_ENTITY";
    } else if (NIS2_ESSENTIAL_SECTORS.has(sector) || NIS2_IMPORTANT_SECTORS.has(sector)) {
      nis2Status = "SUPPLY_CHAIN_INDIRECT";
    }

    if (nis2Status === "ESSENTIAL_ENTITY" || nis2Status === "IMPORTANT_ENTITY") {
      addCheck(
        "NIS2-01",
        "NIS2",
        "WARN",
        `Direkt betroffen (${nis2Status === "ESSENTIAL_ENTITY" ? "Wesentliche Einrichtung" : "Wichtige Einrichtung"})`,
        `Sektor '${sector}' mit ${employees} MA / ${revenueMio} Mio. EUR Umsatz überschreitet KMU-Schwelle.`,
        "BSI-/CSIRT-Meldeprozess (24h Frühwarnung / 72h Bewertung / 1 Monat Abschlussbericht) & Risikomanagement (§ 30 BSIG) prüfen."
      );
      if (controls.incident_playbook_24h) {
        addCheck("NIS2-23", "NIS2", "PASS", "24h/72h Incident-Meldekette", "Notfall- und Melde-Playbook nach Art. 23 vorhanden.");
      } else {
        addCheck(
          "NIS2-23",
          "NIS2",
          "FAIL",
          "Kein 24h/72h Incident-Meldeplan",
          "Art. 23 NIS2 verlangt eine Erstmeldung binnen 24 Stunden bei erheblichen Sicherheitsvorfällen.",
          "Eskalationsplan (24h/72h), Notfallkontakte und Offline-Backup-Test etablieren."
        );
      }
    } else if (nis2Status === "SUPPLY_CHAIN_INDIRECT") {
      addCheck(
        "NIS2-01",
        "NIS2",
        "WARN",
        "Indirekt via Lieferketten-Nachweis betroffen",
        "Unterhalb Schwellenwert, aber Großkunden im Sektor fordern NIS2-Zulieferer-Nachweise.",
        "Standardisiertes Lieferanten-Sicherheitsblatt (MFA, Backups, Patch-Zyklus) bereithalten."
      );
    } else {
      addCheck("NIS2-01", "NIS2", "PASS", "NIS2-Schwellenwert nicht erreicht", "Aktuell keine direkte NIS2-Registrierungspflicht erkannt.");
    }

    if (controls.mfa_and_backups) {
      addCheck("SEC-01", "NIS2 / DORA", "PASS", "MFA & geprüfte Backups", "Basishygiene für Konten und Wiederherstellung aktiv.");
    } else {
      addCheck(
        "SEC-01",
        "NIS2 / DORA",
        "FAIL",
        "MFA oder getestete Backups fehlen",
        "Basisanforderung unter NIS2 Art. 21 & DORA Art. 9/12 nicht erfüllt.",
        "Phishing-resistente MFA (Admin/Finance) und regelmäßige Offline-Restore-Tests einführen."
      );
    }

    // 3. DORA
    let doraStatus = isFinancialOrIctToFinance ? "IN_SCOPE" : "OUT_OF_SCOPE";
    if (doraStatus === "IN_SCOPE") {
      addCheck(
        "DORA-01",
        "DORA",
        "WARN",
        "DORA-Anwendungsbereich aktiv (Finanz / krit. IKT-Drittanbieter)",
        "Seit 17.01.2025 verbindliche IKT-Risikosteuerung, Register aller IKT-Verträge & Exit-Strategien.",
        "IKT-Drittparteienregister, SLA-Klauseln (Art. 30) und Ausstiegspläne pflegen."
      );
      if (controls.ict_vendor_register) {
        addCheck("DORA-28", "DORA", "PASS", "IKT-Informationsregister & Exit-Klauseln", "Drittanbieter-Register gepflegt.");
      } else {
        addCheck(
          "DORA-28",
          "DORA",
          "FAIL",
          "IKT-Drittanbieter-Register unvollständig",
          "DORA Art. 28 verlangt lückenloses Informationsregister aller IKT-Dienstleister inkl. Subdienstleister.",
          "Alle SaaS-/Cloud-Dienstleister inkl. Ausstiegspfad im 4-Tab-Register dokumentieren."
        );
      }
    } else {
      addCheck("DORA-01", "DORA", "PASS", "Kein direkter DORA-Sektor", "Kein reguliertes Finanzunternehmen oder kritischer Finanz-IKT-Provider.");
    }

    const summary = {
      pass: checks.filter((c) => c.status === "PASS").length,
      warn: checks.filter((c) => c.status === "WARN").length,
      fail: checks.filter((c) => c.status === "FAIL").length,
    };
    const score = Math.round(((summary.pass + summary.warn * 0.5) / checks.length) * 100);

    return {
      ok: summary.fail === 0 && aiRiskTier !== "PROHIBITED_ART_5",
      org_name: orgName,
      ai_risk_tier: aiRiskTier,
      nis2_status: nis2Status,
      dora_status: doraStatus,
      readiness_score_percent: score,
      summary,
      checks,
      remediations,
    };
  }

  function formatAuditReportJson(res) {
    return JSON.stringify(
      {
        tool: "EchoMoral EU AI Act, NIS2 & DORA Readiness Triage",
        provider: "EchoMoral by VeriTakt Collective",
        evaluated_at: new Date().toISOString(),
        ...res,
      },
      null,
      2
    );
  }

  function formatAuditReportMarkdown(res) {
    const lines = [
      `# EchoMoral Governance Audit — ${res.org_name}`,
      ``,
      `- **Readiness Score:** **${res.readiness_score_percent} %** (PASS ${res.summary.pass} / WARN ${res.summary.warn} / FAIL ${res.summary.fail})`,
      `- **EU AI Act Stufe:** \`${res.ai_risk_tier}\``,
      `- **NIS2 Einordnung:** \`${res.nis2_status}\``,
      `- **DORA Status:** \`${res.dora_status}\``,
      ``,
      `## Prüfpunkte`,
      ``,
      `| ID | Rahmenwerk | Status | Thema | Befund |`,
      `| :--- | :--- | :--- | :--- | :--- |`,
    ];
    for (const c of res.checks) {
      lines.push(`| ${c.id} | ${c.framework} | **${c.status}** | ${c.title} | ${String(c.detail).replace(/\|/g, "/")} |`);
    }
    if (res.remediations.length) {
      lines.push(``);
      lines.push(`## Priorisierte Sofortmaßnahmen`);
      for (const r of res.remediations) {
        lines.push(`- **[${r.id} · ${r.framework} · ${r.severity}]** ${r.action}`);
      }
    }
    lines.push(``);
    lines.push(`*100 % client-seitig erstellt ohne Server-Upload via EchoMoral (by VeriTakt Collective).*`);
    return lines.join("\n");
  }

  const SAMPLES = {
    hr_high_risk: {
      org_name: "HanseTalent Recruiting GmbH",
      ai_domain: "hr_recruiting",
      sector: "ict_managed",
      employees: 65,
      revenue_mio_eur: 12,
      dora_in_scope: false,
      controls: {
        ai_literacy: false,
        ai_transparency_notice: false,
        human_oversight: false,
        incident_playbook_24h: false,
        mfa_and_backups: true,
        ict_vendor_register: false,
      },
    },
    chatbot_transparency: {
      org_name: "WeserOps Consulting GmbH",
      ai_domain: "chatbot_assistant",
      sector: "other",
      employees: 18,
      revenue_mio_eur: 2.8,
      dora_in_scope: false,
      controls: {
        ai_literacy: true,
        ai_transparency_notice: true,
        human_oversight: true,
        incident_playbook_24h: true,
        mfa_and_backups: true,
        ict_vendor_register: true,
      },
    },
    nis2_dora_vendor: {
      org_name: "FinCloud DACH Infrastructure AG",
      ai_domain: "credit_insurance",
      sector: "finance_banking",
      employees: 140,
      revenue_mio_eur: 28,
      dora_in_scope: true,
      controls: {
        ai_literacy: true,
        ai_transparency_notice: true,
        human_oversight: true,
        incident_playbook_24h: true,
        mfa_and_backups: true,
        ict_vendor_register: true,
      },
    },
  };

  return {
    evaluateCompliance,
    formatAuditReportJson,
    formatAuditReportMarkdown,
    SAMPLES,
  };
});
