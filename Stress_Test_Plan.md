# Stress Test Plan: "Triage and Categorize ITSM Incidents" Agentic Workflow

## Context

The user has a ServiceNow AI Agent workflow on a Zurich instance (not connected to Claude/JARVIS) that runs 3 agents **in parallel** when given an incident number. The goal is a comprehensive manual stress test covering **accuracy**, **edge cases**, and **performance**. The instance has populated CMDB, Service Catalog, Knowledge Base, and Problem records.

### Workflow Under Test
- **Name:** Triage and categorize ITSM incidents
- **Input:** Incident number (only input)
- **Execution:** All 3 agents fire in parallel, no dependencies

### Agents
| # | Agent | Assigns | Tools | Script Class |
|---|-------|---------|-------|--------------|
| 1 | Categorize ITSM incident AI agent | `category`, `subcategory` | Fetch all data, Update incident | `sn_itsm_aia.CategorizeIncidentAIAgent` |
| 2 | Classify service and CI AI agent | `business_service`, `service_offering`, `cmdb_ci` | Find candidates, Update incident | `sn_itsm_aia.ClassifyServiceOfferingAgentUtil` |
| 3 | Link major incident or problem AI Agent | Major Incident or Problem link | Get incident/MI/problems, Set link | `sn_itsm_aia.MajorIncidentOrProblemLinkerAgentUtil` |

---

## Phase 0: Pre-Test Setup (Do This First)

### 0.1 — Create a Results Tracking Sheet
Create a spreadsheet (Excel, Google Sheets, or even an SN custom table) with these columns:

| Column | Purpose |
|--------|---------|
| Test ID | e.g., TC-001 |
| Test Category | Happy Path / Edge Case / Negative / Volume |
| Incident Number | The INC used |
| Short Description | What the incident says |
| Pre-existing values | Any fields already populated before test |
| **Agent 1 Result** — Category | What it assigned |
| **Agent 1 Result** — Subcategory | What it assigned |
| Agent 1 — Correct? | Y/N + notes |
| **Agent 2 Result** — Service | What it assigned |
| **Agent 2 Result** — Offering | What it assigned |
| **Agent 2 Result** — CI | What it assigned |
| Agent 2 — Correct? | Y/N + notes |
| **Agent 3 Result** — Linked MI | sys_id or "none" |
| **Agent 3 Result** — Linked Problem | sys_id or "none" |
| Agent 3 — Correct? | Y/N + notes |
| Execution Time | Start → all 3 agents complete |
| Errors/Notes | Any anomalies observed |

### 0.2 — Baseline Data (Extracted from AMEX Instance — 2026-04-28)

**Source files:** `/Users/gavin.whitlock/Documents/Instance Projects/AMEX/`

#### Categories & Subcategories (incident table, English, active)

| Category | Subcategories |
|----------|---------------|
| **access** (Access/Security) | application, authentication, compliance, database, encryption, hardware, network, network1, password, software, telephony |
| **cloud management** | access, network, server |
| **database** | DB2 LUW, DB2 UDB, DB2 z/OS, Cassandra Keyspace, Couchbase, DB2, Elasticsearch, Greenplum, IMS, Jethro, MARIA, MEMSQL, MongoDB, MSSQL, MySQL, Neo Technology, Netezza, Nutanic, Oracle, Oracle PDB, Postgres SQL, Redis, MS SQL Server, Sybase, Yellow brick |
| **database instance** | DB2 Subsystem, DB2 UDB, IMS Subsystem, MSFT SQL Instance, Oracle CDB |
| **hardware** | AC Adapter/Charger, Battery, Component/Consumables, CPU, Disk, Headset, Keyboard, Laptop Hinge, Maintenance, Memory, Monitor/Display, Motherboard, Motherboard Fan, Mouse, Performance Issues, Printer, Servers, Webcam, Workstation |
| **inquiry** (Inquiry/Help) | Abandoned Call/Chat, Antivirus, Email, Internal Application, Meeting Room |
| **network** | DHCP, DNS, Equipment, Firewall, IP Address, VPN, Wireless/WiFi |
| **problem resolved** | Fix Applied |
| **process** | Communication, Deployment, Documentation, Human Error, Testing & Validation, Training |
| **software** | Blue Screen, Boot Time, Business Application, Database, Email, Error Message, Hard Reset, Install/Configuration, Login Time, Mobile, Operating System, Reboot, System |
| **telephony** | Audio, Configuration, IVR, Phone, Phone Accessory |

#### Active Major Incidents (46 active out of 348 total)

State breakdown: 1 in state=1 (New), 7 in state=2 (In Progress), 38 in state=6 (Resolved)

**Key active MIs for Agent 3 matching:**

| INC # | P | CI | Short Description |
|-------|---|-----|-------------------|
| INC030352324 | P2 | Mobile Service Layer - E3-Production | Spike in failures for /giftcards/v1/catalog |
| INC030350754 | P2 | MYCA - E3-Production | ReadCheckingAccountPostedTransactions.v2 failure |
| INC030326287 | P1 | Intuitive Servicing Portal - E3-Production | Account no loading for MNL CCP's |
| INC030330712 | P1 | Intuitive Servicing Portal - E3-Production | Unable to launch |
| INC030326409 | P1 | CT - Online - Portal - E3-Production | Expedia Group Incident Notification |
| INC030322531 | P1 | Mobile Service Layer - E3-Production | Personal Checking Accounts - Rewards failures |
| INC030322720 | P2 | Intl Digital Existing Customer App - E3-Production | INVALID_GO2_RESPONSE |
| INC030306878 | P2 | Global Acquisition - E3-Production | GO2 AutoMIMReq Instant Decision Impact |
| INC030303804 | P2 | Global Acquisition - E3-Production | ROD failures |
| INC030309271 | P2 | Mobile Service Layer - E3-Production | Card Replacement Failures |
| INC030340795 | P2 | Mobile Service Layer - E3-Production | Enroll Offers failures for UK |
| INC030338313 | P2 | global-instant-membership\|gim-microsvc | Raven Document Generation Failures |
| INC030244513 | P2 | TYO-WG-18E-P06C | Printer - All Japan Printers Down |
| INC030308570 | P2 | CREDIT SERVICING PLATFORM - E3-Production | ptp window not loading in csp |
| INC030353073 | P4 | Automation CI for Sanity Check | test |

#### Active Problems (1,006 active out of 1,463 total)

State distribution: 347 New (101), 307 Assessed (102), 251 RCA (103), 69 Fix in Progress (104), 32 Resolved (106), 457 Closed (107)

**High-priority active problems (P1-P2) most relevant for Agent 3:**

| PRB # | P | State | CI | Short Description |
|-------|---|-------|-----|-------------------|
| PRB0085900 | P1 | New | Intuitive Servicing Portal - E3-Production | Unable to launch |
| PRB0085892 | P1 | RCA | CT - Online - Portal - E3-Production | Expedia Group Incident Notification |
| PRB0085885 | P1 | RCA | Intuitive Servicing Portal - E3-Production | Account no loading for MNL CCP's |
| PRB0085824 | P1 | New | Intuitive Servicing Portal - E3-Production | Multiple CEN and CSN CCPs errors in ISP |
| PRB0085929 | P2 | New | Mobile Service Layer - E3-Production | Spike in failures for /giftcards |
| PRB0085928 | P2 | New | MYCA - E3-Production | ReadCheckingAccountPostedTransactions.v2 failure |
| PRB0085926 | P2 | New | Global Acquisition - E3-Production | ROD failures |
| PRB0085919 | P2 | New | Enterprise Wallet - E3-Production | Tokenpar failures from IPC1 |
| PRB0085914 | P2 | Assessed | Mobile Service Layer - E3-Production | Enroll Offers failures for UK |
| PRB0085913 | P2 | New | Global Acquisition - E3-Production | ROD failures for AUD |
| PRB0085910 | P2 | Assessed | global-instant-membership\|gim-microsvc | Raven Document Generation Failures |
| PRB0085904 | P2 | Assessed | Mobile Service Layer - E3-Production | ReadEligibilityForCardReplacement.v1 timeouts |
| PRB0085846 | P2 | New | Mobile Service Layer - E3-Production | Card Replacement Failures |
| PRB0085844 | P2 | New | CREDIT SERVICING PLATFORM - E3-Production | ptp window not loading in csp |

**Note:** Many problems have matching MIs (same CI + similar description) — this is ideal for testing Agent 3's dual-match behavior.

#### Service Offerings (108 offerings across 75 business services, all Operational)

**Multi-offering services (best for Agent 2 multi-channel testing):**

| Business Service | Offerings (channels) |
|-----------------|----------------------|
| I want to be authenticated | CCP, IVR, Mobile, Web |
| Pay a Bill (Consumer) | CCP, IVR, Mobile, Web |
| Track Balance | CCP, IVR, Mobile, Web |
| Card Replacement | CCP, IVR, Mobile, Web |
| Freeze/Unfreeze Card | CCP, IVR, Mobile, Web |
| Statement | CCP, Mobile, Web |
| Offer eligibility / enrollment | Email, Mobile, Web |
| Reward Points Transfer | CCP, Mobile, Web |
| Select And Redeem | CCP, Mobile, Web |
| Dispute a Transaction | CCP, Web |
| Change my Card Product | CCP, Web (as "Upgrade Card") |

**Single-offering services frequently seen in MI/Problem data:**
- Mobile Service Layer, MYCA, Global Acquisition, Intuitive Servicing Portal, Issuance Replacements Service, Enterprise Wallet, CT - Online - Portal, Global Servicing Portal, Workspace (WDE), CREDIT SERVICING PLATFORM

**Note:** These CI names (from MI/Problem data) are *application services/CIs*, not the same as the service offerings above. Agent 2 must map incidents to the correct *business service → service offering → CI* hierarchy. The mismatch between CI names and service offering names is itself a key accuracy test.

### 0.3 — Establish How to Trigger
Confirm the triggering mechanism:
- Is this invoked via **Now Assist panel** (fulfiller types incident number)?
- Is it a **catalog item / record producer**?
- Is it triggered via **Flow Designer**?
- Document the exact steps to invoke so each test run is consistent.

### 0.4 — Set Up Observation Points
For each test run, plan to check:
- **Work notes** on the incident (all 3 agents should add work notes per their logic)
- **Incident field values** (category, subcategory, business_service, service_offering, cmdb_ci)
- **Related records** (Major Incident link, Problem link)
- **Agent execution logs** — Navigate to `AI Agent Executions` (table: `sn_agent_execution`) to see detailed agent traces, tool calls, and LLM reasoning

---

## Phase 1: Happy Path Tests (6 incidents)

**Goal:** Establish baseline — confirm all 3 agents work correctly on clean, unambiguous incidents.

### Test Case Design
Create or select incidents where the "right answer" is obvious. Use real CIs and patterns from this instance:

| Test ID | Incident Characteristics | Expected Results | What You're Validating |
|---------|--------------------------|------------------|------------------------|
| HP-01 | "Email not working on Outlook" — clear software/email | Cat: software, Sub: email | Agent 1 categorizes correctly; Agent 2 finds relevant CI |
| HP-02 | "Printer not working in Tokyo office" — matches active MI INC030244513 (Japan printers down) | Cat: hardware, Sub: printer; Agent 3 links INC030244513 | All 3 agents produce correct results; Agent 3 MI match |
| HP-03 | "ReadCheckingAccountPostedTransactions.v2 failures on MYCA" — matches MI INC030350754 AND PRB0085928 | Cat: software/business; CI: MYCA - E3-Production; Links MI + Problem | Agent 3 dual-match (both MI and Problem exist for same issue) |
| HP-04 | "VPN connection dropping intermittently" — clear network/vpn, no MI match | Cat: network, Sub: vpn; No MI/Problem link | Agent 3 correctly reports no match |
| HP-05 | "ROD failures impacting instant decisions" — matches multiple MIs (INC030303804, INC030349480) AND PRB0085926 | Cat: software/business; CI: Global Acquisition - E3-Production | Agent 3 chooses between multiple MI candidates; Problem link |
| HP-06 | "Oracle DB connection pool exhausted on production" — clear database/oracle | Cat: database, Sub: oracle; No MI match expected | Agent 1 handles rich DB category set |

### What to Record
- Execution time per run (stopwatch from trigger to last agent completion)
- Whether all 3 agents executed (check work notes for evidence of all 3)
- Correctness of every assigned field
- Quality of work note explanations

---

## Phase 2: Accuracy Matrix Tests (27 incidents)

**Goal:** Systematically test across different incident types to validate categorization and classification breadth.

### 2.1 — Category Coverage
Create one incident per category in the AMEX instance (11 categories total):

| Test ID | Target Category/Subcategory | Short Description Example |
|---------|----------------------------|---------------------------|
| AC-01 | access/authentication | "Unable to authenticate to corporate VPN — password not accepted" |
| AC-02 | cloud management/server | "AWS EC2 instance unresponsive in us-east-1" |
| AC-03 | database/oracle | "Oracle DB connection pool exhausted on production" |
| AC-04 | database instance/MSFT SQL Instance | "SQL Server instance MSSQL01 not responding to queries" |
| AC-05 | hardware/monitor | "Monitor flickering intermittently on docking station" |
| AC-06 | inquiry/email | "Need help configuring email forwarding rules" |
| AC-07 | network/firewall | "Firewall blocking traffic to production subnet 10.20.x.x" |
| AC-08 | problem resolved/fix applied | "Issue previously reported has been fixed by vendor patch" |
| AC-09 | process/deployment | "Deployment pipeline failed during staging rollout" |
| AC-10 | software/email | "Outlook keeps freezing when opening attachments" |
| AC-11 | telephony/phone | "Desk phone not ringing for incoming calls" |

### 2.2 — Service/Offering/CI Coverage
Create incidents targeting specific service offering scenarios:

| Test ID | Scenario | Expected Service → Offering | What to Observe |
|---------|----------|----------------------------|-----------------|
| SO-01 | "Card replacement needed — customer called in" | Card Replacement → Card Replacement - CCP | 4 channels exist; does Agent 2 pick CCP based on contact_type? |
| SO-02 | "Card replacement requested via mobile app" | Card Replacement → Card Replacement - Mobile | Same service, different channel — tests channel disambiguation |
| SO-03 | "Customer wants to freeze card on website" | Freeze/Unfreeze Card → Freeze/Unfreeze Card - Web | 4 channels; "website" should map to Web |
| SO-04 | "Bill payment failed on IVR" | Pay a Bill (Consumer) → Pay a Bill (Consumer) - IVR | Specific channel mentioned in description |
| SO-05 | "Rewards points transfer not working" — no channel specified | Reward Points Transfer → ? | 3 channels (CCP, Mobile, Web) — does Agent 2 handle ambiguity? |
| SO-06 | "Offer enrollment errors on mobile" | Offer eligibility / enrollment → ...Mobile | Should match active MI INC030340795 (Enroll Offers UK) too |
| SO-07 | "Customer can't view statement" — vague | Statement → ? | 3 channels — tests heuristic when no channel hint given |
| SO-08 | "vPayment processing errors" | vPayments → vPayments - APIGEE | Single offering, unique name — straightforward match |
| SO-09 | "PNR ticketing system down" | PNR Ticketing → PNR Ticketing - Web | Niche service — tests recall across full catalog |
| SO-10 | Test with caller-assigned CI | Should use `callerAssignedCIs` fallback | Agent 2's hierarchy rules when offering branch has no CIs |

### 2.3 — Major Incident / Problem Coverage
Use these real MI/Problem pairs from the instance to design matching test incidents:

| Test ID | Create Incident About... | Should Match MI | Should Match PRB | What to Observe |
|---------|--------------------------|-----------------|------------------|-----------------|
| MP-01 | "Card replacement failures on mobile" | INC030309271 (Card Replacement Failures, MSL) | PRB0085846 (same) | Exact CI + description match for both MI and Problem |
| MP-02 | "Gift card catalog API errors" | INC030352324 (/giftcards/v1/catalog, MSL) | PRB0085929 (same) | Both MI and Problem match — which gets linked? Priority? |
| MP-03 | "ISP portal not loading for Manila CCPs" | INC030326287 (Account no loading, ISP) | PRB0085885 + PRB0085824 (similar) | Multiple matching Problems with same CI — confidence scoring |
| MP-04 | "ROD processing failures for Australian market" | INC030340044 (ROD failures for AUD) | PRB0085913 (same) | Exact match with market-specific qualifier |
| MP-05 | "Lounge finder app not returning results" | INC030324586 or INC030330368 (both active) | PRB0085882 (Loungefinder) | Two active MIs for same issue — which does Agent 3 pick? |
| MP-06 | "Unrelated issue: SAP payroll calculation error" | None | None | Agent 3 correctly finds no match among 46 active MIs |

---

## Phase 3: Edge Case Tests (21 incidents)

**Goal:** Test boundary conditions, ambiguity, and failure handling.

### 3.1 — Agent 1 (Categorize) Edge Cases

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EC-01 | **Vague description:** "Something is broken" | Agent 1 should set category/subcategory to null (per its 100% certainty rule) |
| EC-02 | **Placeholder text:** "test", "check", "issue" (no context) | Should NOT infer a category; set to null |
| EC-03 | **Multi-category ambiguity:** "Network issue causing email software to crash" | Agent must pick one or set null — observe which |
| EC-04 | **Already categorized incident:** Pre-populate category/subcategory, then run | Does Agent 1 overwrite, skip, or respect existing values? |
| EC-05 | **Non-English description** (if applicable) | Per LANGUAGE RULE — agent should respond in the incident's language |

### 3.2 — Agent 2 (Classify Service/CI) Edge Cases

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EC-06 | **No matching service in CMDB** — incident about a service not in your catalog | Should set fields to null (per "do not invent" rule) |
| EC-07 | **Multiple equally strong candidates** — ambiguous short description | Agent uses heuristic matching; observe which it picks |
| EC-08 | **CI exists but offering branch has no CIs** — test the `callerAssignedCIs` fallback | Should fall back to callerAssignedCIs per its hierarchy rules |
| EC-09 | **Incident already has service/offering/CI populated** | Does Agent 2 overwrite? Its diff check says only update if different — verify |
| EC-10 | **Guidance pin test** — if `guidance.pin` exists on a field | Agent should NOT reselect or override pinned fields |

### 3.3 — Agent 3 (Link MI/Problem) Edge Cases

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EC-11 | **No match possible** — Create incident about something with no active MI/Problem (e.g., "Conference room projector broken") | Agent reports no match, does not set link |
| EC-12 | **Multiple MIs match** — "GO2 instant decision failures" matches INC030306878, INC030327607, INC030327067 (3 active MIs on same CI) | Agent should pick highest confidence per scoring logic |
| EC-13 | **Resolved MI (state=6)** — 38 of the 46 active MIs are in state=6 (Resolved). Create incident matching one | Does Agent 3 still match against resolved-but-active MIs? |
| EC-14 | **Problem exists but no MI** — Create incident about "Db2 connection failures on weekends" matching PRB0085836 (no corresponding MI) | Agent links Problem only |
| EC-15 | **Both MI and Problem match** — "Card replacement failures" matches INC030309271 AND PRB0085846 | Observe: does Agent 3 link both, prefer one, or pick highest confidence? |

### 3.4 — Workflow-Level Edge Cases

| Test ID | Scenario | Expected Behavior |
|---------|----------|-------------------|
| EC-16 | **Resolved incident** | Agent 1 should NOT proceed (per its rules). Do Agents 2 & 3 also stop? |
| EC-17 | **Closed incident** | Same as above |
| EC-18 | **Canceled incident** | Agent 2's instructions say "resolved/closed/canceled/inactive, stop" — verify |
| EC-19 | **Invalid incident number** (e.g., "INC9999999" that doesn't exist) | All agents should fail gracefully |
| EC-20 | **Incident with empty short description and empty description** | How does each agent handle having nothing to analyze? |

---

## Phase 4: Parallel Execution & Conflict Tests (5 incidents)

**Goal:** Since all 3 agents run in parallel and Agents 1 & 2 both call "Update incident" — test for race conditions or field overwrites.

| Test ID | Scenario | What to Check |
|---------|----------|---------------|
| PX-01 | Run a normal incident and check work notes order | Are all 3 agents' work notes present? Any missing? |
| PX-02 | Check if Agent 1 and Agent 2 update calls conflict | Agent 1 updates category/subcategory, Agent 2 updates service/offering/CI — different fields, should be safe. Verify no overwrites. |
| PX-03 | Run the same incident number **twice in rapid succession** | Do agents run twice? Do they produce consistent results? Any duplicate links? |
| PX-04 | Run while the incident is being manually edited by another user | Does the agent update get overwritten by the manual save, or vice versa? |
| PX-05 | Agent 3 linking + Agent 2 updating simultaneously | Verify the link and field updates both persist |

---

## Phase 5: Volume / Performance Tests (30 incidents)

**Goal:** Test throughput, consistency at scale, and response times.

### 5.1 — Sequential Volume Run
Run 30 incidents (VL-01 through VL-30) one after another through the workflow. For each:
- Record start time (when you trigger) and end time (when last agent completes)
- Track whether all 3 agents completed
- Spot-check accuracy on every 5th incident: **VL-05, VL-10, VL-15, VL-20, VL-25, VL-30** (detailed review)
- Flag any incidents where agents timed out or errored
- Run `validate_phase5.js` after all 30 complete for automated aggregate metrics

### 5.2 — Performance Metrics to Track

| Metric | How to Measure |
|--------|----------------|
| Average execution time | Mean of all recorded times |
| P95 execution time | 95th percentile |
| Agent completion rate | % of runs where all 3 agents completed |
| Accuracy rate per agent | % of spot-checked results that were correct |
| Error rate | % of runs with any agent error |
| Timeout rate | % of runs where any agent didn't complete |

### 5.3 — Performance Baselines
Define acceptable thresholds before testing:
- What execution time is "too slow"? (e.g., >60 seconds?)
- What accuracy rate is acceptable? (e.g., >90%?)
- What error rate is tolerable? (e.g., <5%?)

---

## Phase 6: Post-Test Analysis

### 6.1 — Review Execution Logs
For any failed or unexpected results:
1. Go to **AI Agent Executions** (`sn_agent_execution` table)
2. Find the execution record for that incident
3. Review the full agent trace — tool calls, LLM reasoning, inputs/outputs
4. Identify root cause: was it the agent prompt, the tool script, the data, or the LLM reasoning?

### 6.2 — Categorize Findings
Organize results into:
- **Bugs** — Agent produced wrong result due to logic/prompt error
- **Data gaps** — Missing or incomplete CMDB/KB data caused poor results
- **Prompt improvements** — Agent logic is sound but prompt could be clearer
- **Tool issues** — Script returned unexpected data
- **Performance issues** — Slow execution, timeouts

### 6.3 — Retest After Fixes
For any issues found and fixed, rerun the specific failing test cases to confirm the fix.

---

## Scripts & Automation

All scripts are in the `scripts/` directory and run in **ServiceNow > System Definition > Scripts - Background**.

### Incident Creation Scripts

| Script | Phase | Incidents | Description |
|--------|-------|-----------|-------------|
| `phase1_happy_path.js` | 1 | 6 | Clear, unambiguous incidents (HP-01 to HP-06) |
| `phase2_accuracy_matrix.js` | 2 | 27 | 11 category + 10 service offering + 6 MI/Problem (AC/SO/MP) |
| `phase3_edge_cases.js` | 3 | 21 | Vague, multi-lang, pre-populated, resolved/closed/canceled, empty (EC-01 to EC-20) |
| `phase4_parallel_conflict.js` | 4 | 5 | Race conditions, double-trigger, manual-edit-during-run (PX-01 to PX-05) |
| `phase5_volume.js` | 5 | 30 | Randomized mix across all categories (VL-01 to VL-30) |
| **Total** | | **89** | |

- All scripts use `caller_id = 28745d9d47e4c3d0c0969fd8036d4305`
- Contact types are weighted random (50% chat, 20% phone, 15% email, 10% self-service, 5% walk-in)
- Each incident gets a `[STRESS TEST]` work note tag with test ID and phase for automated discovery
- Category, subcategory, business_service, service_offering, and cmdb_ci are left **blank** for the agentic workflow to populate (except EC-04, EC-09, EC-10 which test pre-populated fields)
- EC-16/17/18 are set to resolved/closed/canceled state after creation
- EC-19 is manual only (use fake INC number "INC9999999")

### Validation Scripts

| Script | Phase | What it validates |
|--------|-------|-------------------|
| `validate_phase1.js` | 1 | Exact category/subcategory match, MI/Problem link to specific INC/PRB numbers, all 3 agent work notes |
| `validate_phase2.js` | 2 | Category accuracy (11 types), service→offering channel matching, MI/Problem pair accuracy |
| `validate_phase3.js` | 3 | Null results for vague inputs, pre-populated field preservation, non-English language detection, state-based refusal |
| `validate_phase4.js` | 4 | Work note completeness, Agent 1↔Agent 2 field overwrite detection, duplicate link detection, concurrent persistence |
| `validate_phase5.js` | 5 | Aggregate completion rate, field population %, execution time (avg/P95/max), spot-check flags every 5th incident |

**Validation features:**
- Auto-discovers test incidents via `[STRESS TEST]` work note tags — no need to manually enter INC numbers
- Checks both `sn_agent_execution` and `sn_aia_execution` tables for agent execution logs
- Checks MI links via `parent_incident` field and `task_rel_task` relationship table
- Output uses `✅ PASS`, `❌ FAIL`, `⚠️ WARN`, `👁️ OBSERVE` verdicts
- Summary box at end with totals and pass rate per phase

### Execution Workflow

For each phase, run 3 steps:

```
Step 1: Run creation script     →  scripts/phaseN_*.js       (Scripts - Background)
Step 2: Trigger workflow         →  Now Assist panel on each INC  (manual)
Step 3: Run validation script   →  scripts/validate_phaseN.js    (Scripts - Background)
```

**Wait for all 3 agents to complete on every incident before running the validator.** Check work notes on the last incident in the batch — when all 3 agents have posted, the batch is ready to validate.

---

## Execution Order Summary

| Step | What | Create Script | Validate Script | Incidents |
|------|------|--------------|-----------------|-----------|
| Phase 0 | Setup: tracking sheet, baseline data, confirm trigger | N/A | N/A | 0 |
| Phase 1 | Happy Path | `phase1_happy_path.js` | `validate_phase1.js` | 6 |
| Phase 2 | Accuracy Matrix | `phase2_accuracy_matrix.js` | `validate_phase2.js` | 27 |
| Phase 3 | Edge Cases | `phase3_edge_cases.js` | `validate_phase3.js` | 21 |
| Phase 4 | Parallel/Conflict | `phase4_parallel_conflict.js` | `validate_phase4.js` | 5 |
| Phase 5 | Volume/Performance | `phase5_volume.js` | `validate_phase5.js` | 30 |
| Phase 6 | Analysis & retesting | N/A | Re-run validators | 0 |

**Total: 89 test incidents with automated validation**

---

## Key Observations & Risks to Watch

1. **Agent 1 has a strict "100% certainty" rule** — expect many nulls on vague incidents. This is by design but may frustrate users if too aggressive.
2. **Agent 2 has complex hierarchy logic** (offerings-first vs service-first) — the accuracy matrix should specifically test both paths.
3. **Agent 3 has confidence scoring** with a "Highly Confident" threshold — test incidents that are just below and just above that threshold.
4. **All agents have "NEVER ask the user" rules** — they should always produce output autonomously. Verify they never stall waiting for input.
5. **Parallel execution** — Agents 1 and 2 both update the incident record. Different fields, but verify no GlideRecord-level conflicts.
6. **Resolved/Closed handling varies** — Agent 1 explicitly stops. Verify Agents 2 and 3 also stop (Agent 2's instructions say "resolved/closed/canceled/inactive, stop"; Agent 3's instructions check status codes).
