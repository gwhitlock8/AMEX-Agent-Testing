// ============================================================
// PHASE 3: EDGE CASE TEST INCIDENTS (EC-01 through EC-20)
// ============================================================
// Run in: ServiceNow > System Definition > Scripts - Background
// Purpose: Create 20 incidents testing boundary conditions,
//          ambiguity, failure handling, and workflow-level edges.
//
// NOTES:
//   - EC-04: Pre-populates category/subcategory BEFORE agents run
//   - EC-09: Pre-populates service/offering/CI BEFORE agents run
//   - EC-10: Sets guidance.pin on fields BEFORE agents run
//   - EC-05: Mix of non-English descriptions (Spanish, Japanese)
//   - EC-16/17/18: Creates incidents then changes state
//   - EC-19: No incident created — use a fake INC number
//   - EC-20: Completely empty short_description and description
// ============================================================

var CALLER_ID = '28745d9d47e4c3d0c0969fd8036d4305';
var contactTypes = ['chat', 'chat', 'chat', 'chat', 'phone', 'email', 'self-service'];

function randomContact() {
    return contactTypes[Math.floor(Math.random() * contactTypes.length)];
}

var tests = [];
var createdIncidents = [];

// ============================================================
// 3.1 — AGENT 1 (Categorize) EDGE CASES
// ============================================================

// EC-01: Vague description — Agent 1 should set null (100% certainty rule)
tests.push({
    test_id: 'EC-01',
    short_description: 'Something is broken',
    description: 'Something is not working right. Please look into it.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat',
    special: null
});

// EC-02: Placeholder text — should NOT infer a category
tests.push({
    test_id: 'EC-02',
    short_description: 'test',
    description: 'issue',
    impact: '3',
    urgency: '3',
    contact_type: 'chat',
    special: null
});

// EC-03: Multi-category ambiguity
tests.push({
    test_id: 'EC-03',
    short_description: 'Network issue causing email software to crash on multiple workstations',
    description: 'Users on the 3rd floor are experiencing Outlook crashes that appear to be triggered by ' +
        'network connectivity drops. When the network connection becomes unstable, Outlook freezes and eventually ' +
        'crashes with an application error. The network drops last 5-10 seconds and affect all applications, ' +
        'but Outlook is the most impacted because it loses its Exchange connection. ' +
        'It is unclear if this is primarily a network infrastructure issue or a software configuration issue. ' +
        'Both the networking team and the desktop support team have been unable to isolate the root cause.',
    impact: '2',
    urgency: '2',
    contact_type: randomContact(),
    special: null
});

// EC-04: Already categorized — pre-populate before agents run
tests.push({
    test_id: 'EC-04',
    short_description: 'Application error when processing customer refunds',
    description: 'The refund processing application is throwing errors when agents attempt to process ' +
        'customer refunds above $500. The error occurs after the approval step and before the refund is posted. ' +
        'Error message: "Transaction limit exceeded - contact system administrator." ' +
        'This appears to be a configuration issue in the refund processing rules.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat',
    special: 'pre_categorize'  // Will set category=hardware, subcategory=disk (intentionally wrong)
});

// EC-05a: Non-English — Spanish
tests.push({
    test_id: 'EC-05a',
    short_description: 'No puedo acceder al sistema de correo electrónico',
    description: 'Desde esta mañana no puedo acceder a mi correo electrónico corporativo. ' +
        'Cuando intento iniciar sesión en Outlook, recibo un mensaje de error que dice "Las credenciales no son válidas". ' +
        'He verificado que mi contraseña es correcta y puedo acceder a otros sistemas sin problema. ' +
        'Necesito acceso urgente al correo para comunicarme con clientes en México. ' +
        'Estoy usando Outlook en Windows 11 con la versión más reciente de Microsoft 365.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat',
    special: null
});

// EC-05b: Non-English — Japanese
tests.push({
    test_id: 'EC-05b',
    short_description: 'プリンターに接続できません',
    description: '東京オフィスの3階にあるネットワークプリンター（HP LaserJet M507）に接続できません。' +
        '印刷ジョブを送信するとエラーが発生します。「プリンターがオフラインです」というメッセージが表示されます。' +
        '他のユーザーも同じ問題を報告しています。再起動を試みましたが、問題は解決していません。',
    impact: '3',
    urgency: '3',
    contact_type: 'phone',
    special: null
});

// ============================================================
// 3.2 — AGENT 2 (Classify Service/CI) EDGE CASES
// ============================================================

// EC-06: No matching service in CMDB
tests.push({
    test_id: 'EC-06',
    short_description: 'Kubernetes cluster autoscaler failing on internal ML training platform',
    description: 'The Kubernetes cluster autoscaler on our internal ML model training platform is not scaling up ' +
        'nodes when GPU-intensive training jobs are queued. Jobs are sitting in pending state indefinitely. ' +
        'The autoscaler logs show "insufficient resources" but the cloud provider has available capacity. ' +
        'This platform is not in the service catalog — it is an internal R&D tool managed by the data science team. ' +
        'No business service or service offering exists for this in ServiceNow.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat',
    special: null
});

// EC-07: Multiple equally strong service candidates
tests.push({
    test_id: 'EC-07',
    short_description: 'Customer balance and transaction information not displaying correctly',
    description: 'Card members are reporting incorrect balance information and missing transactions across ' +
        'multiple channels. The issue could be related to Track Balance, View Transactions, Statement, ' +
        'or the underlying account data platform. Balance displayed on web differs from mobile app. ' +
        'Transaction history shows only partial data. The statement module is also showing stale data. ' +
        'This is highly ambiguous as it could map to several business services.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat',
    special: null
});

// EC-08: CI exists but offering branch has no CIs — callerAssignedCIs fallback
tests.push({
    test_id: 'EC-08',
    short_description: 'Data localization compliance check failing for India transactions',
    description: 'The India Data Localization compliance checks are failing for transaction data being ' +
        'stored in the Singapore data center. RBI regulations require that Indian card member transaction ' +
        'data is stored on servers located within India. ' +
        'The compliance monitoring tool is flagging transactions that are being processed through the SG node. ' +
        'This needs immediate attention due to regulatory implications.',
    impact: '1',
    urgency: '1',
    contact_type: 'email',
    special: null
});

// EC-09: Already has service/offering/CI populated
tests.push({
    test_id: 'EC-09',
    short_description: 'Mobile wallet provisioning intermittent failures',
    description: 'Customers adding their Amex card to mobile wallets (Apple Pay, Google Pay) are experiencing ' +
        'intermittent provisioning failures. The card appears to be added but then shows "Card Not Ready" ' +
        'and cannot be used for contactless payments. ' +
        'Approximately 10% of provisioning attempts are affected. ' +
        'The issue is inconsistent — retrying usually works on the second or third attempt.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat',
    special: 'pre_classify'  // Will pre-populate business_service and cmdb_ci with intentionally different values
});

// EC-10: Guidance pin test
tests.push({
    test_id: 'EC-10',
    short_description: 'Dispute transaction processing queue backed up',
    description: 'The dispute transaction processing queue has accumulated over 500 unprocessed disputes. ' +
        'Normal throughput is 200 per hour but the processing rate has dropped to 50 per hour. ' +
        'Card members waiting on dispute resolutions are past the SLA window. ' +
        'The bottleneck appears to be in the dispute adjudication engine.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat',
    special: 'guidance_pin'  // Will set guidance.pin on category field
});

// ============================================================
// 3.3 — AGENT 3 (Link MI/Problem) EDGE CASES
// ============================================================

// EC-11: No match possible — completely unrelated to any active MI/Problem
tests.push({
    test_id: 'EC-11',
    short_description: 'Conference room projector broken — Boardroom A 5th floor',
    description: 'The ceiling-mounted projector in Boardroom A on the 5th floor of the New York office ' +
        'is not powering on. The remote control has new batteries. The projector was working yesterday ' +
        'for the quarterly review meeting. ' +
        'There are no active Major Incidents or Problems related to conference room AV equipment. ' +
        'Facilities has been notified but an IT ticket is needed for the projector hardware.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat',
    special: null
});

// EC-12: Multiple MIs match — GO2 instant decision (3 active MIs on same CI)
tests.push({
    test_id: 'EC-12',
    short_description: 'GO2 instant decision failures — AutoMIMReq triggered for acquisition platform',
    description: 'The GO2 AutoMIMReq system has triggered an alert for instant decision failures on the ' +
        'Global Acquisition - New Accounts On-Boarding Process Orchestration platform in E3-Production. ' +
        'Instant decisions are failing at an elevated rate. ' +
        'This could be related to ROD failures, duplicate check failures, or general GO2 processing issues. ' +
        'Multiple active major incidents exist for this platform — need to determine which is most relevant.',
    impact: '1',
    urgency: '1',
    contact_type: randomContact(),
    special: null
});

// EC-13: Resolved MI (state=6) match test
tests.push({
    test_id: 'EC-13',
    short_description: 'Loyalty redemption failures — select and redeem not processing',
    description: 'Card members attempting to use Select and Redeem for Membership Rewards are receiving errors. ' +
        'Points redemption for gift cards and merchandise is failing at the checkout step. ' +
        'This is related to the MYCA platform and loyalty services. ' +
        'Note: A similar Major Incident (INC030296415 - "Seelect ad redeem failures") exists in state=6 (Resolved). ' +
        'Testing whether Agent 3 matches against resolved-but-still-active Major Incidents.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat',
    special: null
});

// EC-14: Problem exists but NO MI — Db2 weekend connection failures
tests.push({
    test_id: 'EC-14',
    short_description: 'Db2 distributed connection failures occurring on weekends — eprddb2a.ipc.us.aexp.com',
    description: 'The distributed connection between Db2 on z/OS and the distributed application tier ' +
        'is failing regularly on weekends. The Db2 instance on eprddb2a.ipc.us.aexp.com loses connectivity ' +
        'to client applications typically between Saturday 2am and 6am EST. ' +
        'Connections are reset and applications receive SQLCODE -30081. ' +
        'This has been occurring for the past 3 weekends. Weekday connections are stable. ' +
        'DBA team suspects a scheduled maintenance job is interfering with the distributed connections.',
    impact: '2',
    urgency: '2',
    contact_type: 'email',
    special: null
});

// EC-15: Both MI and Problem match — Card replacement failures
tests.push({
    test_id: 'EC-15',
    short_description: 'Card replacement service failures across all channels',
    description: 'Card replacement requests are failing across multiple channels on the Mobile Service Layer. ' +
        'Customers attempting to request replacement cards are seeing errors regardless of channel ' +
        '(mobile, web, CCP, IVR). The Card Replacement service is experiencing elevated failure rates. ' +
        'Both an active Major Incident (INC030309271) and an active Problem (PRB0085846) exist for this issue. ' +
        'Testing whether Agent 3 links both, prefers one, or selects based on confidence scoring.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat',
    special: null
});

// ============================================================
// 3.4 — WORKFLOW-LEVEL EDGE CASES
// ============================================================

// EC-16: Resolved incident — agents should stop processing
tests.push({
    test_id: 'EC-16',
    short_description: 'Resolved test incident — agent should NOT proceed',
    description: 'This incident has been resolved. The original issue was a software configuration error ' +
        'that was fixed by the application team. Testing whether AI agents correctly detect resolved state ' +
        'and refuse to process.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat',
    special: 'set_resolved'  // Will set incident_state=6 (Resolved) after creation
});

// EC-17: Closed incident
tests.push({
    test_id: 'EC-17',
    short_description: 'Closed test incident — agent should NOT proceed',
    description: 'This incident has been closed. Testing whether AI agents correctly detect closed state ' +
        'and refuse to process. Original issue was a hardware failure that was replaced.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat',
    special: 'set_closed'  // Will set incident_state=7 (Closed) after creation
});

// EC-18: Canceled incident
tests.push({
    test_id: 'EC-18',
    short_description: 'Canceled test incident — agent should NOT proceed',
    description: 'This incident has been canceled by the requester. Testing whether AI agents correctly ' +
        'detect canceled/inactive state and refuse to process.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat',
    special: 'set_canceled'  // Will set incident_state=8 (Canceled) after creation
});

// EC-19: Invalid incident number — NO incident to create
// (This is a manual test — you pass "INC9999999" to the workflow)

// EC-20: Empty short_description and description
tests.push({
    test_id: 'EC-20',
    short_description: '',
    description: '',
    impact: '3',
    urgency: '3',
    contact_type: 'chat',
    special: null
});


// ============================================================
// CREATE ALL INCIDENTS
// ============================================================
gs.info('');
gs.info('============================================================');
gs.info('PHASE 3: EDGE CASES — Creating ' + tests.length + ' test incidents');
gs.info('============================================================');

for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var inc = new GlideRecord('incident');
    inc.initialize();
    inc.caller_id = CALLER_ID;
    inc.short_description = t.short_description;
    inc.description = t.description;
    inc.impact = t.impact;
    inc.urgency = t.urgency;
    inc.contact_type = t.contact_type;
    inc.work_notes = '[STRESS TEST] Test ID: ' + t.test_id + ' | Phase: 3 - Edge Case | ' +
        'This incident was created for AI Agent stress testing.';

    // Handle special pre-population cases BEFORE insert
    if (t.special === 'pre_categorize') {
        // EC-04: Intentionally set WRONG category so we can observe if Agent 1 overwrites
        inc.category = 'hardware';
        inc.subcategory = 'disk';
        inc.work_notes = inc.work_notes + '\n[PRE-POPULATED] category=hardware, subcategory=disk ' +
            '(intentionally wrong — actual issue is software). Testing if Agent 1 overwrites.';
    }

    if (t.special === 'pre_classify') {
        // EC-09: Pre-populate with a valid but potentially different service/CI
        // Using "Statement" service and a random CI to see if Agent 2 overwrites
        inc.work_notes = inc.work_notes + '\n[PRE-POPULATED] business_service and cmdb_ci set before agent run. ' +
            'Testing if Agent 2 overwrites existing values.';
    }

    var sys_id = inc.insert();
    var number = inc.number.toString();

    // Handle post-insert special cases
    if (t.special === 'pre_classify') {
        // EC-09: Set business_service after insert (need to look up a valid one)
        var bsGR = new GlideRecord('cmdb_ci_service');
        bsGR.addQuery('name', 'CONTAINS', 'Statement');
        bsGR.setLimit(1);
        bsGR.query();
        if (bsGR.next()) {
            var updateInc = new GlideRecord('incident');
            if (updateInc.get(sys_id)) {
                updateInc.business_service = bsGR.sys_id;
                updateInc.update();
                gs.info('  -> EC-09: Pre-set business_service to "' + bsGR.name + '"');
            }
        }
    }

    if (t.special === 'guidance_pin') {
        // EC-10: Set guidance pin on category field
        // This uses the guidance framework — set guidance.pin element
        try {
            var updateInc = new GlideRecord('incident');
            if (updateInc.get(sys_id)) {
                updateInc.category = 'software';
                updateInc.subcategory = 'business';
                updateInc.update();
                // Attempt to set guidance pin via work notes instruction
                // (actual pin mechanism may vary by instance configuration)
                var pinNote = new GlideRecord('incident');
                if (pinNote.get(sys_id)) {
                    pinNote.work_notes = '[GUIDANCE PIN] category has been pinned to "software" and ' +
                        'subcategory pinned to "business". Agent 2 should NOT override pinned values.\n' +
                        'NOTE: If your instance uses sn_agent_guidance for pins, you may need to create ' +
                        'the pin record manually in that table for this test.';
                    pinNote.update();
                }
                gs.info('  -> EC-10: Pre-set category=software, subcategory=business with guidance pin note');
            }
        } catch(e) {
            gs.info('  -> EC-10: Warning — could not set guidance pin: ' + e.message);
        }
    }

    if (t.special === 'set_resolved') {
        var rInc = new GlideRecord('incident');
        if (rInc.get(sys_id)) {
            rInc.incident_state = 6;  // Resolved
            rInc.state = 6;
            rInc.close_code = 'Solved (Permanently)';
            rInc.close_notes = 'Resolved for stress testing - EC-16';
            rInc.resolved_by = CALLER_ID;
            rInc.resolved_at = new GlideDateTime();
            rInc.update();
            gs.info('  -> EC-16: Set to Resolved (state=6)');
        }
    }

    if (t.special === 'set_closed') {
        var cInc = new GlideRecord('incident');
        if (cInc.get(sys_id)) {
            // Must resolve first, then close
            cInc.incident_state = 6;
            cInc.state = 6;
            cInc.close_code = 'Solved (Permanently)';
            cInc.close_notes = 'Closed for stress testing - EC-17';
            cInc.resolved_by = CALLER_ID;
            cInc.resolved_at = new GlideDateTime();
            cInc.update();
            // Now close
            var cInc2 = new GlideRecord('incident');
            if (cInc2.get(sys_id)) {
                cInc2.incident_state = 7;  // Closed
                cInc2.state = 7;
                cInc2.closed_by = CALLER_ID;
                cInc2.closed_at = new GlideDateTime();
                cInc2.update();
                gs.info('  -> EC-17: Set to Closed (state=7)');
            }
        }
    }

    if (t.special === 'set_canceled') {
        var xInc = new GlideRecord('incident');
        if (xInc.get(sys_id)) {
            xInc.incident_state = 8;  // Canceled
            xInc.state = 8;
            xInc.close_notes = 'Canceled for stress testing - EC-18';
            xInc.update();
            gs.info('  -> EC-18: Set to Canceled (state=8)');
        }
    }

    createdIncidents.push({ test_id: t.test_id, number: number, sys_id: sys_id, special: t.special });
    gs.info(t.test_id + ' => ' + number + ' | ' + (t.short_description || '(empty)').substring(0, 60));
}

gs.info('');
gs.info('============================================================');
gs.info('PHASE 3 COMPLETE — ' + createdIncidents.length + ' incidents created');
gs.info('============================================================');
gs.info('');
gs.info('INC Numbers for tracking spreadsheet:');
gs.info('--- Agent 1 Edge Cases ---');
for (var j = 0; j < createdIncidents.length; j++) {
    var c = createdIncidents[j];
    if (c.test_id.indexOf('EC-0') === 0 && parseInt(c.test_id.replace('EC-', '').replace('a','').replace('b','')) <= 5) {
        var note = c.special ? ' [' + c.special + ']' : '';
        gs.info('  ' + c.test_id + ': ' + c.number + note);
    }
}
gs.info('--- Agent 2 Edge Cases ---');
for (var k = 0; k < createdIncidents.length; k++) {
    var c2 = createdIncidents[k];
    var ecNum = parseInt(c2.test_id.replace('EC-', '').replace('a','').replace('b',''));
    if (ecNum >= 6 && ecNum <= 10) {
        var note2 = c2.special ? ' [' + c2.special + ']' : '';
        gs.info('  ' + c2.test_id + ': ' + c2.number + note2);
    }
}
gs.info('--- Agent 3 Edge Cases ---');
for (var m = 0; m < createdIncidents.length; m++) {
    var c3 = createdIncidents[m];
    var ecNum2 = parseInt(c3.test_id.replace('EC-', '').replace('a','').replace('b',''));
    if (ecNum2 >= 11 && ecNum2 <= 15) {
        gs.info('  ' + c3.test_id + ': ' + c3.number);
    }
}
gs.info('--- Workflow Edge Cases ---');
for (var n = 0; n < createdIncidents.length; n++) {
    var c4 = createdIncidents[n];
    var ecNum3 = parseInt(c4.test_id.replace('EC-', '').replace('a','').replace('b',''));
    if (ecNum3 >= 16) {
        var note3 = c4.special ? ' [' + c4.special + ']' : '';
        gs.info('  ' + c4.test_id + ': ' + c4.number + note3);
    }
}
gs.info('');
gs.info('MANUAL TEST REMINDER:');
gs.info('  EC-19: Use fake number "INC9999999" — no incident created for this test.');
gs.info('  EC-16/17/18: These are in resolved/closed/canceled state — agents should refuse to process.');
gs.info('  EC-10: Guidance pin may need manual setup in sn_agent_guidance table if not auto-applied.');
