# PO Project Coverage & Gap Analysis

**Document type:** Evidence-based Purchase Order compliance audit  
**Repository audited:** PMC Frontend (`pmc-portal`) — React/Vite SPA  
**PO source:** Two scanned pages of Purchase Order **PO/2526/00034** dated **17-11-25**  
**Vendor:** PLANETEYE FARM-AI LIMITED  
**Client context:** Shrikhande Consultant (Division **PMC100**, Project Code **PMC1001**)  
**Audit date:** 11 August 2026  
**Code changes:** None — analysis document only  

---

## 1. Executive Summary

This audit treats **both PO images** as the authoritative source of truth. Every meaningful requirement was extracted, given a unique **PO-ID**, and compared against the **existing frontend codebase** (and observable API/hosting configuration). Backend application source is **not** in this repository; backend evidence is limited to configured API URLs and frontend API clients.

**Honest headline** (strict statuses from §21 matrix)


| Category                  | Count  | Share of 72 PO IDs |
| ------------------------- | ------ | ------------------ |
| ✅ Fully Covered           | 4      | 5.6%               |
| 🟡 Partially Covered      | 18     | 25.0%              |
| ❌ Not Covered             | 7      | 9.7%               |
| 🔍 Needs Verification     | 43     | 59.7%              |
| **Total PO requirements** | **72** | **100%**           |



| Compliance view                      | Result    | Method                                                                                                                |
| ------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------- |
| **Software / Functional Compliance** | **44.6%** | Weighted over functional scored IDs (see §30). Full = 1, Partial = 0.5, Not Covered = 0. Needs Verification excluded. |
| **Overall PO Compliance (scored)**   | **44.8%** | Same weights over all non-🔍 IDs (29 scored). See §30.                                                                |


**Key gaps blocking PO module acceptance**

1. **Reminders** module — not implemented (only unused type flag).
2. **Email Integration** — not implemented (email fields ≠ integration).
3. **Project Templates** — not implemented.
4. **Project Tasks** — only partial (read/list + local milestones; no full task product).
5. **Formal training, warranty support, report submission, payment milestones, responsibilities** — largely documentation/process; **cannot be verified from this repo**.

**Conclusion preview:** The product is a **broad PMC operations portal** far beyond the seven named PO modules in depth (DPR, WPR, HSE, financial, correspondence, etc.), but it **does not yet satisfy several named PO modules** (Reminders, Email Integration, Project Templates) and **cannot prove commercial/acceptance/handover/warranty** from code alone.

---



## 2. Purchase Order Source & Scope



### 2.1 Document identity (from Page 1)


| Field                    | Value (as scanned)                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title                    | PURCHASE ORDER                                                                                                                                                |
| Vendor (To)              | PLANETEYE FARM-AI LIMITED                                                                                                                                     |
| Vendor address           | First Floor, MITCON Consultancy & Engineering Services Ltd Head Office, Kubera Chamber, J M Road, Sancheti Hospital, Shivaji Nagar, Pune, Maharashtra, 411005 |
| Vendor GSTIN             | 27AANCP9585H1ZK                                                                                                                                               |
| PO No.                   | PO/2526/00034                                                                                                                                                 |
| Date                     | 17-11-25                                                                                                                                                      |
| Client GSTIN (Our GSTIN) | 27AAACS8431L1Z2                                                                                                                                               |
| Division                 | PMC100                                                                                                                                                        |
| Project Code             | PMC1001                                                                                                                                                       |
| Line description         | ADV- Planeteye Farm AI ltd, Customized project management software                                                                                            |
| Qty / Rate / Amount      | 9,00,000.00 / 1.00 / 9,00,000.00                                                                                                                              |
| CGST                     | 9% → 81,000.00                                                                                                                                                |
| SGST                     | 9% → 81,000.00                                                                                                                                                |
| IGST                     | 0% → 0.00                                                                                                                                                     |




### 2.2 Explicit project scope (Page 1 §1)

Customized project management software tailored for **Shrikhande Consultant**, incorporating:

- Core project-management functionalities  
- **Email integration** feature

Intended to enhance:

- Project tracking  
- Team collaboration  
- Communication efficiency



### 2.3 Repository under audit


| Item            | Finding                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| Repo nature     | **Frontend-only** SPA (`pmc-portal`)                                             |
| Stack (actual)  | React 19, TypeScript, Vite 6, Axios, Recharts, ExcelJS                           |
| Backend in repo | **No** Django/Node server source                                                 |
| Default API     | `https://pms-backend-production-4438.up.railway.app/api` (`config/apiConfig.ts`) |
| Routing         | Hash-based tabs (`App.tsx`, `utils/appRouting.ts`)                               |


---



## 3. Complete PO Requirement Register

Every row below is a distinct requirement. Unrelated items were not merged. Multi-part sentences were split.


| ID    | PO Section                    | Original Requirement Meaning                                          | Clear Professional Interpretation                                                                                        |
| ----- | ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PO-01 | Header                        | PO No. PO/2526/00034                                                  | Contract reference identifier for all acceptance and billing.                                                            |
| PO-02 | Header                        | Date 17-11-25                                                         | Order date; timeline reckoning may use this with advance receipt.                                                        |
| PO-03 | Header                        | Vendor PLANETEYE FARM-AI LIMITED                                      | Supplier responsible for delivery under this PO.                                                                         |
| PO-04 | Header                        | Vendor GSTIN 27AANCP9585H1ZK                                          | Vendor tax identity for invoicing.                                                                                       |
| PO-05 | Header                        | Our GSTIN 27AAACS8431L1Z2                                             | Client tax identity for invoicing.                                                                                       |
| PO-06 | Header                        | Division PMC100                                                       | Client internal division coding.                                                                                         |
| PO-07 | Header                        | Project Code PMC1001                                                  | Client internal project coding.                                                                                          |
| PO-08 | Line item                     | ADV – Customized project management software                          | Commercial line for customized PM software delivery.                                                                     |
| PO-09 | Commercial                    | Amount Rs 9,00,000.00                                                 | Base contract/software value **explicitly stated**.                                                                      |
| PO-10 | Commercial                    | CGST 9% = 81,000.00                                                   | Central GST component **explicitly stated**.                                                                             |
| PO-11 | Commercial                    | SGST 9% = 81,000.00                                                   | State GST component **explicitly stated**.                                                                               |
| PO-12 | Commercial                    | IGST 0% = 0.00                                                        | Interstate GST not applicable on this line **explicitly stated**.                                                        |
| PO-13 | Commercial (calc)             | Total tax = 1,62,000.00                                               | **Calculated:** 81,000 + 81,000. Not printed as a single “total tax” cell on the scan but follows from stated CGST+SGST. |
| PO-14 | Commercial (calc)             | Grand total = 10,62,000.00                                            | **Calculated:** 9,00,000 + 1,62,000.                                                                                     |
| PO-15 | 1) Scope of Work              | Customized PM software for Shrikhande Consultant                      | Deliver a PMC/consultant-specific PM system, not a generic off-the-shelf tool.                                           |
| PO-16 | 1) Scope of Work              | Core project management functionalities                               | Provide core PM capabilities (planning, tracking, coordination).                                                         |
| PO-17 | 1) Scope of Work              | Email integration feature                                             | Integrate email for communication (send/receive/workflow), not merely store email addresses.                             |
| PO-18 | 1) Scope of Work              | Enhance project tracking                                              | Users can track project status/progress effectively.                                                                     |
| PO-19 | 1) Scope of Work              | Enhance team collaboration                                            | Multi-user/role collaboration on projects.                                                                               |
| PO-20 | 1) Scope of Work              | Enhance communication efficiency                                      | Improve operational communication among stakeholders.                                                                    |
| PO-21 | 2) Core Deliverables (i)      | Designing web-based customized PM software                            | UX/UI design of the web application.                                                                                     |
| PO-22 | 2) Core Deliverables (i)      | Developing web-based customized PM software                           | Implementation of the application.                                                                                       |
| PO-23 | 2) Core Deliverables (i)      | Deploying web-based customized PM software                            | Production deployment of the application.                                                                                |
| PO-24 | 2) Core Deliverables (i)      | With the agreed-upon modules                                          | All agreed functional modules must be included.                                                                          |
| PO-25 | 2) Core Deliverables (ii)     | Smooth email feature integration for internal communication           | Working email integration for internal communication.                                                                    |
| PO-26 | 2) Core Deliverables (iii)    | Providing deployment for Shrikhande Consultant team                   | Deploy so the client team can use the system.                                                                            |
| PO-27 | 2) Core Deliverables (iii)    | Necessary training for Shrikhande Consultant team                     | Formal training delivery to client team.                                                                                 |
| PO-28 | 2) Core Deliverables (iv)     | Post-launch support as per warranty terms                             | Support after go-live per warranty agreement.                                                                            |
| PO-29 | 3) Key Functional Modules (a) | Project Tracker                                                       | Dedicated project-tracking module/capability.                                                                            |
| PO-30 | 3) Key Functional Modules (b) | Dashboard                                                             | Dashboard module for overview/analytics.                                                                                 |
| PO-31 | 3) Key Functional Modules (c) | Reminders                                                             | Dedicated reminders capability (not generic alerts alone).                                                               |
| PO-32 | 3) Key Functional Modules (d) | Project Tasks                                                         | Project task management module.                                                                                          |
| PO-33 | 3) Key Functional Modules (e) | Email Integration                                                     | Email integration module.                                                                                                |
| PO-34 | 3) Key Functional Modules (f) | Project Templates                                                     | Reusable project templates module.                                                                                       |
| PO-35 | 3) Key Functional Modules (g) | Deployment                                                            | Deployment as a delivered capability/outcome.                                                                            |
| PO-36 | 4) Technology Stack           | Fronted (Frontend)                                                    | Frontend technology to be defined/delivered. **PO heading only — no tech names on scan.**                                |
| PO-37 | 4) Technology Stack           | Backend                                                               | Backend technology to be defined/delivered. **PO heading only.**                                                         |
| PO-38 | 4) Technology Stack           | Database                                                              | Database technology to be defined/delivered. **PO heading only.**                                                        |
| PO-39 | 4) Technology Stack           | Hosting                                                               | Hosting approach to be defined/delivered. **PO heading only.**                                                           |
| PO-40 | 4) Planning                   | Hosting & Deployment plan                                             | Documented hosting & deployment plan. **PO heading only — no plan text on scan.**                                        |
| PO-41 | 4) Planning                   | Integration Requirement                                               | Integration requirements specification. **PO heading only.**                                                             |
| PO-42 | 4) Planning                   | User Requirements                                                     | User requirements specification. **PO heading only.**                                                                    |
| PO-43 | 4) Planning                   | Inclusion and Exclusions                                              | Explicit inclusions/exclusions. **PO heading only.**                                                                     |
| PO-44 | 5) Responsibilities           | Client Responsibilities                                               | Client duty list. **Heading only on scan — no bullet details.**                                                          |
| PO-45 | 5) Responsibilities           | Planeteye Responsibilities                                            | Vendor duty list. **Heading only on scan — no bullet details.**                                                          |
| PO-46 | 6) Acceptance Criteria        | Development Fee                                                       | Development fee as acceptance/commercial criterion. **Heading; amount tied to PO-09.**                                   |
| PO-47 | 6) Terms of Payment (i)       | 80% of contract value + 18% GST as advance along with order           | Advance payment structure.                                                                                               |
| PO-48 | 6) Terms of Payment (ii)      | Balance 20% + 18% GST against submission of final software            | Final payment on software submission.                                                                                    |
| PO-49 | 6) Terms of Payment (iii)     | Payment Term release as per bill amount                               | Payments released per billed amounts.                                                                                    |
| PO-50 | 6) Payment Milestones         | Project Kick off — 10%                                                | Kick-off milestone billing at 10%.                                                                                       |
| PO-51 | 6) Payment Milestones         | Deployment — 30%                                                      | Deployment milestone billing at 30%.                                                                                     |
| PO-52 | 6) Payment Milestones         | MVP — 30%                                                             | MVP milestone billing at 30%.                                                                                            |
| PO-53 | 6) Payment Milestones         | Softwre handover — 30%                                                | Software handover milestone billing at 30%.                                                                              |
| PO-54 | 7) Time Frame                 | 7 to 9 weeks to carry out assignment                                  | Overall delivery window 7–9 weeks.                                                                                       |
| PO-55 | 7) Time Frame                 | Reckoned from receipt of order along with advance, whichever is later | Timeline start rule.                                                                                                     |
| PO-56 | 7) Time Frame                 | Submission of report                                                  | Deliver a report as part of assignment.                                                                                  |
| PO-57 | 7) Phase i                    | Data acquisition & preprocessing (1–2 weeks)                          | Phase-1 duration and purpose.                                                                                            |
| PO-58 | 7) Phase i                    | Acquiring information and analyzing key control points                | Requirements/control-point analysis.                                                                                     |
| PO-59 | 7) Phase i                    | Ensuring data connectivity and clarity                                | Data connectivity/clarity work.                                                                                          |
| PO-60 | 7) Phase i                    | Dashboard design planning                                             | Plan dashboard design.                                                                                                   |
| PO-61 | 7) Phase ii                   | Software development                                                  | Full development phase.                                                                                                  |
| PO-62 | 7) Phase ii                   | Level-wise software development                                       | Incremental/level-wise build.                                                                                            |
| PO-63 | 7) Phase ii                   | Backend development                                                   | Backend implementation.                                                                                                  |
| PO-64 | 7) Phase ii                   | Frontend development                                                  | Frontend implementation.                                                                                                 |
| PO-65 | 7) Phase ii                   | UX finalization                                                       | Finalize UX.                                                                                                             |
| PO-66 | 7) Phase ii                   | UI finalization                                                       | Finalize UI.                                                                                                             |
| PO-67 | 7) Phase iii                  | Onboarding and testing                                                | Onboarding + testing phase.                                                                                              |
| PO-68 | 7) Phase iii                  | Making project live                                                   | Production go-live.                                                                                                      |
| PO-69 | 7) Phase iii                  | Sample onboarding                                                     | Sample user/project onboarding.                                                                                          |
| PO-70 | 8) GST                        | GST on professional services present rate 18%                         | Statutory GST rate 18%.                                                                                                  |
| PO-71 | 8) GST                        | Variation thereto payable over and above fees                         | GST changes payable extra.                                                                                               |
| PO-72 | Closing note                  | Agreement herewith attached file for your referrances                 | Separate agreement attachment referenced.                                                                                |




**Note on headings without detail:** For PO-36–PO-45 and PO-40–PO-43, the PO **provides the heading but does not specify detailed requirements** on the scanned pages. Status is therefore primarily 🔍 unless the heading itself implies a deliverable that is clearly present/absent.

---



## 4. Project Scope Coverage


| Objective                                       | Status               | Evidence / Gap                                                                                                               |
| ----------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Customized PM for Shrikhande Consultant (PO-15) | 🟡 PARTIALLY COVERED | Large PMC portal (`Projects.tsx`, role-based workflows). Not all PO modules complete.                                        |
| Core PM functionalities (PO-16)                 | 🟡 PARTIALLY COVERED | Projects, scopes, DPR/WPR, financial, HSE, drawings, meetings exist — but Reminders / Email Integration / Templates missing. |
| Email integration (PO-17)                       | ❌ NOT COVERED        | No SMTP/SendGrid/mail client; only email profile fields.                                                                     |
| Project tracking (PO-18)                        | ✅ COVERED            | Portfolio, project details, progress metrics, executive dashboards.                                                          |
| Team collaboration (PO-19)                      | ✅ COVERED            | Multi-role auth (`UserRole`, `AuthContext`, Team Lead / Site Engineer / PMC Head flows).                                     |
| Communication efficiency (PO-20)                | 🟡 PARTIALLY COVERED | Correspondence, meetings, alerts, websocket notifications exist; **not** PO email integration.                               |


---



## 5. Core Deliverables Coverage


| Deliverable                                 | PO ID | Status                | Evidence / Missing                                                                                                               |
| ------------------------------------------- | ----- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Designing web-based customized PM software  | PO-21 | 🟡 PARTIALLY COVERED  | Extensive UI in `components/`; UX “finalization” not formally signed off in repo.                                                |
| Developing web-based customized PM software | PO-22 | 🟡 PARTIALLY COVERED  | Large SPA implemented; agreed modules incomplete (PO-31, PO-33, PO-34).                                                          |
| Deploying web-based customized PM software  | PO-23 | 🔍 NEEDS VERIFICATION | Host configs exist (`vercel.json`, `render.yaml`, Railway API URL). Formal client go-live acceptance not in repo.                |
| Agreed-upon modules                         | PO-24 | ❌ NOT COVERED         | Cannot mark covered while Reminders, Email Integration, Project Templates missing.                                               |
| Smooth email feature integration            | PO-25 | ❌ NOT COVERED         | No email integration implementation found.                                                                                       |
| Deployment for client team                  | PO-26 | 🔍 NEEDS VERIFICATION | Production API URL suggests a live backend; client deployment acceptance docs not in repo.                                       |
| Necessary training                          | PO-27 | 🟡 PARTIALLY COVERED  | Tutorial videos (`components/tutorialVideos/*`) exist; **tutorial videos ≠ formal training** unless client accepts them as such. |
| Post-launch support per warranty            | PO-28 | 🔍 NEEDS VERIFICATION | No warranty terms or support SLA found in repo.                                                                                  |


---



## 6. Functional Module Coverage


| Module            | PO ID | Status               | Strict comparison note                                                                       | Evidence                                                                                                    |
| ----------------- | ----- | -------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Project Tracker   | PO-29 | 🟡 PARTIALLY COVERED | Project portfolio/details ≠ a product named “Project Tracker,” but tracking workflows exist. | `components/Projects.tsx`, `ProjectDetails.tsx`, `stores/projectStore.ts`, `services/api.ts` (`projectApi`) |
| Dashboard         | PO-30 | ✅ COVERED            | Multiple dashboards.                                                                         | `Dashboard.tsx`, `PMCHead360Dashboard.tsx`, `SiteEngineerDashboard.tsx`, `pmcHead/*`, DPR/WPR dashboards    |
| Reminders         | PO-31 | ❌ NOT COVERED        | Alerts ≠ Reminders.                                                                          | Only unused `hasReminderAlerts?: boolean` in `types.ts`                                                     |
| Project Tasks     | PO-32 | 🟡 PARTIALLY COVERED | Site task list / milestones ≠ full task module.                                              | `operationsApi.getTasks`, `ProjectDetails.tsx` Site Execution; `App.tsx` `handleAddTask` is local-only      |
| Email Integration | PO-33 | ❌ NOT COVERED        | Email field ≠ Email Integration.                                                             | No smtp/sendgrid/mail service                                                                               |
| Project Templates | PO-34 | ❌ NOT COVERED        | Project creation ≠ templates.                                                                | No template create/use feature found                                                                        |
| Deployment        | PO-35 | 🟡 PARTIALLY COVERED | Source + host configs ≠ completed formal Deployment milestone.                               | `vercel.json`, `render.yaml`, `public/staticwebapp.config.json`, Railway API                                |


---



## 7. Technology Stack Coverage

**PO provides Technology Stack headings but does not name technologies on the scan.**


| Area     | PO ID | Technology actually used (this repo)                                                          | Where configured                             | Functional?                       | Status vs PO                                                             |
| -------- | ----- | --------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| Frontend | PO-36 | React 19 + TypeScript + Vite 6                                                                | `package.json`, `vite.config.ts`             | Yes (SPA builds/runs)             | 🟡 PARTIALLY COVERED — implemented, but PO did not specify required tech |
| Backend  | PO-37 | Remote API (Django-style endpoints inferred from `/api` surface); **source not in this repo** | `config/apiConfig.ts`, `services/api.ts`     | API calls used throughout UI      | 🔍 NEEDS VERIFICATION — backend code/ownership not auditable here        |
| Database | PO-38 | Not present in frontend repo                                                                  | N/A in this repo                             | Unknown from FE alone             | 🔍 NEEDS VERIFICATION                                                    |
| Hosting  | PO-39 | FE: Vercel/Render/Azure/IIS static configs; BE: Railway URL default                           | `vercel.json`, `render.yaml`, `apiConfig.ts` | Suggests production API reachable | 🔍 NEEDS VERIFICATION for formal hosting acceptance                      |


---



## 8. Hosting & Deployment Coverage


| Item                      | PO ID               | Status                                    | Evidence                                                                               | Gap                                              |
| ------------------------- | ------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Hosting & Deployment plan | PO-40               | ❌ NOT COVERED                             | No dedicated plan document in repo                                                     | Write and approve Hosting & Deployment Plan      |
| Deployable SPA configs    | (supports PO-23/35) | 🟡 PARTIALLY COVERED                      | `vercel.json`, `render.yaml`, `public/web.config`, `public/_redirects`, `.env.example` | Formal client environment + DNS + SSL acceptance |
| Backend hosting           | (supports PO-37/39) | 🔍 NEEDS VERIFICATION                     | Default Railway URL in `config/apiConfig.ts`                                           | Confirm contract hosting, env ownership, uptime  |
| CI/CD                     | —                   | ❌ NOT COVERED (relative to mature deploy) | No `.github/workflows`, no Dockerfile                                                  | Optional for PO unless agreed                    |


---



## 9. Integration Requirement Coverage


| Item                                   | PO ID               | Status                | Notes                                                                                                          |
| -------------------------------------- | ------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Integration Requirement (heading)      | PO-41               | 🔍 NEEDS VERIFICATION | **PO provides the heading but does not specify detailed requirements.**                                        |
| Email integration (explicit elsewhere) | PO-17, PO-25, PO-33 | ❌ NOT COVERED         | Explicit elsewhere; still missing.                                                                             |
| Other integrations in product          | —                   | N/A                   | WebSocket alerts, S3/file URLs, tutorial videos API exist — **not listed as PO Integration Requirement text**. |


---



## 10. User Requirement Coverage


| Item                                      | PO ID | Status                | Notes                                                                                                           |
| ----------------------------------------- | ----- | --------------------- | --------------------------------------------------------------------------------------------------------------- |
| User Requirements (heading)               | PO-42 | 🔍 NEEDS VERIFICATION | **PO provides the heading but does not specify detailed requirements.**                                         |
| Implemented role model (extra vs PO text) | —     | Evidence only         | Roles in `types.ts` / `AuthContext.tsx` / `utils/roleRouting.ts` — cannot map to unstated PO user requirements. |


---



## 11. Responsibilities


| Item                       | PO ID | Status                | Notes                                                                                      |
| -------------------------- | ----- | --------------------- | ------------------------------------------------------------------------------------------ |
| Client Responsibilities    | PO-44 | 🔍 NEEDS VERIFICATION | Heading only on PO scan; no detailed bullets. No matching responsibility register in repo. |
| Planeteye Responsibilities | PO-45 | 🔍 NEEDS VERIFICATION | Heading only on PO scan; no matching responsibility register in repo.                      |
| Referenced Agreement       | PO-72 | 🔍 NEEDS VERIFICATION | PO says agreement attached; attachment not in this frontend repo.                          |


**Do not assume** responsibilities are fulfilled because software exists.

---



## 12. Acceptance Criteria



### 12.1 Development Fee & payment terms


| Milestone / Term              | PO Requirement                               | Current Evidence                   | Status | Remaining Work                      |
| ----------------------------- | -------------------------------------------- | ---------------------------------- | ------ | ----------------------------------- |
| Development Fee (PO-46)       | Fee for development (tied to ₹9,00,000 base) | Line amount on PO scan             | 🔍     | Confirm invoicing against PO        |
| Advance (PO-47)               | 80% + 18% GST with order                     | Not in codebase                    | 🔍     | Finance evidence of advance receipt |
| Balance (PO-48)               | 20% + 18% GST on final software submission   | Not in codebase                    | 🔍     | Final submission + invoice          |
| Bill release (PO-49)          | Release as per bill amount                   | Not in codebase                    | 🔍     | Billing process docs                |
| Kick-off 10% (PO-50)          | Project Kick off — 10%                       | Not in codebase                    | 🔍     | Milestone certificate / invoice     |
| Deployment 30% (PO-51)        | Deployment — 30%                             | Partial host evidence only         | 🔍     | Formal deployment acceptance        |
| MVP 30% (PO-52)               | MVP — 30%                                    | No MVP definition/sign-off in repo | 🔍     | Define MVP vs PO modules + accept   |
| Software handover 30% (PO-53) | Softwre handover — 30%                       | No handover checklist in repo      | 🔍     | Handover pack + acceptance          |




### 12.2 Calculated commercial amounts (for clarity)


| Item                                 | Amount (₹)  | Basis                                       |
| ------------------------------------ | ----------- | ------------------------------------------- |
| Contract value (explicit)            | 9,00,000.00 | PO line amount                              |
| Advance 80% (calculated)             | 7,20,000.00 | 80% × 9,00,000                              |
| Advance GST 18% (calculated)         | 1,29,600.00 | 18% × 7,20,000                              |
| Advance total incl. GST (calculated) | 8,49,600.00 | 7,20,000 + 1,29,600                         |
| Balance 20% (calculated)             | 1,80,000.00 | 20% × 9,00,000                              |
| Balance GST 18% (calculated)         | 32,400.00   | 18% × 1,80,000                              |
| Balance total incl. GST (calculated) | 2,12,400.00 | 1,80,000 + 32,400                           |
| Kick-off 10% (calculated)            | 90,000.00   | 10% × 9,00,000 (+ GST separately if billed) |
| Deployment 30% (calculated)          | 2,70,000.00 | 30% × 9,00,000                              |
| MVP 30% (calculated)                 | 2,70,000.00 | 30% × 9,00,000                              |
| Handover 30% (calculated)            | 2,70,000.00 | 30% × 9,00,000                              |


**Important:** The PO lists **both** an 80/20 payment split **and** 10/30/30/30 milestones. How these reconcile operationally is **not explained on the scan** → 🔍 NEEDS VERIFICATION with finance/contract.

---



## 13. Commercial & Payment Terms


| ID          | Requirement          | Status | Notes                                         |
| ----------- | -------------------- | ------ | --------------------------------------------- |
| PO-09       | ₹9,00,000 base       | 🔍     | Explicit on PO; payment proof not in repo     |
| PO-47–PO-53 | Payment structure    | 🔍     | Commercial; not verifiable from frontend code |
| PO-01–PO-08 | PO identity / coding | 🔍     | Administrative; keep on invoices              |


---



## 14. GST / Tax Requirements


| ID    | Requirement                           | Explicit / Calculated | Status                            |
| ----- | ------------------------------------- | --------------------- | --------------------------------- |
| PO-10 | CGST 9% = ₹81,000                     | Explicit              | 🔍 NEEDS VERIFICATION (invoicing) |
| PO-11 | SGST 9% = ₹81,000                     | Explicit              | 🔍 NEEDS VERIFICATION             |
| PO-12 | IGST 0%                               | Explicit              | 🔍 NEEDS VERIFICATION             |
| PO-13 | Total tax ₹1,62,000                   | Calculated            | 🔍                                |
| PO-14 | Grand total ₹10,62,000                | Calculated            | 🔍                                |
| PO-70 | GST rate 18% on professional services | Explicit (Page 2)     | 🔍                                |
| PO-71 | GST variation payable over and above  | Explicit              | 🔍                                |


**Note:** Page 1 shows CGST+SGST at 9%+9% (=18%). Page 2 restates 18% GST. Consistent with combined GST. Payment proofs are outside this repository.

---



## 15. Timeline & Development Phases


| ID          | Requirement                                           | Status                | Notes                                                                                                    |
| ----------- | ----------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| PO-54       | 7–9 weeks overall                                     | 🔍 NEEDS VERIFICATION | Need order+advance dates vs actual delivery dates                                                        |
| PO-55       | Start = order receipt **or** advance, whichever later | 🔍                    | Process/evidence outside code                                                                            |
| PO-56       | Submission of report                                  | 🟡 PARTIALLY COVERED  | `ReportGenerator.tsx` can produce printable reports; **PO “assignment report” submission** not evidenced |
| PO-57–PO-69 | Phased plan                                           | Mixed                 | See §§16–18                                                                                              |


---



## 16. Data Acquisition & Preprocessing


| ID    | Requirement                           | Status               | Evidence / Gap                                                               |
| ----- | ------------------------------------- | -------------------- | ---------------------------------------------------------------------------- |
| PO-57 | Phase 1–2 weeks                       | 🔍                   | Schedule evidence not in repo                                                |
| PO-58 | Acquire info / analyze control points | 🔍                   | No phase artifact in repo                                                    |
| PO-59 | Data connectivity and clarity         | 🟡 PARTIALLY COVERED | Live API integration & caching utilities exist; “clarity” acceptance unknown |
| PO-60 | Dashboard design planning             | 🟡 PARTIALLY COVERED | Dashboards implemented; planning docs not found                              |


---



## 17. Software Development


| ID    | Requirement                | Status                | Evidence / Gap                                         |
| ----- | -------------------------- | --------------------- | ------------------------------------------------------ |
| PO-61 | Software development phase | 🟡 PARTIALLY COVERED  | Large feature set exists; PO modules incomplete        |
| PO-62 | Level-wise development     | 🟡 PARTIALLY COVERED  | Iterative feature growth evident; no formal level plan |
| PO-63 | Backend development        | 🔍 NEEDS VERIFICATION | Backend not in this repo; API used extensively         |
| PO-64 | Frontend development       | ✅ COVERED             | Full React SPA in this repository                      |
| PO-65 | UX finalization            | 🔍 NEEDS VERIFICATION | Needs client UX sign-off                               |
| PO-66 | UI finalization            | 🔍 NEEDS VERIFICATION | Needs client UI sign-off                               |


---



## 18. Onboarding, Testing & Go-Live


| ID    | Requirement            | Status                | Evidence / Gap                                                                          |
| ----- | ---------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| PO-67 | Onboarding and testing | 🟡 PARTIALLY COVERED  | `react-joyride` dependency; tutorial videos; limited automated test suite evidence      |
| PO-68 | Making project live    | 🔍 NEEDS VERIFICATION | Railway production API default suggests live system; formal go-live certificate missing |
| PO-69 | Sample onboarding      | 🟡 PARTIALLY COVERED  | Tutorial/watch flows; not documented sample onboarding acceptance                       |


---



## 19. Training & Warranty Support


| Item                                 | PO ID            | Status         | Distinction                                                                                                             |
| ------------------------------------ | ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Training materials / tutorial videos | (supports PO-27) | 🟡             | `components/tutorialVideos/*`, `services/tutorialVideosApi.ts` = **training material**, not proof of conducted training |
| Formal training for Shrikhande team  | PO-27            | 🔍 / 🟡        | Needs attendance/sign-off records                                                                                       |
| Deployment support                   | PO-26            | 🔍             | Needs ops evidence                                                                                                      |
| Post-launch support                  | PO-28            | 🔍             | Needs warranty text + support log                                                                                       |
| Warranty-term support                | PO-28            | ❌ / 🔍         | **No warranty document** found (`warranty` search = zero hits)                                                          |
| HSE “training” metrics               | —                | Not applicable | Health & Safety training KPIs are **not** PO software training                                                          |


---



## 20. Inclusion & Exclusion Analysis


| Item                     | PO ID | Status                | Notes                                                                   |
| ------------------------ | ----- | --------------------- | ----------------------------------------------------------------------- |
| Inclusion and Exclusions | PO-43 | 🔍 NEEDS VERIFICATION | **PO provides the heading but does not specify detailed requirements.** |


**Observed extras beyond named PO modules (not claimed as PO coverage):** correspondence, DPR/WPR, financial management, HSE, drawings, meeting documents, site photos, testing photos, planned vs actual, machinery, manpower, alerts, user management, AI executive helpers, feedback.

These extras **do not** substitute for missing Reminders / Email Integration / Project Templates.

---



## 21. Requirement-by-Requirement Coverage Matrix


| PO ID | PO Requirement                       | Current Implementation                      | Status | Evidence / File / Module                       | Missing Work                               |
| ----- | ------------------------------------ | ------------------------------------------- | ------ | ---------------------------------------------- | ------------------------------------------ |
| PO-01 | PO number                            | Not encoded in app                          | 🔍     | PO scan                                        | Keep on commercial docs                    |
| PO-02 | PO date                              | Not encoded in app                          | 🔍     | PO scan                                        | Timeline baseline evidence                 |
| PO-03 | Vendor identity                      | Not in app                                  | 🔍     | PO scan                                        | —                                          |
| PO-04 | Vendor GSTIN                         | Not in app                                  | 🔍     | PO scan                                        | Invoice alignment                          |
| PO-05 | Client GSTIN                         | Not in app                                  | 🔍     | PO scan                                        | Invoice alignment                          |
| PO-06 | Division PMC100                      | Not verified in app config                  | 🔍     | PO scan                                        | Confirm client coding usage                |
| PO-07 | Project Code PMC1001                 | Not verified in app config                  | 🔍     | PO scan                                        | Confirm client coding usage                |
| PO-08 | Customized PM software line          | Product exists as PMC portal                | 🟡     | Entire SPA                                     | Complete agreed modules                    |
| PO-09 | ₹9,00,000 value                      | Commercial                                  | 🔍     | PO scan                                        | Payment evidence                           |
| PO-10 | CGST 9% ₹81,000                      | Commercial                                  | 🔍     | PO scan                                        | Tax invoice                                |
| PO-11 | SGST 9% ₹81,000                      | Commercial                                  | 🔍     | PO scan                                        | Tax invoice                                |
| PO-12 | IGST 0%                              | Commercial                                  | 🔍     | PO scan                                        | Tax invoice                                |
| PO-13 | Total tax ₹1,62,000                  | Calculated                                  | 🔍     | Calc from PO-10/11                             | Confirm on invoice                         |
| PO-14 | Grand total ₹10,62,000               | Calculated                                  | 🔍     | Calc                                           | Confirm on invoice                         |
| PO-15 | Customized for Shrikhande Consultant | PMC portal tailored to consultant workflows | 🟡     | `Projects.tsx`, role workflows                 | Close module gaps                          |
| PO-16 | Core PM functionalities              | Broad PMC features                          | 🟡     | Many `components/*`                            | Fill PO module gaps                        |
| PO-17 | Email integration (scope)            | Email fields only                           | ❌      | `types.ts` User.email etc.                     | Build email integration                    |
| PO-18 | Project tracking                     | Strong tracking/analytics                   | ✅      | `Projects.tsx`, dashboards, progress utils     | —                                          |
| PO-19 | Team collaboration                   | Multi-role collaboration                    | ✅      | `AuthContext.tsx`, `roleRouting.ts`            | —                                          |
| PO-20 | Communication efficiency             | Correspondence/alerts/meetings              | 🟡     | Correspondence*, Alerts, Meetings              | Add email integration                      |
| PO-21 | Design web app                       | Extensive UI                                | 🟡     | `components/*`                                 | Formal design sign-off                     |
| PO-22 | Develop web app                      | Large SPA                                   | 🟡     | Repo root                                      | Complete PO modules                        |
| PO-23 | Deploy web app                       | Host configs + Railway API                  | 🔍     | `vercel.json`, `render.yaml`, `apiConfig.ts`   | Go-live acceptance                         |
| PO-24 | Agreed-upon modules                  | 4/7 solid/partial; 3 missing                | ❌      | §§6                                            | Reminders, Email, Templates + finish Tasks |
| PO-25 | Email feature integration            | Missing                                     | ❌      | No mail service                                | Implement + test email flows               |
| PO-26 | Deployment for client team           | Suggests live API                           | 🔍     | Railway URL                                    | Client deploy acceptance                   |
| PO-27 | Training                             | Tutorial videos only                        | 🟡     | `tutorialVideos/*`                             | Formal training + attendance               |
| PO-28 | Post-launch warranty support         | No warranty docs                            | 🔍     | Search found no warranty                       | Attach warranty + support process          |
| PO-29 | Project Tracker                      | Portfolio/details tracking                  | 🟡     | `Projects.tsx`, `ProjectDetails.tsx`           | Clarify/name module vs PO Tracker scope    |
| PO-30 | Dashboard                            | Multiple dashboards                         | ✅      | Dashboard components                           | —                                          |
| PO-31 | Reminders                            | Unused flag only                            | ❌      | `types.ts` `hasReminderAlerts`                 | Build Reminders module                     |
| PO-32 | Project Tasks                        | Partial read/list + local milestones        | 🟡     | `operationsApi.getTasks`, `ProjectDetails.tsx` | Full CRUD task module                      |
| PO-33 | Email Integration                    | Missing                                     | ❌      | —                                              | Email module                               |
| PO-34 | Project Templates                    | Missing                                     | ❌      | —                                              | Templates module                           |
| PO-35 | Deployment module/outcome            | Partial hosting setup                       | 🟡     | Host config files                              | Formal deployment milestone                |
| PO-36 | Frontend stack                       | React/TS/Vite                               | 🟡     | `package.json`                                 | Confirm against any hidden agreement stack |
| PO-37 | Backend stack                        | Remote API only                             | 🔍     | `apiConfig.ts`, `services/api.ts`              | Backend audit + stack confirmation         |
| PO-38 | Database                             | Not in FE repo                              | 🔍     | —                                              | DB tech + schema evidence                  |
| PO-39 | Hosting                              | FE configs + Railway BE URL                 | 🔍     | Host files + API URL                           | Hosting acceptance                         |
| PO-40 | Hosting & Deployment plan            | Missing document                            | ❌      | —                                              | Author plan doc                            |
| PO-41 | Integration Requirement              | Heading only                                | 🔍     | PO scan                                        | Obtain detailed reqs / mark N/A if none    |
| PO-42 | User Requirements                    | Heading only                                | 🔍     | PO scan                                        | Obtain detailed reqs                       |
| PO-43 | Inclusion and Exclusions             | Heading only                                | 🔍     | PO scan                                        | Obtain list                                |
| PO-44 | Client Responsibilities              | Heading only                                | 🔍     | PO scan                                        | Obtain + track                             |
| PO-45 | Planeteye Responsibilities           | Heading only                                | 🔍     | PO scan                                        | Obtain + track                             |
| PO-46 | Development Fee                      | Commercial                                  | 🔍     | PO-09                                          | Invoice alignment                          |
| PO-47 | 80% + 18% GST advance                | Commercial                                  | 🔍     | —                                              | Payment proof                              |
| PO-48 | 20% + 18% GST final                  | Commercial                                  | 🔍     | —                                              | Final software submission proof            |
| PO-49 | Release as per bill                  | Commercial                                  | 🔍     | —                                              | Billing process                            |
| PO-50 | Kick-off 10%                         | Commercial                                  | 🔍     | —                                              | Milestone evidence                         |
| PO-51 | Deployment 30%                       | Commercial + partial tech                   | 🔍     | Host configs                                   | Acceptance certificate                     |
| PO-52 | MVP 30%                              | No MVP definition                           | 🔍     | —                                              | Define & accept MVP                        |
| PO-53 | Software handover 30%                | No handover pack                            | 🔍     | —                                              | Handover checklist + delivery              |
| PO-54 | 7–9 weeks                            | Schedule                                    | 🔍     | —                                              | Actual dates vs PO                         |
| PO-55 | Timeline start rule                  | Process                                     | 🔍     | —                                              | Order+advance dates                        |
| PO-56 | Report submission                    | Report generator exists                     | 🟡     | `ReportGenerator.tsx`                          | Submit formal assignment report            |
| PO-57 | Phase i 1–2 weeks                    | Process                                     | 🔍     | —                                              | Phase evidence                             |
| PO-58 | Control points analysis              | Process                                     | 🔍     | —                                              | Analysis artifact                          |
| PO-59 | Data connectivity/clarity            | API connectivity present                    | 🟡     | `services/api.ts`, caches                      | Clarity acceptance                         |
| PO-60 | Dashboard design planning            | Dashboards built                            | 🟡     | Dashboard components                           | Planning artifact if required              |
| PO-61 | Software development                 | Ongoing/large                               | 🟡     | Repo                                           | Close gaps                                 |
| PO-62 | Level-wise development               | Iterative features                          | 🟡     | Feature history (external)                     | Document levels                            |
| PO-63 | Backend development                  | Outside repo                                | 🔍     | API usage                                      | Backend repo audit                         |
| PO-64 | Frontend development                 | Implemented                                 | ✅      | This repository                                | —                                          |
| PO-65 | UX finalization                      | Needs sign-off                              | 🔍     | UI exists                                      | Client UX acceptance                       |
| PO-66 | UI finalization                      | Needs sign-off                              | 🔍     | UI exists                                      | Client UI acceptance                       |
| PO-67 | Onboarding and testing               | Partial                                     | 🟡     | Tutorials, joyride dep                         | Test plan + UAT                            |
| PO-68 | Make project live                    | Likely live API                             | 🔍     | Railway default URL                            | Go-live certificate                        |
| PO-69 | Sample onboarding                    | Partial                                     | 🟡     | Tutorial flows                                 | Documented sample onboarding               |
| PO-70 | GST 18%                              | Commercial                                  | 🔍     | PO Page 2                                      | Invoice compliance                         |
| PO-71 | GST variation extra                  | Commercial                                  | 🔍     | PO Page 2                                      | Contract clause application                |
| PO-72 | Attached Agreement                   | Missing from repo                           | 🔍     | PO note                                        | Locate agreement file                      |


---



## 22. Fully Covered Requirements


| PO ID | Requirement          | Evidence summary                                       |
| ----- | -------------------- | ------------------------------------------------------ |
| PO-18 | Project tracking     | Projects portfolio, details, progress, executive views |
| PO-19 | Team collaboration   | Multi-role auth and workflows                          |
| PO-30 | Dashboard            | Multiple operational/executive dashboards              |
| PO-64 | Frontend development | Complete React/Vite SPA in this repo                   |


Status totals from §21 (authoritative): ✅ **4** · 🟡 **18** · ❌ **7** · 🔍 **43** · Total **72**.

---



## 23. Partially Covered Requirements


| PO ID       | What exists                    | What is missing                               |
| ----------- | ------------------------------ | --------------------------------------------- |
| PO-08/15/16 | Large PMC product              | Full agreed module set                        |
| PO-20       | Correspondence/alerts/meetings | Email integration                             |
| PO-21/22    | Design & build largely done    | Module completeness + acceptance              |
| PO-27       | Tutorial videos                | Formal training delivery proof                |
| PO-29       | Project tracking UX            | Explicit “Project Tracker” scope confirmation |
| PO-32       | Task GET + milestones UI       | Full Project Tasks product                    |
| PO-35       | Host configs                   | Formal Deployment milestone                   |
| PO-36       | React stack                    | Agreement on required stack (if any)          |
| PO-56       | Report generator               | Formal assignment report submission           |
| PO-59/60    | API + dashboards               | Phase artifacts / acceptance                  |
| PO-61/62    | Ongoing development            | Close PO gaps; document levels                |
| PO-67/69    | Tutorials / joyride            | UAT + sample onboarding acceptance            |


---



## 24. Not Covered Requirements


| PO ID | Requirement                      | Missing work                                    |
| ----- | -------------------------------- | ----------------------------------------------- |
| PO-17 | Email integration (scope)        | Design + implement email integration            |
| PO-24 | Agreed-upon modules complete     | Finish PO-31/33/34 (+ harden PO-32)             |
| PO-25 | Smooth email feature integration | Same as email module                            |
| PO-31 | Reminders                        | Reminders CRUD, schedules, notifications UI/API |
| PO-33 | Email Integration module         | Email service + in-app workflows                |
| PO-34 | Project Templates                | Template create/apply flows                     |
| PO-40 | Hosting & Deployment plan        | Written approved plan                           |


---



## 25. Needs Verification


| PO ID(s)                                | What is required to verify                                       |
| --------------------------------------- | ---------------------------------------------------------------- |
| PO-01–PO-07, PO-09–PO-14                | Commercial documents / invoices                                  |
| PO-23, PO-26, PO-35 (acceptance), PO-68 | Go-live / deployment acceptance certificates, URLs, environments |
| PO-28, warranty                         | Warranty agreement text + support tickets/SLA                    |
| PO-37, PO-38, PO-63                     | Backend repository + DB schema/tech                              |
| PO-39                                   | Confirmed production hosting ownership                           |
| PO-41–PO-45, PO-72                      | Detailed annexures / agreement attachment                        |
| PO-46–PO-53, PO-70–PO-71                | Finance: advances, milestone invoices, GST returns               |
| PO-54–PO-55, PO-57–PO-58                | Project schedule vs actual dates                                 |
| PO-65–PO-66                             | Client UX/UI sign-off                                            |
| PO-27 (formal)                          | Training attendance sheets                                       |


---



## 26. Remaining Development Work

See priority plans §§27–29. Software blockers first: **Reminders, Email Integration, Project Templates, Project Tasks completion**, then deployment plan, training pack, handover pack.

---



## 27. High Priority Action Plan

Items required for core PO compliance, MVP, deployment, handover, mandatory functionality/integration.


| PO ID                 | Requirement                   | Status | Exists                        | Missing           | Exact work required                                                               | Suggested area                              | Acceptance condition                            |
| --------------------- | ----------------------------- | ------ | ----------------------------- | ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| PO-31                 | Reminders                     | ❌      | `hasReminderAlerts` flag only | Full module       | Spec + API + UI for create/list/due reminders linked to projects                  | New `components/reminders/*`, API endpoints | Client can create and receive project reminders |
| PO-33 / PO-17 / PO-25 | Email Integration             | ❌      | Email fields                  | Integration       | Integrate mail send/receive or approved email workflow for internal communication | New email service + UI; backend mail config | Email messages/workflows work end-to-end        |
| PO-34                 | Project Templates             | ❌      | Create project only           | Templates         | Template define/apply when creating projects                                      | `ProjectInit` / templates API               | User can create project from template           |
| PO-32                 | Project Tasks                 | 🟡     | GET tasks + local milestones  | Full CRUD/module  | Persist tasks via API; task board/list with statuses                              | `ProjectDetails` + `operationsApi`          | Tasks create/update/complete persisted          |
| PO-24                 | Agreed modules                | ❌      | Partial modules               | Completeness      | Finish above until all 7 modules accepted                                         | Module pack                                 | Written module acceptance                       |
| PO-40                 | Hosting & Deployment plan     | ❌      | Ad-hoc configs                | Plan doc          | Write hosting/deploy plan (FE+BE+DB+DNS+backup)                                   | `/docs/HOSTING_AND_DEPLOYMENT_PLAN.md`      | Client signs plan                               |
| PO-52                 | MVP 30%                       | 🔍     | Large app                     | Defined MVP       | Define MVP = PO modules min. set; freeze & demo                                   | Product + PM                                | MVP acceptance certificate                      |
| PO-51 / PO-23 / PO-68 | Deployment / live             | 🔍     | Configs + Railway             | Formal deploy     | Production deploy checklist + UAT                                                 | Ops                                         | Deployment acceptance                           |
| PO-53                 | Software handover             | 🔍     | Source repo                   | Handover pack     | Credentials, runbooks, admin guide, source access, env docs                       | Handover zip/docs                           | Handover sign-off                               |
| PO-48                 | Final 20% software submission | 🔍     | —                             | Submission record | Deliver final build + note                                                        | Release                                     | Invoice trigger met                             |


---



## 28. Medium Priority Action Plan


| PO ID                 | Requirement                       | Status | Exists            | Missing                 | Work                                            | Acceptance                      |
| --------------------- | --------------------------------- | ------ | ----------------- | ----------------------- | ----------------------------------------------- | ------------------------------- |
| PO-27                 | Training                          | 🟡     | Tutorial videos   | Formal training         | Conduct sessions + attendance; optional manuals | Training completion certificate |
| PO-29                 | Project Tracker clarity           | 🟡     | Tracking features | PO naming/scope map     | Map features to Tracker acceptance checklist    | Tracker accepted                |
| PO-56                 | Report submission                 | 🟡     | ReportGenerator   | Formal report           | Produce & submit assignment report              | Report acknowledged             |
| PO-67 / PO-69         | Onboarding & testing              | 🟡     | Tutorials         | UAT + sample onboarding | Test plan, sample project walkthrough           | UAT signed                      |
| PO-21 / PO-65 / PO-66 | Design/UX/UI finalization         | 🟡/🔍  | UI live           | Sign-off                | UX/UI review workshop                           | Sign-off form                   |
| PO-59 / PO-60         | Data clarity / dashboard planning | 🟡     | Implemented       | Artifacts               | Document phase outputs if required              | Phase close                     |
| PO-41–PO-43           | Headings without detail           | 🔍     | —                 | Specs                   | Obtain annexure or mark N/A jointly             | Written clarification           |


---



## 29. Low Priority Action Plan


| PO ID             | Requirement              | Status | Work                                        |
| ----------------- | ------------------------ | ------ | ------------------------------------------- |
| PO-01–PO-07       | Admin PO metadata        | 🔍     | Keep aligned on invoices only               |
| PO-62             | Level-wise documentation | 🟡     | Document development levels retrospectively |
| Docs polish       | README / architecture    | —      | Add root README (optional)                  |
| CI/CD             | Not required by PO text  | —      | Add pipelines if desired                    |
| Extra PMC modules | Beyond PO                | —      | Not required for PO unless newly agreed     |


---



## 30. PO Compliance Calculation



### 30.1 Method (non-arbitrary)

**Status weights**


| Status                | Weight                                                              |
| --------------------- | ------------------------------------------------------------------- |
| ✅ COVERED             | 1.0                                                                 |
| 🟡 PARTIALLY COVERED  | 0.5                                                                 |
| ❌ NOT COVERED         | 0.0                                                                 |
| 🔍 NEEDS VERIFICATION | *Excluded from scoring* (unknown; not counted as credit or penalty) |


**Formula**


\text{Compliance } = \frac{\sum(\text{weight of scored IDs})}{\text{count of scored IDs}} \times 100


### 30.2 Strict overall score (all scored IDs from matrix)


| Status           | Count  | Contribution |
| ---------------- | ------ | ------------ |
| ✅                | 4      | 4.0          |
| 🟡               | 18     | 9.0          |
| ❌                | 7      | 0.0          |
| **Scored total** | **29** | **13.0**     |
| 🔍 excluded      | 43     | —            |


**Overall PO Compliance (scored subset) = 13.0 / 29 = 44.8%**

### 30.3 Software / Functional Compliance

Scored only IDs that are software/feature/deploy related:  
PO-15–PO-36, PO-40, PO-56, PO-59–PO-69 (subset present in matrix with software meaning).

Using the matrix statuses for that functional cluster:


| Status        | IDs (functional cluster)                                            | Count    |
| ------------- | ------------------------------------------------------------------- | -------- |
| ✅             | PO-18,19,30,64                                                      | 4        |
| 🟡            | PO-15,16,20,21,22,27,29,32,35,36,56,59,60,61,62,67,69               | 17       |
| ❌             | PO-17,24,25,31,33,34,40                                             | 7        |
| 🔍 in cluster | PO-23,26,28,37,38,39,63,65,66,68 + phase schedule IDs as applicable | excluded |


Functional scored = 4+17+7 = 28  
Contribution = 4×1 + 17×0.5 + 7×0 = 4 + 8.5 = **12.5**  
**Software / Functional Compliance = 12.5 / 28 = 44.6%**

### 30.4 Distinction


| View                                 | Meaning                                                                                                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Software / Functional Compliance** | How completely the product meets PO software scope/modules/phases that can be judged from engineering artifacts.                                                                   |
| **Overall PO Compliance (scored)**   | Same method including commercial-adjacent scored items that appear as 🟡/❌/✅ in the matrix (still excludes unverifiable commercial 🔍 items).                                      |
| **Commercial / process items**       | Payment, GST remittance, responsibilities annexures, warranty legal text — **must be verified outside code**; they dominate the 🔍 bucket and must not be silently marked covered. |


**Updated Executive Summary counts (authoritative):** ✅ 4 · 🟡 18 · ❌ 7 · 🔍 43 · Overall scored compliance **44.8%** · Functional **44.6%**.

---



## 31. Final PO Compliance Summary


| Question                                           | Answer                                                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Is the portal a substantial customized PMC system? | **Yes** — many enterprise modules beyond the PO list.                                             |
| Does it satisfy all 7 PO functional modules?       | **No** — Reminders, Email Integration, Project Templates missing; Tasks partial.                  |
| Can acceptance be declared from this repo alone?   | **No**.                                                                                           |
| Biggest software gaps                              | Email Integration, Reminders, Project Templates, Task module completion, Deployment plan.         |
| Biggest non-software gaps                          | Payment milestones, warranty, training sign-off, responsibilities annexure, handover certificate. |


---



## 32. Final Completion Checklist

1. **What does the PO require?**
  Customized web PM software for Shrikhande Consultant with core PM + email integration; seven modules (Tracker, Dashboard, Reminders, Tasks, Email Integration, Templates, Deployment); design/develop/deploy; training; warranty support; 7–9 week phased delivery; GST 18%; payment 80/20 and milestones 10/30/30/30; report submission; responsibilities/agreement references.
2. **What has already been implemented?**
  Frontend SPA with strong project tracking, multiple dashboards, multi-role collaboration, extensive PMC operations (DPR/WPR, financial, HSE, correspondence, etc.), API integration to a Railway-hosted backend, static hosting configs, tutorial videos.
3. **What is only partially implemented?**
  Overall customized scope, communication (without email), design/develop completeness, training (videos only), Project Tracker naming/scope, Project Tasks, Deployment outcome, report submission, data/dashboard phase artifacts, onboarding/testing.
4. **What is completely missing?**
  Reminders module; Email Integration; Project Templates; Hosting & Deployment plan document; completeness of “agreed-upon modules.”
5. **What cannot currently be verified?**
  Payments/GST remittance, milestone certificates, backend/DB internals, warranty terms, client/vendor responsibility details, agreement attachment, formal go-live/UX/UI sign-off, timeline adherence.
6. **What must be completed before MVP?**
  Define MVP explicitly; implement Reminders, Email Integration, Project Templates; complete Project Tasks; demonstrate Dashboard + Tracker; client MVP acceptance (PO-52).
7. **What must be completed before Deployment?**
  Hosting & Deployment plan (PO-40); production environment verification; UAT; deployment acceptance (PO-51/PO-23/PO-68).
8. **What must be completed before Software Handover?**
  Final software package; credentials/runbooks; admin/user guides; source access; training completion; warranty terms documented; handover sign-off (PO-53); enables balance payment path (PO-48).
9. **What documentation/training/support is still required?**
  Formal training records; warranty/support SOP; hosting plan; inclusions/exclusions; responsibilities; assignment report; agreement file.
10. **What commercial/payment requirements need verification?**
  ₹9,00,000 base; CGST/SGST; 80%+18% GST advance; 20%+18% GST final; milestones 10/30/30/30; reconciliation between 80/20 and milestone splits; GST variation clause.
11. **Is the project currently ready for PO acceptance?**
  **No.**
12. **What is the exact remaining work required?**
  (a) Build Reminders, Email Integration, Project Templates; (b) finish Project Tasks; (c) write Hosting & Deployment plan and complete formal deploy/UAT; (d) deliver training + warranty support framework; (e) produce handover pack + assignment report; (f) complete commercial milestone verification with finance; (g) obtain missing PO annexure details (responsibilities, inclusions/exclusions, integration/user requirements).

---



## Concise Conclusion

Based on the PO, the project has covered: **project tracking, team collaboration, dashboarding, and frontend development of a substantial customized PMC web application**.

The project has partially covered: **overall customized PM scope, core PM breadth, communication (non-email), design/development completeness, Project Tracker/Tasks, deployment groundwork, tutorial-based training aids, reporting capability, and several delivery-phase engineering activities**.

The project still needs: **Reminders, Email Integration, Project Templates, full Project Tasks, a formal Hosting & Deployment plan, formal training/warranty/handover artifacts, and completion of agreed-upon modules**.

The project cannot yet be verified for: **payment milestones & GST remittance, backend/database internals, warranty legal terms, client/Planeteye responsibility details, agreement attachment, timeline compliance, and formal go-live/UX/UI acceptance**.

Current PO compliance status: **~44.8% on scored requirements (functional ~44.6%); 43/72 items remain Needs Verification; project is not ready for PO acceptance**.

Before final acceptance, the following must be completed: **missing PO modules (Reminders, Email Integration, Templates + Tasks completion), deployment plan + go-live acceptance, MVP/handover certificates, training & warranty documentation, assignment report submission, and commercial milestone verification**.

---

*End of audit. No application code was modified to produce this document.*