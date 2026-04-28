// ============================================================
// PHASE 2 VALIDATION: Accuracy Matrix Results Checker
// ============================================================
// Run AFTER triggering the agentic workflow on all Phase 2 incidents.
//
// Validates:
//   AC-01 to AC-11: Category/subcategory accuracy per category
//   SO-01 to SO-10: Service/offering classification accuracy
//   MP-01 to MP-06: MI/Problem linking accuracy
// ============================================================

var EXPECTED = {
    // --- Category Coverage ---
    'AC-01': { category: 'access', subcategory: 'authentication', mi_match: false, prb_match: false,
               notes: 'access/authentication' },
    'AC-02': { category: 'cloud management', subcategory: 'server', mi_match: false, prb_match: false,
               notes: 'cloud management/server' },
    'AC-03': { category: 'database', subcategory: 'oracle', mi_match: false, prb_match: false,
               notes: 'database/oracle' },
    'AC-04': { category: 'database instance', subcategory_options: ['MSFT sql instance', 'mssql'],
               mi_match: false, prb_match: false,
               notes: 'database instance/MSFT SQL Instance' },
    'AC-05': { category: 'hardware', subcategory: 'monitor', mi_match: false, prb_match: false,
               notes: 'hardware/monitor' },
    'AC-06': { category: 'inquiry', subcategory: 'email', mi_match: false, prb_match: false,
               notes: 'inquiry/email' },
    'AC-07': { category: 'network', subcategory: 'firewall', mi_match: false, prb_match: false,
               notes: 'network/firewall' },
    'AC-08': { category: 'problem resolved', subcategory: 'fix applied', mi_match: false, prb_match: false,
               notes: 'problem resolved/fix applied' },
    'AC-09': { category: 'process', subcategory: 'deployment', mi_match: false, prb_match: false,
               notes: 'process/deployment' },
    'AC-10': { category: 'software', subcategory: 'email', mi_match: false, prb_match: false,
               notes: 'software/email' },
    'AC-11': { category: 'telephony', subcategory: 'phone', mi_match: false, prb_match: false,
               notes: 'telephony/phone' },

    // --- Service Offering Coverage ---
    'SO-01': { category_any: true, service_contains: 'Card Replacement', offering_contains: 'CCP',
               mi_match: false, prb_match: false,
               notes: 'Card Replacement - CCP channel (phone contact)' },
    'SO-02': { category_any: true, service_contains: 'Card Replacement', offering_contains: 'Mobile',
               mi_match: false, prb_match: false,
               notes: 'Card Replacement - Mobile channel' },
    'SO-03': { category_any: true, service_contains: 'Freeze', offering_contains: 'Web',
               mi_match: false, prb_match: false,
               notes: 'Freeze/Unfreeze Card - Web channel' },
    'SO-04': { category_any: true, service_contains: 'Pay a Bill', offering_contains: 'IVR',
               mi_match: false, prb_match: false,
               notes: 'Pay a Bill (Consumer) - IVR channel' },
    'SO-05': { category_any: true, service_contains: 'Reward', offering_any: true,
               mi_match: false, prb_match: false,
               notes: 'Reward Points Transfer — no specific channel, observe choice' },
    'SO-06': { category_any: true, service_contains: 'Offer', offering_contains: 'Mobile',
               mi_match: true, mi_number_contains: 'INC030340795', prb_match: false,
               notes: 'Offer eligibility/enrollment - Mobile + MI match' },
    'SO-07': { category_any: true, service_contains: 'Statement', offering_any: true,
               mi_match: false, prb_match: false,
               notes: 'Statement — vague, observe channel selection' },
    'SO-08': { category_any: true, service_contains: 'vPayment', offering_contains: 'APIGEE',
               mi_match: false, prb_match: false,
               notes: 'vPayments - APIGEE' },
    'SO-09': { category_any: true, service_contains: 'PNR', offering_contains: 'Web',
               mi_match: false, prb_match: false,
               notes: 'PNR Ticketing - Web' },
    'SO-10': { category_any: true, service_any: true, offering_any: true,
               mi_match: false, prb_match: false,
               notes: 'Caller-assigned CI fallback test — observe behavior' },

    // --- MI/Problem Matching ---
    'MP-01': { category_any: true, mi_match: true, mi_number_contains: 'INC030309271',
               prb_match: true, prb_number_contains: 'PRB0085846',
               ci_contains: 'Mobile Service Layer',
               notes: 'Card Replacement Failures — MI + PRB match' },
    'MP-02': { category_any: true, mi_match: true, mi_number_contains: 'INC030352324',
               prb_match: true, prb_number_contains: 'PRB0085929',
               notes: 'Gift card catalog — MI + PRB match' },
    'MP-03': { category_any: true, mi_match: true, mi_number_contains: 'INC030326287',
               prb_match: true, prb_number_contains: 'PRB008588',  // 5885 or 5824
               ci_contains: 'Intuitive Servicing',
               notes: 'ISP Manila — MI + multiple PRB candidates' },
    'MP-04': { category_any: true, mi_match: true, mi_number_contains: 'INC030340',
               prb_match: true, prb_number_contains: 'PRB0085913',
               notes: 'ROD AUD — exact market-specific match' },
    'MP-05': { category_any: true, mi_match: true, mi_number_contains: 'INC03032',  // 4586 or 0368
               prb_match: true, prb_number_contains: 'PRB0085882',
               notes: 'Loungefinder — two active MIs, one PRB' },
    'MP-06': { category_any: true, mi_match: false, prb_match: false,
               notes: 'SAP payroll — NO match expected' }
};


// ============================================================
// HELPER FUNCTIONS (same as Phase 1)
// ============================================================

function findTestIncidents(correlationDisplay) {
    var incidents = {};
    var gr = new GlideRecord('incident');
    gr.addQuery('correlation_display', correlationDisplay);
    gr.query();
    while (gr.next()) {
        var testId = gr.correlation_id.toString();
        if (testId) {
            incidents[testId] = {
                sys_id: gr.sys_id.toString(),
                number: gr.number.toString(),
                category: gr.category.toString(),
                subcategory: gr.subcategory.toString(),
                business_service: gr.business_service.getDisplayValue(),
                service_offering: gr.service_offering.getDisplayValue(),
                cmdb_ci: gr.cmdb_ci.getDisplayValue(),
                state: gr.incident_state.toString(),
                problem_id: gr.problem_id.toString(),
                problem_display: gr.problem_id.getDisplayValue()
            };
        }
    }
    return incidents;
}

function getMILink(incidentSysId) {
    var inc = new GlideRecord('incident');
    if (inc.get(incidentSysId)) {
        if (inc.parent_incident && inc.parent_incident.toString()) {
            var parent = new GlideRecord('incident');
            if (parent.get(inc.parent_incident.toString())) {
                return { linked: true, mi_number: parent.number.toString(), mi_short_desc: parent.short_description.toString() };
            }
        }
    }
    var rel = new GlideRecord('task_rel_task');
    if (rel.isValid()) {
        rel.addQuery('child', incidentSysId);
        rel.query();
        while (rel.next()) {
            var parentTask = new GlideRecord('incident');
            if (parentTask.get(rel.parent.toString())) {
                if (parentTask.major_incident_state && parentTask.major_incident_state.toString()) {
                    return { linked: true, mi_number: parentTask.number.toString(), mi_short_desc: parentTask.short_description.toString() };
                }
            }
        }
    }
    return { linked: false, mi_number: '', mi_short_desc: '' };
}

function checkWorkNotes(incidentSysId) {
    var notes = { agent1: false, agent2: false, agent3: false, count: 0 };
    var gr = new GlideRecord('sys_journal_field');
    gr.addQuery('element_id', incidentSysId);
    gr.addQuery('element', 'work_notes');
    gr.addQuery('name', 'incident');
    gr.query();
    while (gr.next()) {
        var text = gr.value.toString().toLowerCase();
        notes.count++;
        if (text.indexOf('categor') > -1 || text.indexOf('classif') > -1) notes.agent1 = true;
        if (text.indexOf('service') > -1 || text.indexOf('offering') > -1) notes.agent2 = true;
        if (text.indexOf('major') > -1 || text.indexOf('problem') > -1 || text.indexOf('link') > -1) notes.agent3 = true;
    }
    return notes;
}

function getAgentExecutions(incidentSysId) {
    var executions = [];
    var tables = ['sn_agent_execution', 'sn_aia_execution'];
    for (var t = 0; t < tables.length; t++) {
        var gr = new GlideRecord(tables[t]);
        if (!gr.isValid()) continue;
        gr.addQuery('source_record', incidentSysId);
        gr.orderBy('sys_created_on');
        gr.query();
        while (gr.next()) {
            executions.push({
                agent_name: gr.getDisplayValue('agent') || gr.getDisplayValue('name') || 'unknown',
                state: gr.getDisplayValue('state') || '',
                started: gr.getValue('sys_created_on') || '',
                ended: gr.getValue('completed_on') || gr.getValue('sys_updated_on') || ''
            });
        }
        if (executions.length > 0) break;
    }
    return executions;
}


// ============================================================
// MAIN VALIDATION
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 2 VALIDATION: Accuracy Matrix Results            ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
gs.info('');

var incidents = findTestIncidents('STRESS_TEST_P2');
var testIds = Object.keys(EXPECTED);
var totalPass = 0;
var totalFail = 0;
var totalWarn = 0;
var sectionResults = { AC: { pass: 0, fail: 0 }, SO: { pass: 0, fail: 0 }, MP: { pass: 0, fail: 0 } };
var results = [];

for (var i = 0; i < testIds.length; i++) {
    var testId = testIds[i];
    var expected = EXPECTED[testId];
    var actual = incidents[testId];
    var section = testId.substring(0, 2);

    gs.info('────────────────────────────────────────────────────');
    gs.info('TEST: ' + testId + ' | ' + expected.notes);

    if (!actual) {
        gs.info('  ❌ INCIDENT NOT FOUND');
        totalFail++;
        sectionResults[section].fail++;
        results.push({ test_id: testId, result: 'NOT FOUND', details: 'Incident not found' });
        continue;
    }

    gs.info('  INC: ' + actual.number);
    var passed = true;
    var details = [];

    // --- Check category ---
    if (!expected.category_any) {
        if (actual.category === expected.category) {
            gs.info('  ✅ Category: ' + actual.category);
        } else {
            gs.info('  ❌ Category: ' + (actual.category || 'NULL') + ' (expected: ' + expected.category + ')');
            passed = false;
            details.push('category mismatch');
        }
    } else {
        gs.info('  ℹ️  Category: ' + (actual.category || 'NULL') + ' (any acceptable)');
    }

    // --- Check subcategory ---
    if (expected.subcategory) {
        if (actual.subcategory === expected.subcategory) {
            gs.info('  ✅ Subcategory: ' + actual.subcategory);
        } else {
            gs.info('  ❌ Subcategory: ' + (actual.subcategory || 'NULL') + ' (expected: ' + expected.subcategory + ')');
            passed = false;
            details.push('subcategory mismatch');
        }
    } else if (expected.subcategory_options) {
        var subMatch = false;
        for (var s = 0; s < expected.subcategory_options.length; s++) {
            if (actual.subcategory.toLowerCase().indexOf(expected.subcategory_options[s].toLowerCase()) > -1) {
                subMatch = true;
                break;
            }
        }
        if (subMatch) {
            gs.info('  ✅ Subcategory: ' + actual.subcategory + ' (matches one of expected options)');
        } else {
            gs.info('  ❌ Subcategory: ' + (actual.subcategory || 'NULL') + ' (expected one of: ' + expected.subcategory_options.join(', ') + ')');
            passed = false;
            details.push('subcategory mismatch');
        }
    }

    // --- Check service (for SO tests) ---
    if (expected.service_contains) {
        if (actual.business_service && actual.business_service.indexOf(expected.service_contains) > -1) {
            gs.info('  ✅ Service: ' + actual.business_service + ' (contains: ' + expected.service_contains + ')');
        } else {
            gs.info('  ❌ Service: ' + (actual.business_service || 'NULL') + ' (expected to contain: ' + expected.service_contains + ')');
            passed = false;
            details.push('service mismatch');
        }
    } else if (expected.service_any) {
        gs.info('  ℹ️  Service: ' + (actual.business_service || 'NULL') + ' (observational)');
    }

    // --- Check offering ---
    if (expected.offering_contains) {
        if (actual.service_offering && actual.service_offering.indexOf(expected.offering_contains) > -1) {
            gs.info('  ✅ Offering: ' + actual.service_offering + ' (contains: ' + expected.offering_contains + ')');
        } else {
            gs.info('  ❌ Offering: ' + (actual.service_offering || 'NULL') + ' (expected to contain: ' + expected.offering_contains + ')');
            passed = false;
            details.push('offering mismatch');
        }
    } else if (expected.offering_any) {
        gs.info('  ℹ️  Offering: ' + (actual.service_offering || 'NULL') + ' (observational)');
    }

    // --- Check CI ---
    if (expected.ci_contains) {
        if (actual.cmdb_ci && actual.cmdb_ci.indexOf(expected.ci_contains) > -1) {
            gs.info('  ✅ CI: ' + actual.cmdb_ci);
        } else {
            gs.info('  ❌ CI: ' + (actual.cmdb_ci || 'NULL') + ' (expected to contain: ' + expected.ci_contains + ')');
            passed = false;
            details.push('CI mismatch');
        }
    } else {
        gs.info('  ℹ️  CI: ' + (actual.cmdb_ci || 'NULL'));
    }

    // --- Check MI link ---
    var miLink = getMILink(actual.sys_id);
    if (expected.mi_match) {
        if (miLink.linked) {
            if (expected.mi_number_contains && miLink.mi_number.indexOf(expected.mi_number_contains) > -1) {
                gs.info('  ✅ MI Link: ' + miLink.mi_number);
            } else if (expected.mi_number_contains) {
                gs.info('  ⚠️  MI Link: ' + miLink.mi_number + ' (expected: ' + expected.mi_number_contains + ')');
                totalWarn++;
                details.push('MI linked to different incident');
            } else {
                gs.info('  ✅ MI Link: ' + miLink.mi_number);
            }
        } else {
            gs.info('  ❌ MI Link: NONE (expected a link)');
            passed = false;
            details.push('MI not linked');
        }
    } else {
        if (miLink.linked) {
            gs.info('  ⚠️  MI Link: ' + miLink.mi_number + ' (NOT expected)');
            totalWarn++;
        } else {
            gs.info('  ✅ MI Link: NONE (correct)');
        }
    }

    // --- Check Problem link ---
    if (expected.prb_match) {
        if (actual.problem_id) {
            if (expected.prb_number_contains && actual.problem_display.indexOf(expected.prb_number_contains) > -1) {
                gs.info('  ✅ Problem Link: ' + actual.problem_display);
            } else if (expected.prb_number_contains) {
                gs.info('  ⚠️  Problem Link: ' + actual.problem_display + ' (expected: ' + expected.prb_number_contains + ')');
                totalWarn++;
                details.push('Problem linked to different record');
            } else {
                gs.info('  ✅ Problem Link: ' + actual.problem_display);
            }
        } else {
            gs.info('  ❌ Problem Link: NONE (expected a link)');
            passed = false;
            details.push('Problem not linked');
        }
    } else {
        if (actual.problem_id) {
            gs.info('  ⚠️  Problem Link: ' + actual.problem_display + ' (NOT expected)');
            totalWarn++;
        } else {
            gs.info('  ✅ Problem Link: NONE (correct)');
        }
    }

    // --- Agent execution check ---
    var workNotes = checkWorkNotes(actual.sys_id);
    var agentCount = (workNotes.agent1 ? 1 : 0) + (workNotes.agent2 ? 1 : 0) + (workNotes.agent3 ? 1 : 0);
    gs.info('  ℹ️  Agents detected in work notes: ' + agentCount + '/3');

    // --- Verdict ---
    if (passed) {
        gs.info('  ══ RESULT: ✅ PASS');
        totalPass++;
        sectionResults[section].pass++;
    } else {
        gs.info('  ══ RESULT: ❌ FAIL — ' + details.join(', '));
        totalFail++;
        sectionResults[section].fail++;
    }

    results.push({ test_id: testId, number: actual.number, result: passed ? 'PASS' : 'FAIL', details: details.join('; ') });
}

// ============================================================
// SUMMARY
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 2 VALIDATION SUMMARY                             ║');
gs.info('╠══════════════════════════════════════════════════════════╣');
gs.info('║  CATEGORY COVERAGE (AC):                                ║');
gs.info('║    Passed: ' + sectionResults.AC.pass + '/' + (sectionResults.AC.pass + sectionResults.AC.fail) + '                                           ║');
gs.info('║  SERVICE OFFERING (SO):                                 ║');
gs.info('║    Passed: ' + sectionResults.SO.pass + '/' + (sectionResults.SO.pass + sectionResults.SO.fail) + '                                           ║');
gs.info('║  MI/PROBLEM MATCHING (MP):                              ║');
gs.info('║    Passed: ' + sectionResults.MP.pass + '/' + (sectionResults.MP.pass + sectionResults.MP.fail) + '                                            ║');
gs.info('║────────────────────────────────────────────────────────║');
gs.info('║  TOTAL: ' + totalPass + '/' + testIds.length + ' passed | ' + totalFail + ' failed | ' + totalWarn + ' warnings        ║');
gs.info('║  Pass Rate: ' + Math.round((totalPass / testIds.length) * 100) + '%                                        ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
