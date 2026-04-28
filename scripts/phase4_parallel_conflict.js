// ============================================================
// PHASE 4: PARALLEL EXECUTION & CONFLICT TEST INCIDENTS
// ============================================================
// Run in: ServiceNow > System Definition > Scripts - Background
// Purpose: Create 5 incidents to test race conditions and
//          field overwrites when 3 agents run in parallel.
//
// TESTING INSTRUCTIONS:
//   PX-01: Normal run, check all 3 agents' work notes appear
//   PX-02: Check Agent 1 + Agent 2 don't overwrite each other's fields
//   PX-03: Trigger workflow TWICE rapidly on same INC
//   PX-04: Start editing the INC manually, THEN trigger workflow
//   PX-05: Normal run, verify link + field updates both persist
// ============================================================

var CALLER_ID = '28745d9d47e4c3d0c0969fd8036d4305';
var contactTypes = ['chat', 'chat', 'chat', 'chat', 'phone', 'email', 'self-service'];

function randomContact() {
    return contactTypes[Math.floor(Math.random() * contactTypes.length)];
}

var tests = [];

// PX-01: Normal incident — check all 3 agents leave work notes
tests.push({
    test_id: 'PX-01',
    short_description: 'Mobile app login timeout errors — authentication service slow',
    description: 'Card members logging into the Amex mobile app are experiencing 30+ second delays ' +
        'on the authentication step. Some requests are timing out entirely. ' +
        'The authentication service on the Mobile Service Layer is responding slowly. ' +
        'Approximately 20% of login attempts are failing with timeout errors. ' +
        'This maps to the "I want to be authenticated" service on the Mobile channel. ' +
        'Testing that all 3 agents complete and leave work notes.',
    impact: '1',
    urgency: '2',
    contact_type: 'chat'
});

// PX-02: Clear fields for both Agent 1 AND Agent 2 — check no overwrites
tests.push({
    test_id: 'PX-02',
    short_description: 'Bill payment processing failures on web — Pay a Bill consumer errors',
    description: 'Consumers are unable to complete bill payments through americanexpress.com. ' +
        'The Pay a Bill feature returns "Payment processing failed" after entering bank details. ' +
        'This is clearly a software issue (category) related to the Pay a Bill (Consumer) service (classification). ' +
        'Agent 1 should set category=software, Agent 2 should set service=Pay a Bill (Consumer). ' +
        'These are different fields — verify neither agent overwrites the other\'s updates.',
    impact: '1',
    urgency: '1',
    contact_type: 'self-service'
});

// PX-03: For double-trigger test — will trigger this INC twice rapidly
tests.push({
    test_id: 'PX-03',
    short_description: 'Checking account fund transfer failures on mobile',
    description: 'Customers are unable to transfer funds to/from their checking accounts via the mobile app. ' +
        'The "I want to fund my checking account" and "I want to move money in my checking account" flows ' +
        'are both failing. Error: "Transfer service temporarily unavailable." ' +
        'TESTING INSTRUCTION: Trigger the workflow on this INC number twice in rapid succession. ' +
        'Check for duplicate processing, conflicting results, or duplicate MI/Problem links.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});

// PX-04: For manual-edit-during-agent-run test
tests.push({
    test_id: 'PX-04',
    short_description: 'Debit purchase authorization failures at POS terminals',
    description: 'Card members using Amex debit cards at point-of-sale terminals are seeing intermittent ' +
        'authorization declines. The Authorize a Debit Purchase service at POS is returning decline codes ' +
        'for transactions that should be approved (sufficient balance, valid card). ' +
        'TESTING INSTRUCTION: Open this incident in the workspace, start manually editing a field ' +
        '(e.g., adding a work note), then trigger the AI workflow while your edit session is still open. ' +
        'Check if the manual save and agent updates conflict.',
    impact: '1',
    urgency: '1',
    contact_type: 'phone'
});

// PX-05: Agent 3 link + Agent 2 classification simultaneously
tests.push({
    test_id: 'PX-05',
    short_description: 'Enroll Offers failures for UK card members on mobile app',
    description: 'UK card members are unable to enroll in Amex Offers through the mobile app. ' +
        'The Offer eligibility / enrollment flow on mobile is returning errors. ' +
        'This should trigger Agent 2 to classify the service (Offer eligibility / enrollment - Mobile) ' +
        'AND Agent 3 to link to the active MI INC030340795 (Enroll Offers failures for UK). ' +
        'Both agents update the incident record simultaneously — verify both the link and the ' +
        'service classification persist without one overwriting the other.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat'
});


// ============================================================
// CREATE ALL INCIDENTS
// ============================================================
gs.info('');
gs.info('============================================================');
gs.info('PHASE 4: PARALLEL/CONFLICT — Creating ' + tests.length + ' test incidents');
gs.info('============================================================');

var createdIncidents = [];

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
    inc.work_notes = '[STRESS TEST] Test ID: ' + t.test_id + ' | Phase: 4 - Parallel/Conflict | ' +
        'This incident was created for AI Agent stress testing.';
    var sys_id = inc.insert();

    var number = inc.number.toString();
    createdIncidents.push({ test_id: t.test_id, number: number, sys_id: sys_id });
    gs.info(t.test_id + ' => ' + number + ' | ' + t.short_description.substring(0, 60) + '...');
}

gs.info('');
gs.info('============================================================');
gs.info('PHASE 4 COMPLETE — ' + createdIncidents.length + ' incidents created');
gs.info('============================================================');
gs.info('');
gs.info('INC Numbers for tracking spreadsheet:');
for (var j = 0; j < createdIncidents.length; j++) {
    gs.info('  ' + createdIncidents[j].test_id + ': ' + createdIncidents[j].number);
}
gs.info('');
gs.info('TESTING INSTRUCTIONS:');
gs.info('  PX-01: Run normally. After agents complete, verify all 3 agents left work notes.');
gs.info('  PX-02: Run normally. Verify Agent 1 fields (category/subcategory) AND Agent 2 fields');
gs.info('         (service/offering/CI) both persist — no mutual overwrite.');
gs.info('  PX-03: Trigger the workflow TWICE on this INC rapidly (within seconds). Check for');
gs.info('         duplicate runs, conflicting results, or duplicate MI/Problem links.');
gs.info('  PX-04: Open the INC in workspace, begin manually editing, THEN trigger the workflow.');
gs.info('         Check if manual save and agent updates conflict.');
gs.info('  PX-05: Run normally. Verify Agent 3 link AND Agent 2 service classification both persist.');
