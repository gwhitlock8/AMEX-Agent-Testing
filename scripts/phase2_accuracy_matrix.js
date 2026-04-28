// ============================================================
// PHASE 2: ACCURACY MATRIX TEST INCIDENTS
// ============================================================
// Run in: ServiceNow > System Definition > Scripts - Background
// Purpose: Create 27 incidents testing categorization breadth,
//          service/offering accuracy, and MI/Problem matching.
//   - AC-01 to AC-11: One per category (11 tests)
//   - SO-01 to SO-10: Service offering scenarios (10 tests)
//   - MP-01 to MP-06: MI/Problem matching (6 tests)
// ============================================================

var CALLER_ID = '28745d9d47e4c3d0c0969fd8036d4305';
var contactTypes = ['chat', 'chat', 'chat', 'chat', 'phone', 'email', 'self-service'];

function randomContact() {
    return contactTypes[Math.floor(Math.random() * contactTypes.length)];
}

var tests = [];

// ============================================================
// AC-01 to AC-11: CATEGORY COVERAGE (one per category)
// ============================================================

// AC-01: access/authentication
tests.push({
    test_id: 'AC-01',
    short_description: 'Unable to authenticate to corporate VPN — password not accepted',
    description: 'User is unable to authenticate to the corporate VPN using their Active Directory credentials. ' +
        'The password was recently changed and works fine for email and other AD-integrated services. ' +
        'VPN client shows "Authentication failed - invalid credentials" after entering the new password. ' +
        'User has verified caps lock is off and is typing the password correctly. ' +
        'The old password no longer works either. User needs VPN access urgently for a client meeting.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});

// AC-02: cloud management/server
tests.push({
    test_id: 'AC-02',
    short_description: 'AWS EC2 instance unresponsive in us-east-1 — production application server',
    description: 'Production EC2 instance i-0abc123def456 in us-east-1a is not responding to health checks. ' +
        'CloudWatch shows CPU at 100% for the past 20 minutes. SSH connections are timing out. ' +
        'The instance hosts a critical batch processing application. Load balancer has marked it unhealthy. ' +
        'Other instances in the auto-scaling group are handling traffic but we are at reduced capacity. ' +
        'AWS console shows the instance status check as "impaired". ' +
        'No recent deployments or configuration changes to this instance.',
    impact: '2',
    urgency: '1',
    contact_type: randomContact()
});

// AC-03: database/oracle
tests.push({
    test_id: 'AC-03',
    short_description: 'Oracle database tablespace USERS nearing capacity on PRODDB01',
    description: 'Monitoring alerts indicate that the USERS tablespace on Oracle production database PRODDB01 ' +
        'has reached 92% capacity. Current size is 500GB with only 40GB remaining. ' +
        'Growth rate analysis shows we will hit 100% within 48 hours at current insertion rates. ' +
        'When the tablespace fills, all INSERT operations will fail causing application errors. ' +
        'Database: Oracle 19c, hosted on RHEL 8. DBA team needs to either extend the tablespace or ' +
        'archive/purge old data. This requires a change request for production.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});

// AC-04: database instance/MSFT SQL Instance
tests.push({
    test_id: 'AC-04',
    short_description: 'SQL Server instance MSSQL01 not responding to queries — tempdb full',
    description: 'The Microsoft SQL Server instance MSSQL01 has become unresponsive. ' +
        'Investigation shows that tempdb has filled its allocated disk space causing all queries to fail. ' +
        'Error: "Could not allocate space for object in database tempdb because the filegroup is full." ' +
        'This is a production SQL Server 2019 instance hosting the reporting database. ' +
        'All reports and dashboards that query this instance are currently failing. ' +
        'Approximately 200 users are affected. DBA needs to clear tempdb and investigate the root cause.',
    impact: '1',
    urgency: '2',
    contact_type: 'phone'
});

// AC-05: hardware/monitor
tests.push({
    test_id: 'AC-05',
    short_description: 'Monitor flickering intermittently on docking station — Dell U2722D',
    description: 'User reports that their Dell U2722D monitor connected via USB-C docking station ' +
        'has been flickering intermittently throughout the day. The screen goes black for 1-2 seconds ' +
        'then comes back. This happens approximately every 10-15 minutes. ' +
        'The monitor works fine when connected directly via HDMI without the dock. ' +
        'Other peripherals on the dock (keyboard, mouse) continue to work during the flicker events. ' +
        'Dock model: Dell WD19S. Laptop: Dell Latitude 5530. ' +
        'User has tried different USB-C ports on the dock with the same result.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat'
});

// AC-06: inquiry/email
tests.push({
    test_id: 'AC-06',
    short_description: 'Need help configuring email forwarding rules in Outlook',
    description: 'User is requesting assistance setting up email forwarding rules in Microsoft Outlook. ' +
        'They need to automatically forward emails from a shared mailbox to their personal inbox ' +
        'when the emails contain specific keywords in the subject line. ' +
        'User is not sure how to create server-side rules vs client-side rules and wants guidance ' +
        'on which approach is best for their use case. They also want to know if there are any ' +
        'compliance implications of auto-forwarding from the shared mailbox.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat'
});

// AC-07: network/firewall
tests.push({
    test_id: 'AC-07',
    short_description: 'Firewall blocking traffic to production subnet 10.20.117.0/24',
    description: 'Application team reports that traffic from the application tier (10.10.50.0/24) to the ' +
        'database tier (10.20.117.0/24) is being blocked by the firewall. ' +
        'This started after the firewall rule change window last night (CHG014800001). ' +
        'Affected applications are returning "connection timed out" errors when connecting to database servers. ' +
        'Firewall logs show DENY entries for TCP port 1521 (Oracle) and 1433 (SQL Server) between these subnets. ' +
        'The previous rule allowing this traffic appears to have been inadvertently removed or modified.',
    impact: '1',
    urgency: '1',
    contact_type: 'phone'
});

// AC-08: problem resolved/fix applied
tests.push({
    test_id: 'AC-08',
    short_description: 'Issue previously reported has been fixed by vendor patch — SAP GUI crashes',
    description: 'The SAP GUI crashing issue that was reported last week (INC029999999) has been resolved. ' +
        'SAP released patch note 3301456 which addresses the memory leak causing the crashes. ' +
        'The patch has been applied to all production SAP GUI clients via SCCM deployment. ' +
        'Testing confirms the fix is working — no crashes observed in 48 hours of testing. ' +
        'This ticket is being opened to formally document the resolution and close the loop ' +
        'with the 15 affected users who reported the original issue.',
    impact: '3',
    urgency: '3',
    contact_type: 'email'
});

// AC-09: process/deployment
tests.push({
    test_id: 'AC-09',
    short_description: 'Deployment pipeline failed during staging rollout — Jenkins build error',
    description: 'The CI/CD deployment pipeline for the customer-facing API service failed during ' +
        'the staging environment rollout. Jenkins build #4521 completed compilation successfully but ' +
        'failed during the Docker image build step with error: "COPY failed: file not found in build context." ' +
        'This is blocking the scheduled production release planned for tomorrow morning. ' +
        'The deployment pipeline was working correctly on the previous build (#4520). ' +
        'DevOps team suspects a Dockerfile change in the latest commit may be the cause. ' +
        'Need urgent investigation to unblock the release.',
    impact: '2',
    urgency: '1',
    contact_type: 'chat'
});

// AC-10: software/email
tests.push({
    test_id: 'AC-10',
    short_description: 'Outlook keeps freezing when opening large email attachments',
    description: 'User reports that Microsoft Outlook freezes for 30-60 seconds whenever they try to open ' +
        'email attachments larger than 5MB. The application becomes unresponsive (Not Responding in Task Manager) ' +
        'and then eventually recovers. Smaller attachments open normally. ' +
        'Issue occurs with all file types (PDF, Excel, Word). ' +
        'User has 16GB RAM and disk space is not an issue. Outlook version: Microsoft 365 v2310. ' +
        'Other users in the same office are not experiencing this issue. ' +
        'Clearing the Outlook cache and running /resetnavpane did not help.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat'
});

// AC-11: telephony/phone
tests.push({
    test_id: 'AC-11',
    short_description: 'Desk phone not ringing for incoming calls — Cisco IP Phone 8845',
    description: 'User reports that their Cisco IP Phone 8845 (extension 4-7823) is not ringing for incoming calls. ' +
        'Calls go directly to voicemail. The phone shows as registered on the display and has a dial tone. ' +
        'Outbound calls work normally. The user can see missed call notifications but the phone never rings. ' +
        'Ringer volume is set to maximum. Do Not Disturb is confirmed OFF. ' +
        'The issue started after the user moved to a new desk this morning. ' +
        'Other phones on the same switch/VLAN are working correctly.',
    impact: '3',
    urgency: '2',
    contact_type: 'phone'
});


// ============================================================
// SO-01 to SO-10: SERVICE OFFERING COVERAGE
// ============================================================

// SO-01: Card Replacement — CCP channel (phone contact)
tests.push({
    test_id: 'SO-01',
    short_description: 'Card replacement needed — customer called in reporting lost card',
    description: 'A card member called into the customer care center to report that their American Express ' +
        'Platinum Card has been lost. The card member last used the card yesterday at a restaurant and ' +
        'believes it was left at the venue. They have already contacted the restaurant with no luck. ' +
        'Customer is requesting an immediate card replacement with expedited shipping. ' +
        'Card member has verified their identity through security questions. ' +
        'The customer also wants to confirm that no unauthorized charges have been made since the card was lost.',
    impact: '2',
    urgency: '2',
    contact_type: 'phone'
});

// SO-02: Card Replacement — Mobile channel
tests.push({
    test_id: 'SO-02',
    short_description: 'Card replacement requested via mobile app — damaged card chip not reading',
    description: 'Card member submitted a replacement request through the Amex mobile app. ' +
        'The chip on their American Express Gold Card is damaged and not reading at point-of-sale terminals. ' +
        'Contactless/tap payments still work but chip-insert transactions fail consistently. ' +
        'Customer is requesting a replacement card to be sent to their address on file. ' +
        'Request was initiated through the mobile app card management section. ' +
        'Customer does not need expedited shipping — standard delivery is acceptable.',
    impact: '3',
    urgency: '3',
    contact_type: 'chat'
});

// SO-03: Freeze/Unfreeze Card — Web channel
tests.push({
    test_id: 'SO-03',
    short_description: 'Customer wants to freeze card on website — suspicious activity noticed',
    description: 'Card member logged into americanexpress.com and noticed two unauthorized pending charges ' +
        'on their statement that they do not recognize. The charges are from an online retailer in a country ' +
        'the card member has never visited. Customer wants to immediately freeze their card through the website ' +
        'to prevent additional unauthorized charges while they investigate. ' +
        'The card member will decide whether to dispute the charges after freezing the card. ' +
        'Customer is accessing the website from their home computer.',
    impact: '2',
    urgency: '1',
    contact_type: 'self-service'
});

// SO-04: Pay a Bill — IVR channel
tests.push({
    test_id: 'SO-04',
    short_description: 'Bill payment failed on IVR system — payment not processing',
    description: 'Card member attempted to make a bill payment through the Amex IVR (automated phone system) ' +
        'but the payment is not processing. The IVR confirmed the payment amount and bank account details ' +
        'but then returned an error message: "We are unable to process your payment at this time. ' +
        'Please try again later or speak to a representative." ' +
        'Customer has tried three times over the past hour with the same result. ' +
        'The bank account on file has sufficient funds. The customer prefers using IVR for payments ' +
        'and does not want to switch to the website or app.',
    impact: '2',
    urgency: '2',
    contact_type: 'phone'
});

// SO-05: Reward Points Transfer — no channel specified
tests.push({
    test_id: 'SO-05',
    short_description: 'Rewards points transfer not working — transfer to airline partner failing',
    description: 'Card member is attempting to transfer Membership Rewards points to their Delta SkyMiles account ' +
        'but the transfer is failing. After selecting the transfer amount and confirming, the system displays ' +
        '"Transfer could not be completed. Please try again." ' +
        'The card member has successfully transferred points to Delta in the past. ' +
        'Their Membership Rewards account shows 150,000 available points. ' +
        'The Delta SkyMiles account number on file is correct and active. ' +
        'Customer wants to transfer 50,000 points for an upcoming flight booking.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});

// SO-06: Offer eligibility/enrollment — Mobile channel (should also match MI)
tests.push({
    test_id: 'SO-06',
    short_description: 'Offer enrollment errors on mobile app — Amex Offers not loading for UK card members',
    description: 'UK-based card members are reporting that Amex Offers are not loading in the mobile app. ' +
        'When navigating to the Offers section, users see a spinning loader that never resolves, followed by ' +
        '"Unable to load offers. Please try again." ' +
        'This is affecting offer enrollment for UK market customers. Card members cannot view or enroll in ' +
        'any available offers including shopping, dining, and travel categories. ' +
        'The issue appears to be isolated to UK card members — US card members report offers loading normally. ' +
        'Approximately 500 complaints received through customer service in the past 2 hours.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat'
});

// SO-07: Statement — no channel specified (vague)
tests.push({
    test_id: 'SO-07',
    short_description: 'Customer cannot view statement — page shows blank after login',
    description: 'Card member reports that when they try to view their monthly statement, the page loads ' +
        'but the statement content area is completely blank. The account summary and balance show correctly ' +
        'at the top of the page but the detailed transaction list and statement PDF are not rendering. ' +
        'This has been happening for the past 3 days. Previous months\' statements are also blank. ' +
        'Customer has tried clearing browser cache and using a different browser with the same result. ' +
        'The card member needs to review transactions for their expense report due tomorrow.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});

// SO-08: vPayments — APIGEE channel
tests.push({
    test_id: 'SO-08',
    short_description: 'vPayment processing errors — API returning 502 for virtual card generation',
    description: 'The vPayment (virtual payment) system is returning 502 Bad Gateway errors when merchants ' +
        'attempt to generate virtual card numbers through the APIGEE API gateway. ' +
        'Error rate: approximately 30% of requests failing over the past 45 minutes. ' +
        'Affected endpoint: /vPayments/v2/generateVirtualCard. ' +
        'Merchants are unable to issue virtual cards for B2B payments. ' +
        'This is impacting corporate clients who rely on virtual card numbers for vendor payments. ' +
        'APIGEE dashboard shows increased latency on the upstream vPayment service.',
    impact: '1',
    urgency: '1',
    contact_type: randomContact()
});

// SO-09: PNR Ticketing — niche service
tests.push({
    test_id: 'SO-09',
    short_description: 'PNR ticketing system down — travel agents unable to issue tickets',
    description: 'The PNR (Passenger Name Record) ticketing system used by Amex Travel agents is down. ' +
        'Agents are unable to issue airline tickets for customer bookings. The web interface shows ' +
        '"Service Unavailable" when attempting to access the ticketing module. ' +
        'This has been down for approximately 90 minutes. There are currently 45 pending ticket ' +
        'issuance requests queued up. Customers with confirmed bookings are waiting for their e-tickets. ' +
        'The travel team has been manually calling airlines as a workaround but this is slow and unsustainable. ' +
        'GDS connectivity appears to be functioning — the issue seems to be on the Amex ticketing layer.',
    impact: '1',
    urgency: '1',
    contact_type: 'phone'
});

// SO-10: Caller-assigned CI test
tests.push({
    test_id: 'SO-10',
    short_description: 'Application performance degraded — response times exceeding SLA thresholds',
    description: 'The internal employee self-service portal is experiencing significant performance degradation. ' +
        'Page load times have increased from under 2 seconds to over 15 seconds. ' +
        'API response times are exceeding the 5-second SLA threshold. ' +
        'The issue affects all modules of the self-service portal including HR, IT, and Facilities requests. ' +
        'Approximately 2,000 employees use this portal daily. ' +
        'Backend logs show database query times are normal — the bottleneck appears to be at the application ' +
        'server layer. No recent code deployments or infrastructure changes.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});


// ============================================================
// MP-01 to MP-06: MAJOR INCIDENT / PROBLEM MATCHING
// ============================================================

// MP-01: Should match MI INC030309271 + PRB0085846 (Card Replacement Failures)
tests.push({
    test_id: 'MP-01',
    short_description: 'Card replacement failures on mobile platform — customers unable to request replacements',
    description: 'Customers are reporting failures when attempting to request card replacements through the ' +
        'mobile app and Mobile Service Layer. The replacement request flow completes the card selection step ' +
        'but fails at the submission stage with a generic error. ' +
        'This is affecting all card types across the mobile channel. ' +
        'Failure rate is approximately 40% of replacement attempts on mobile. ' +
        'Web channel card replacements appear to be working normally. ' +
        'Customer service is receiving a high volume of calls from frustrated card members.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat'
});

// MP-02: Should match MI INC030352324 + PRB0085929 (giftcards/catalog)
tests.push({
    test_id: 'MP-02',
    short_description: 'Gift card catalog API errors — /giftcards/v1/catalog returning failures',
    description: 'The gift card catalog API endpoint (/giftcards/v1/catalog) is returning errors on the ' +
        'Mobile Service Layer. Customers browsing gift card options in the app are seeing empty catalogs ' +
        'or error messages. The /giftcards/v1/terms/{brandId} endpoint is also failing intermittently. ' +
        'This is preventing customers from purchasing gift cards through the Amex app. ' +
        'Spike in failures observed starting approximately 1 hour ago. ' +
        'Gift card purchases through the website appear unaffected.',
    impact: '1',
    urgency: '2',
    contact_type: 'chat'
});

// MP-03: Should match MI INC030326287 + PRB0085885/PRB0085824 (ISP Manila)
tests.push({
    test_id: 'MP-03',
    short_description: 'ISP portal not loading for Manila CCPs — agents unable to service accounts',
    description: 'Customer Care Professionals (CCPs) in the Manila center are reporting that the Intuitive ' +
        'Servicing Portal (ISP) is not loading customer accounts. When agents search for a card member account, ' +
        'the portal returns "Unable to load account data" or displays a blank page. ' +
        'This is affecting all CCPs in the Manila CEN (Customer Engagement Network). ' +
        'Agents cannot view account details, process transactions, or assist card members. ' +
        'The ISP portal is functioning normally for CCPs in other locations (US, UK, India). ' +
        'Approximately 300 agents in Manila are currently unable to work.',
    impact: '1',
    urgency: '1',
    contact_type: 'chat'
});

// MP-04: Should match MI INC030340044 + PRB0085913 (ROD failures AUD)
tests.push({
    test_id: 'MP-04',
    short_description: 'ROD processing failures for Australian market — instant decisions impacted',
    description: 'ROD (Real-time Online Decision) processing failures are specifically impacting the Australian ' +
        'market on the Global Acquisition platform. New card applications from Australian applicants are not ' +
        'receiving instant decisions. The ROD service is timing out for AUD-market requests while other markets ' +
        'appear to be processing normally. ' +
        'Impact: Australian applicants are being routed to manual review instead of instant approval/decline. ' +
        'This is affecting the acquisition funnel and customer experience for the AU market. ' +
        'Failure rate for AUD specifically: approximately 25% of ROD requests.',
    impact: '1',
    urgency: '2',
    contact_type: randomContact()
});

// MP-05: Should match MI INC030324586 or INC030330368 + PRB0085882 (Loungefinder)
tests.push({
    test_id: 'MP-05',
    short_description: 'Lounge finder app not returning results — Centurion Lounge search broken',
    description: 'The Lounge Finder feature in the Amex mobile app is not returning any results when ' +
        'card members search for airport lounges. Searches for any airport code return "No lounges found" ' +
        'even for airports with known Centurion Lounges (JFK, LAX, DFW). ' +
        'The lounge finder was working correctly yesterday. ' +
        'This is impacting Platinum and Centurion card members who rely on this feature for travel planning. ' +
        'The Lounge Finder feature is served through the Mobile Service Layer. ' +
        'Card members are calling in to ask about lounge access because the app is not helping.',
    impact: '2',
    urgency: '2',
    contact_type: 'chat'
});

// MP-06: NO match expected — completely unrelated to any active MI/Problem
tests.push({
    test_id: 'MP-06',
    short_description: 'SAP payroll calculation error — overtime hours not computed correctly',
    description: 'The SAP HR/Payroll module is incorrectly calculating overtime hours for hourly employees. ' +
        'Hours worked beyond 40 in a week are being calculated at the regular rate instead of 1.5x overtime rate. ' +
        'This was discovered during the payroll review for the current pay period. ' +
        'Approximately 150 hourly employees are affected. The error appears to be in the wage type ' +
        'configuration that was modified during last month\'s SAP support pack upgrade. ' +
        'Payroll processing is due in 3 days — need to resolve before the next pay run. ' +
        'HR and Finance teams have been notified.',
    impact: '2',
    urgency: '1',
    contact_type: 'email'
});


// ============================================================
// CREATE ALL INCIDENTS
// ============================================================
gs.info('');
gs.info('============================================================');
gs.info('PHASE 2: ACCURACY MATRIX — Creating ' + tests.length + ' test incidents');
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
    inc.work_notes = '[STRESS TEST] Test ID: ' + t.test_id + ' | Phase: 2 - Accuracy Matrix | ' +
        'This incident was created for AI Agent stress testing. Do not modify manually.';
    var sys_id = inc.insert();

    var number = inc.number.toString();
    createdIncidents.push({ test_id: t.test_id, number: number, sys_id: sys_id });
    gs.info(t.test_id + ' => ' + number + ' | ' + t.short_description.substring(0, 60) + '...');
}

gs.info('');
gs.info('============================================================');
gs.info('PHASE 2 COMPLETE — ' + createdIncidents.length + ' incidents created');
gs.info('============================================================');
gs.info('');
gs.info('INC Numbers for tracking spreadsheet:');
gs.info('--- Category Coverage (AC) ---');
for (var j = 0; j < createdIncidents.length; j++) {
    if (createdIncidents[j].test_id.indexOf('AC') === 0) {
        gs.info('  ' + createdIncidents[j].test_id + ': ' + createdIncidents[j].number);
    }
}
gs.info('--- Service Offering (SO) ---');
for (var k = 0; k < createdIncidents.length; k++) {
    if (createdIncidents[k].test_id.indexOf('SO') === 0) {
        gs.info('  ' + createdIncidents[k].test_id + ': ' + createdIncidents[k].number);
    }
}
gs.info('--- MI/Problem Matching (MP) ---');
for (var m = 0; m < createdIncidents.length; m++) {
    if (createdIncidents[m].test_id.indexOf('MP') === 0) {
        gs.info('  ' + createdIncidents[m].test_id + ': ' + createdIncidents[m].number);
    }
}
gs.info('');
gs.info('NEXT: Trigger the "Triage and categorize ITSM incidents" workflow');
gs.info('for each incident number above via the Now Assist panel.');
