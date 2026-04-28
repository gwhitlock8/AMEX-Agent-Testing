// ============================================================
// PHASE 5: VOLUME / PERFORMANCE TEST INCIDENTS (30 incidents)
// ============================================================
// Run in: ServiceNow > System Definition > Scripts - Background
// Purpose: Create 30 randomized incidents for throughput,
//          consistency, and response time testing.
//
// Mix: ~40% software, ~15% hardware, ~15% network, ~10% database,
//      ~10% access, ~10% other (cloud mgmt, telephony, inquiry, process)
// Contact type: weighted random, heavy on chat
//
// TESTING INSTRUCTIONS:
//   1. Run incidents through the workflow ONE AT A TIME sequentially
//   2. Record start/end timestamps for each
//   3. Spot-check accuracy on every 5th incident (VL-05, VL-10, etc.)
//   4. Flag any timeouts, errors, or incomplete agent runs
// ============================================================

var CALLER_ID = '28745d9d47e4c3d0c0969fd8036d4305';

// Weighted contact type — ~50% chat, 20% phone, 15% email, 10% self-service, 5% walk-in
var contactPool = [
    'chat', 'chat', 'chat', 'chat', 'chat', 'chat', 'chat', 'chat', 'chat', 'chat',
    'phone', 'phone', 'phone', 'phone',
    'email', 'email', 'email',
    'self-service', 'self-service',
    'walk-in'
];

function randomContact() {
    return contactPool[Math.floor(Math.random() * contactPool.length)];
}

function randomImpact() {
    // 30% P1, 40% P2, 30% P3
    var r = Math.random();
    if (r < 0.3) return '1';
    if (r < 0.7) return '2';
    return '3';
}

var tests = [
    // --- SOFTWARE (12 incidents — ~40%) ---
    {
        test_id: 'VL-01',
        short_description: 'Amex app crashes on startup for Android 14 users',
        description: 'Multiple card members on Android 14 devices report the Amex mobile app crashes immediately after the splash screen. Force-stop and clearing cache does not help. Reinstall temporarily fixes the issue but it recurs after 1-2 days. App version: 8.72.1. Affecting Samsung Galaxy S24 and Google Pixel 8 devices. Approximately 2,000 crash reports received in the past 24 hours via Firebase Crashlytics.'
    },
    {
        test_id: 'VL-02',
        short_description: 'Online statement PDF download returning blank pages',
        description: 'Card members downloading their monthly statement as PDF from americanexpress.com are getting blank pages. The PDF file generates and downloads successfully but when opened, all pages are blank. This affects statements from the last 3 months. HTML statement view works correctly — only the PDF export is broken. Browser: Chrome 120, Edge 120. Started after the last website deployment on Friday.'
    },
    {
        test_id: 'VL-03',
        short_description: 'Two-factor authentication SMS codes not being delivered',
        description: 'Card members are not receiving SMS verification codes when logging in or making high-value transactions. The system shows "Code sent" but customers never receive it. This is affecting all carriers (AT&T, Verizon, T-Mobile). Email-based 2FA codes are working normally. Impacting approximately 5% of login attempts that require step-up authentication.'
    },
    {
        test_id: 'VL-04',
        short_description: 'Corporate card expense categorization engine returning incorrect merchant codes',
        description: 'The automated expense categorization system for corporate cards is mapping merchant transactions to incorrect MCC (Merchant Category Codes). Restaurant transactions are being categorized as "Office Supplies" and travel expenses as "Entertainment." This is affecting corporate card holders\' expense reports and causing reconciliation issues for finance teams.'
    },
    {
        test_id: 'VL-05',
        short_description: 'Autopay configuration changes not saving on web portal',
        description: 'Card members attempting to modify their autopay settings through the web portal are seeing their changes revert after saving. The confirmation page shows "Settings updated" but returning to the autopay page shows the old configuration. This is causing card members to miss payments because they believe autopay is configured correctly.'
    },
    {
        test_id: 'VL-06',
        short_description: 'Real-time transaction notifications delayed by 4+ hours',
        description: 'Push notifications for card transactions are being delivered 4-6 hours after the transaction occurs instead of in real-time. This is affecting the mobile app notification system. Email alerts are also delayed but by a shorter window (1-2 hours). Card members rely on real-time alerts for fraud detection and spending awareness.'
    },
    {
        test_id: 'VL-07',
        short_description: 'Travel booking integration failing — hotel reservations not confirming',
        description: 'The Amex Travel booking system is failing to confirm hotel reservations. Customers complete the booking flow and receive a booking reference number, but the reservation is not being transmitted to the hotel. Multiple hotels have reported they have no record of Amex-booked reservations from the past 48 hours. The travel booking platform relies on the GDS integration layer.'
    },
    {
        test_id: 'VL-08',
        short_description: 'International currency conversion showing incorrect exchange rates',
        description: 'Card members making international purchases are seeing incorrect exchange rates on their statements. The displayed rate differs significantly (2-5%) from the actual market rate at the time of transaction. This is affecting all international transactions processed through the authorization platform. Finance team has confirmed the rates being applied do not match the daily FX rate feed.'
    },
    {
        test_id: 'VL-09',
        short_description: 'Chat bot returning "I don\'t understand" for common account inquiries',
        description: 'The Amex virtual assistant (Ask Amex chat bot) is failing to understand common customer inquiries like "What is my balance?" and "When is my payment due?" The bot responds with "I\'m sorry, I don\'t understand your request" for queries that were previously handled successfully. The NLU model appears to have degraded after the last update.'
    },
    {
        test_id: 'VL-10',
        short_description: 'Spending limit increase requests timing out in processing queue',
        description: 'Customer requests for temporary and permanent spending limit increases are timing out in the processing queue. The request is accepted and enters the review pipeline but never completes — status remains "In Review" indefinitely. Approximately 300 pending requests are stuck. The credit decisioning engine appears to be the bottleneck.'
    },
    {
        test_id: 'VL-11',
        short_description: 'Supplementary card application form validation errors',
        description: 'Applications for supplementary cards are failing form validation even with correct data. The web form rejects valid addresses, phone numbers, and dates of birth with "Invalid format" errors. This is preventing primary card members from adding authorized users to their accounts. The form validation rules appear to have been broken by a recent UI update.'
    },
    {
        test_id: 'VL-12',
        short_description: 'Account alerts configuration page not loading in mobile app',
        description: 'The account alerts and notification preferences page in the mobile app shows a perpetual loading spinner. Card members cannot view or modify their alert settings (transaction notifications, payment reminders, security alerts). The settings page was redesigned last sprint and the issue appears to be in the new React Native component.'
    },
    // --- HARDWARE (4 incidents — ~13%) ---
    {
        test_id: 'VL-13',
        short_description: 'Multiple workstations blue-screening after Windows update KB5034441',
        description: 'Approximately 50 workstations across the Phoenix office are experiencing Blue Screen of Death (BSOD) errors after receiving Windows Update KB5034441 last night. The STOP code is KERNEL_DATA_INPAGE_ERROR. Workstations reboot but BSOD again within 30 minutes. All affected machines are Dell OptiPlex 7090 with NVMe SSDs. SCCM deployment was pushed to the Phoenix OU overnight.'
    },
    {
        test_id: 'VL-14',
        short_description: 'Badge readers not working at Building C entrance — employees locked out',
        description: 'The HID badge readers at all entrances to Building C (200 Vesey St) stopped working at approximately 6:00 AM. Employees are unable to badge in. Security is manually checking IDs and admitting employees. The badge system control panel in the security office shows "Communication Error" for all Building C readers. Buildings A and B are unaffected.'
    },
    {
        test_id: 'VL-15',
        short_description: 'Conference room A/V system audio feedback loop during video calls',
        description: 'The Crestron A/V system in Conference Room 4B-201 is producing a loud audio feedback loop when joining Microsoft Teams meetings. The echo cancellation appears to be malfunctioning. Participants on the call hear unbearable screeching. The room has been taken out of service. This is a critical meeting room used for client presentations.'
    },
    {
        test_id: 'VL-16',
        short_description: 'Laptop batteries swelling on Dell Latitude 5540 fleet',
        description: 'IT asset management has identified 12 Dell Latitude 5540 laptops with visibly swollen batteries in the past week. The affected units were all purchased in Q2 2025 batch. Safety concern: swollen lithium batteries are a fire hazard. Need to identify all units in the affected batch and issue recall. Dell support case has been opened but turnaround is 5-7 days.'
    },
    // --- NETWORK (5 incidents — ~17%) ---
    {
        test_id: 'VL-17',
        short_description: 'WiFi dropping in London office 2nd and 3rd floors',
        description: 'Employees on the 2nd and 3rd floors of the London office (33 Old Broad St) are experiencing frequent WiFi disconnections. The Aruba access points show high channel utilization and interference. Signal strength drops to -80dBm in multiple locations. A nearby construction project started this week and may be introducing RF interference. Approximately 150 employees affected.'
    },
    {
        test_id: 'VL-18',
        short_description: 'DNS resolution failures for internal .aexp.com domains',
        description: 'Internal DNS resolution is failing intermittently for .aexp.com domain names. Users get "DNS_PROBE_FINISHED_NXDOMAIN" errors when accessing internal applications. External DNS (google.com, etc.) resolves fine. The issue appears to be with the internal DNS forwarders. Affects all offices connected to the primary DNS infrastructure. Approximately 30% of internal DNS queries are failing.'
    },
    {
        test_id: 'VL-19',
        short_description: 'MPLS link saturation between Phoenix and New York data centers',
        description: 'The primary MPLS circuit between the Phoenix data center and New York data center is at 95% utilization during business hours. Application response times for NY users accessing Phoenix-hosted applications have increased 3x. QoS policies are prioritizing voice traffic but data traffic is being throttled significantly. The circuit was upgraded 6 months ago and should have sufficient capacity.'
    },
    {
        test_id: 'VL-20',
        short_description: 'Load balancer health checks failing for payment processing cluster',
        description: 'The F5 load balancer health check probes for the payment processing server cluster are failing intermittently. 3 of 8 servers are being marked as down by the LB despite being functional. This is causing uneven traffic distribution and increased latency on the remaining 5 servers. The health check endpoint (/healthz) returns 200 when queried directly but the LB reports failures.'
    },
    {
        test_id: 'VL-21',
        short_description: 'IPsec VPN tunnel to partner bank flapping every 2 hours',
        description: 'The site-to-site IPsec VPN tunnel to partner bank (Banco Santander) is flapping approximately every 2 hours. The tunnel drops for 30-60 seconds before re-establishing. During the downtime, all transaction relay between Amex and the partner is interrupted. IKE phase 2 rekey appears to be failing intermittently. Both sides have confirmed matching SA parameters.'
    },
    // --- DATABASE (3 incidents — ~10%) ---
    {
        test_id: 'VL-22',
        short_description: 'MongoDB replica set election loop causing write failures',
        description: 'The MongoDB replica set for the customer preferences service is stuck in an election loop. The primary keeps stepping down and new elections are triggered every 30-45 seconds. During each election (which takes 10-15 seconds), all write operations fail. Read operations using secondary preference are working. The oplog appears to be growing rapidly. Cluster: 3-node replica set on MongoDB 6.0.'
    },
    {
        test_id: 'VL-23',
        short_description: 'PostgreSQL query performance degraded after vacuum analyze',
        description: 'Following a scheduled VACUUM ANALYZE on the transaction history database, several critical queries have seen a 10x performance regression. The query planner is choosing sequential scans instead of index scans on the transaction_records table (2.1 billion rows). Running ANALYZE again has not fixed the statistics. The table was recently partitioned and the statistics may not reflect the new partition layout.'
    },
    {
        test_id: 'VL-24',
        short_description: 'Redis cluster split-brain detected — data inconsistency risk',
        description: 'Monitoring has detected a split-brain condition in the Redis cluster used for session management. Two nodes believe they are the primary. This is causing data inconsistency — some customer sessions are being lost and users are being randomly logged out. The cluster uses Redis Sentinel for failover. The sentinel quorum may have been broken during last night\'s network maintenance window.'
    },
    // --- ACCESS/SECURITY (3 incidents — ~10%) ---
    {
        test_id: 'VL-25',
        short_description: 'Active Directory account lockouts spike across multiple offices',
        description: 'There has been a 500% increase in AD account lockouts across US offices in the past 2 hours. Affected users are being locked out after 3 failed attempts despite not entering incorrect passwords. Security team suspects a credential stuffing attack or a misconfigured service account cycling through stale passwords. SIEM has flagged the lockout pattern as anomalous.'
    },
    {
        test_id: 'VL-26',
        short_description: 'SSL certificate expired on customer-facing API gateway',
        description: 'The SSL/TLS certificate on the external API gateway (api.americanexpress.com) expired at midnight. External partners and merchants integrating with Amex APIs are receiving certificate errors. Most modern HTTP clients are rejecting the connection entirely. The certificate was supposed to auto-renew via Let\'s Encrypt but the renewal job failed silently 30 days ago.'
    },
    {
        test_id: 'VL-27',
        short_description: 'Unauthorized access detected — service account with elevated privileges',
        description: 'Security operations detected unusual activity from service account svc_batch_etl. The account was used to access 15 databases it does not normally connect to, including the card member PII database. The access occurred at 3:00 AM from an IP address not in the service account\'s allowed list. The account\'s password was last changed 180 days ago. Investigation is underway to determine if this is a compromised credential.'
    },
    // --- OTHER (3 incidents — ~10%) ---
    {
        test_id: 'VL-28',
        short_description: 'IVR system playing incorrect menu prompts for Spanish-speaking callers',
        description: 'The IVR system is playing English-language menu prompts to callers who selected Spanish (option 2) at the language selection step. The Spanish audio files appear to have been overwritten or misconfigured during last week\'s IVR platform update. This is affecting all Spanish-speaking callers to the US customer service number. Approximately 15% of inbound calls select Spanish.'
    },
    {
        test_id: 'VL-29',
        short_description: 'Cloud auto-scaling not triggering during peak transaction hours',
        description: 'The AWS auto-scaling group for the transaction processing service is not scaling up during peak hours (11am-2pm EST). CloudWatch alarms for CPU > 70% are firing but no new instances are being launched. The auto-scaling policy was last modified during the cost optimization initiative. Current capacity: 8 instances at 90% CPU. Required capacity: estimated 14 instances based on traffic pattern.'
    },
    {
        test_id: 'VL-30',
        short_description: 'Change management approval workflow stuck — 45 changes pending approval',
        description: 'The change management approval workflow in ServiceNow has stopped processing. 45 change requests are stuck in "Waiting for Approval" state. The CAB (Change Advisory Board) approval step is not routing to the correct approval group. This was working correctly until the ServiceNow platform update last weekend. Change freeze is approaching in 3 days and teams need their changes approved.'
    }
];


// ============================================================
// CREATE ALL INCIDENTS
// ============================================================
gs.info('');
gs.info('============================================================');
gs.info('PHASE 5: VOLUME — Creating ' + tests.length + ' test incidents');
gs.info('============================================================');

var createdIncidents = [];

for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var inc = new GlideRecord('incident');
    inc.initialize();
    inc.caller_id = CALLER_ID;
    inc.short_description = t.short_description;
    inc.description = t.description;
    inc.impact = randomImpact();
    inc.urgency = randomImpact();
    inc.contact_type = randomContact();
    inc.work_notes = '[STRESS TEST] Test ID: ' + t.test_id + ' | Phase: 5 - Volume | ' +
        'This incident was created for AI Agent volume/performance testing.';
    var sys_id = inc.insert();

    var number = inc.number.toString();
    createdIncidents.push({ test_id: t.test_id, number: number, sys_id: sys_id });
    gs.info(t.test_id + ' => ' + number + ' | ' + t.short_description.substring(0, 60) + '...');
}

gs.info('');
gs.info('============================================================');
gs.info('PHASE 5 COMPLETE — ' + createdIncidents.length + ' incidents created');
gs.info('============================================================');
gs.info('');
gs.info('INC Numbers for tracking spreadsheet:');
for (var j = 0; j < createdIncidents.length; j++) {
    gs.info('  ' + createdIncidents[j].test_id + ': ' + createdIncidents[j].number);
}
gs.info('');
gs.info('TESTING INSTRUCTIONS:');
gs.info('  1. Run incidents through the workflow ONE AT A TIME, sequentially.');
gs.info('  2. For each: record start time (trigger) and end time (last agent completes).');
gs.info('  3. Spot-check accuracy in detail on every 5th incident:');
gs.info('     VL-05, VL-10, VL-15, VL-20, VL-25, VL-30');
gs.info('  4. For all others: quick check that all 3 agents completed (work notes present).');
gs.info('  5. Flag any incidents where agents timed out, errored, or produced no output.');
gs.info('');
gs.info('PERFORMANCE METRICS TO TRACK:');
gs.info('  - Average execution time across all 30 incidents');
gs.info('  - P95 execution time (95th percentile)');
gs.info('  - Agent completion rate (% where all 3 completed)');
gs.info('  - Accuracy rate on spot-checked incidents');
gs.info('  - Error/timeout count');
