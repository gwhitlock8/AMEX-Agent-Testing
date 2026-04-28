// ============================================================
// PHASE 1: HAPPY PATH TEST INCIDENTS (HP-01 through HP-06)
// ============================================================
// Run in: ServiceNow > System Definition > Scripts - Background
// Purpose: Create 6 clean, unambiguous incidents where the
//          "right answer" is obvious for all 3 agents.
// ============================================================

var CALLER_ID = '28745d9d47e4c3d0c0969fd8036d4305';
var contactTypes = ['chat', 'chat', 'chat', 'chat', 'phone', 'email', 'self-service'];

function randomContact() {
    return contactTypes[Math.floor(Math.random() * contactTypes.length)];
}

var tests = [];

// -----------------------------------------------------------
// HP-01: Clear software/email — straightforward categorization
// Expected: category=software, subcategory=email
// Agent 3: No MI/Problem match expected
// -----------------------------------------------------------
tests.push({
    test_id: 'HP-01',
    short_description: 'Email not working on Outlook — unable to send or receive messages',
    description: 'User reports that Microsoft Outlook has stopped sending and receiving emails as of this morning. ' +
        'Error message: "Cannot connect to Exchange server." Other applications and internet connectivity are working fine. ' +
        'User has tried restarting Outlook and clearing the cache but the issue persists. ' +
        'This is affecting the user\'s ability to communicate with clients and internal teams. ' +
        'Outlook version: Microsoft 365, OS: Windows 11.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});

// -----------------------------------------------------------
// HP-02: Hardware/printer — should match active MI INC030244513
// Expected: category=hardware, subcategory=printer
// Agent 3: Should link MI INC030244513 (Japan printers down)
// -----------------------------------------------------------
tests.push({
    test_id: 'HP-02',
    short_description: 'Printer not working in Tokyo office — all network printers down',
    description: 'Multiple users in the Tokyo office are reporting that none of the network printers are functioning. ' +
        'Printers are showing as offline in the print queue. This appears to be affecting all floors in the Tokyo building. ' +
        'Users are unable to print any documents including customer-facing reports. ' +
        'The issue started approximately 2 hours ago. No recent changes to the print server configuration are known. ' +
        'Network connectivity to the printers appears to be failing — ping to printer IPs times out.',
    impact: '2',
    urgency: '2',
    contact_type: 'phone'
});

// -----------------------------------------------------------
// HP-03: Software/business on MYCA — should match MI AND Problem
// Expected: category=software, subcategory=business
// Agent 2: CI = Manage Your Customer Account (MYCA) - E3-Production
// Agent 3: Should link MI INC030350754 AND/OR PRB0085928
// -----------------------------------------------------------
tests.push({
    test_id: 'HP-03',
    short_description: 'ReadCheckingAccountPostedTransactions.v2 failures on MYCA platform',
    description: 'We are observing a spike in failures for the ReadCheckingAccountPostedTransactions.v2 function ' +
        'on the Manage Your Customer Account (MYCA) platform in E3-Production. ' +
        'Error rate has increased from baseline 0.1% to approximately 15% over the last 30 minutes. ' +
        'Affected customers are unable to view their posted checking account transactions on both web and mobile. ' +
        'Sample error: {"status":500,"message":"Internal Server Error","correlationId":"abc123-def456"}. ' +
        'No recent deployments to MYCA. Upstream dependencies appear healthy. ' +
        'This is impacting card member experience for checking account holders.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat'
});

// -----------------------------------------------------------
// HP-04: Network/VPN — clear category, no MI/Problem match
// Expected: category=network, subcategory=vpn
// Agent 3: Should find NO match
// -----------------------------------------------------------
tests.push({
    test_id: 'HP-04',
    short_description: 'VPN connection dropping intermittently for remote workers',
    description: 'Several remote employees are reporting intermittent VPN disconnections throughout the day. ' +
        'The VPN client connects successfully but drops after 15-30 minutes of use. ' +
        'Users are on Cisco AnyConnect VPN client version 4.10. Issue affects users across multiple ISPs and locations. ' +
        'When the VPN drops, users lose access to all internal resources including email, file shares, and internal apps. ' +
        'Reconnection works but the cycle repeats. No recent changes to VPN concentrator configuration. ' +
        'This has been ongoing for the past 2 days and is impacting productivity for the remote workforce.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});

// -----------------------------------------------------------
// HP-05: ROD failures — matches multiple MIs + Problem
// Expected: category=software, subcategory=business
// Agent 2: CI = Global Acquisition - New Accounts On-Boarding - E3-Production
// Agent 3: Should match INC030303804/INC030349480 AND PRB0085926
// -----------------------------------------------------------
tests.push({
    test_id: 'HP-05',
    short_description: 'ROD failures impacting instant decisions on Global Acquisition platform',
    description: 'We are seeing ROD (Real-time Online Decision) failures on the Global Acquisition - New Accounts ' +
        'On-Boarding Process Orchestration platform in E3-Production. ' +
        'The failures are directly impacting instant decision processing for new card applications. ' +
        'Error: ROD service returning 503 for approximately 8% of requests. ' +
        'AutoMIMReq has been triggered. Impact is to instant card approval decisions across US market. ' +
        'Downstream systems including GO2 are affected. ' +
        'Customer impact: New applicants are not receiving instant decisions and are being routed to manual review.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat'
});

// -----------------------------------------------------------
// HP-06: Database/oracle — clear DB category, no MI match
// Expected: category=database, subcategory=oracle
// Agent 3: No match expected
// -----------------------------------------------------------
tests.push({
    test_id: 'HP-06',
    short_description: 'Oracle DB connection pool exhausted on production batch server',
    description: 'The Oracle database connection pool on the production batch processing server (BATCHPROD01) ' +
        'is reaching maximum capacity during peak hours. ' +
        'Current pool size: 200 connections, all in use. New connection requests are queuing and timing out after 30 seconds. ' +
        'This is affecting nightly batch jobs and some real-time transaction processing. ' +
        'Database: Oracle 19c, RAC configuration, 2-node cluster. ' +
        'AWR reports show high "connection wait" events. No recent schema changes or application deployments. ' +
        'DBA team has verified no blocking sessions or deadlocks — this appears to be a capacity/configuration issue.',
    impact: '2',
    urgency: '2',
    contact_type: randomContact()
});


// ============================================================
// CREATE ALL INCIDENTS
// ============================================================
gs.info('');
gs.info('============================================================');
gs.info('PHASE 1: HAPPY PATH — Creating ' + tests.length + ' test incidents');
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
    // Leave category, subcategory, business_service, service_offering, cmdb_ci BLANK
    // so the agentic workflow can assign them
    inc.correlation_id = t.test_id;
    inc.correlation_display = 'STRESS_TEST_P1';
    inc.work_notes = '[STRESS TEST] Test ID: ' + t.test_id + ' | Phase: 1 - Happy Path | ' +
        'This incident was created for AI Agent stress testing. Do not modify manually.';
    var sys_id = inc.insert();

    if (!sys_id) {
        gs.warn(t.test_id + ' => INSERT FAILED (check mandatory field rules). Skipping.');
        continue;
    }

    var number = inc.number.toString();
    createdIncidents.push({ test_id: t.test_id, number: number, sys_id: sys_id });
    gs.info(t.test_id + ' => ' + number + ' | ' + t.short_description.substring(0, 60) + '...');
}

gs.info('');
gs.info('============================================================');
gs.info('PHASE 1 COMPLETE — ' + createdIncidents.length + ' incidents created');
gs.info('============================================================');
gs.info('');
gs.info('INC Numbers for tracking spreadsheet:');
for (var j = 0; j < createdIncidents.length; j++) {
    gs.info('  ' + createdIncidents[j].test_id + ': ' + createdIncidents[j].number);
}
gs.info('');
gs.info('NEXT: Trigger the "Triage and categorize ITSM incidents" workflow');
gs.info('for each incident number above via the Now Assist panel.');
