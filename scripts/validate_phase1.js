// ============================================================
// PHASE 1 VALIDATION: Happy Path Results Checker
// ============================================================
// Run AFTER triggering the agentic workflow on all Phase 1 incidents
// and waiting for all 3 agents to complete on each.
//
// This script:
//   1. Finds Phase 1 test incidents via work_notes tag
//   2. Reads current field values (category, subcategory, service, offering, CI)
//   3. Checks for MI/Problem links
//   4. Queries agent execution logs (sn_agent_execution)
//   5. Compares against expected outcomes
//   6. Outputs pass/fail report
// ============================================================

// --- Expected outcomes for each test ---
var EXPECTED = {
    'HP-01': {
        category: 'software',
        subcategory: 'email',
        mi_match: false,
        prb_match: false,
        notes: 'Clear software/email — no MI/Problem expected'
    },
    'HP-02': {
        category: 'hardware',
        subcategory: 'printer',
        mi_match: true,
        mi_number_contains: 'INC030244513',  // Japan printers
        prb_match: false,  // no matching problem known
        notes: 'Should link MI INC030244513 (Japan printers down)'
    },
    'HP-03': {
        category: 'software',
        subcategory: 'business',
        mi_match: true,
        mi_number_contains: 'INC030350754',  // ReadCheckingAccountPostedTransactions
        prb_match: true,
        prb_number_contains: 'PRB0085928',
        ci_contains: 'MYCA',
        notes: 'Dual match — MI INC030350754 AND PRB0085928, CI should be MYCA'
    },
    'HP-04': {
        category: 'network',
        subcategory: 'vpn',
        mi_match: false,
        prb_match: false,
        notes: 'No MI/Problem match expected'
    },
    'HP-05': {
        category: 'software',
        subcategory: 'business',
        mi_match: true,
        mi_number_contains: 'INC03030',  // partial match for INC030303804 or INC030349480
        prb_match: true,
        prb_number_contains: 'PRB0085926',
        ci_contains: 'Global Acquisition',
        notes: 'Multiple MI candidates + PRB0085926, CI should be Global Acquisition'
    },
    'HP-06': {
        category: 'database',
        subcategory: 'oracle',
        mi_match: false,
        prb_match: false,
        notes: 'Clear database/oracle — no MI/Problem expected'
    }
};

// ============================================================
// HELPER FUNCTIONS
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

function getAgentExecutions(incidentSysId) {
    var executions = [];
    // Try querying agent execution records linked to this incident
    var gr = new GlideRecord('sn_agent_execution');
    if (!gr.isValid()) {
        // Table might have a different name
        gr = new GlideRecord('sn_aia_execution');
    }
    if (gr.isValid()) {
        gr.addQuery('source_record', incidentSysId);
        gr.orderBy('sys_created_on');
        gr.query();
        while (gr.next()) {
            executions.push({
                agent_name: gr.getDisplayValue('agent') || gr.getDisplayValue('name') || 'unknown',
                state: gr.getDisplayValue('state') || '',
                started: gr.getValue('sys_created_on') || '',
                ended: gr.getValue('completed_on') || gr.getValue('sys_updated_on') || '',
                duration_ms: 0  // will calculate if possible
            });
        }
    }
    return executions;
}

function getMILink(incidentSysId) {
    // Check for major incident link via parent_incident
    var inc = new GlideRecord('incident');
    if (inc.get(incidentSysId)) {
        if (inc.parent_incident && inc.parent_incident.toString()) {
            var parent = new GlideRecord('incident');
            if (parent.get(inc.parent_incident.toString())) {
                return {
                    linked: true,
                    mi_number: parent.number.toString(),
                    mi_short_desc: parent.short_description.toString()
                };
            }
        }
    }

    // Check task_rel_task for any relationship where the parent is a Major Incident
    var rel = new GlideRecord('task_rel_task');
    if (rel.isValid()) {
        rel.addQuery('child', incidentSysId);
        rel.query();
        while (rel.next()) {
            var parentTask = new GlideRecord('incident');
            if (parentTask.get(rel.parent.toString())) {
                // Verify parent is actually a Major Incident
                if (parentTask.major_incident_state && parentTask.major_incident_state.toString()) {
                    return {
                        linked: true,
                        mi_number: parentTask.number.toString(),
                        mi_short_desc: parentTask.short_description.toString()
                    };
                }
            }
        }
    }

    return { linked: false, mi_number: '', mi_short_desc: '' };
}

function checkWorkNotes(incidentSysId) {
    var notes = { agent1: false, agent2: false, agent3: false, all_text: '' };
    var gr = new GlideRecord('sys_journal_field');
    gr.addQuery('element_id', incidentSysId);
    gr.addQuery('element', 'work_notes');
    gr.addQuery('name', 'incident');
    gr.query();
    while (gr.next()) {
        var text = gr.value.toString().toLowerCase();
        notes.all_text += text + '\n';
        // Look for evidence of each agent
        if (text.indexOf('categor') > -1 && (text.indexOf('agent') > -1 || text.indexOf('ai') > -1 || text.indexOf('classif') > -1)) {
            notes.agent1 = true;
        }
        if (text.indexOf('service') > -1 && (text.indexOf('agent') > -1 || text.indexOf('ai') > -1 || text.indexOf('classif') > -1 || text.indexOf('offering') > -1)) {
            notes.agent2 = true;
        }
        if (text.indexOf('major') > -1 || text.indexOf('problem') > -1 || text.indexOf('link') > -1) {
            notes.agent3 = true;
        }
    }
    return notes;
}


// ============================================================
// MAIN VALIDATION
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 1 VALIDATION: Happy Path Results                 ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
gs.info('');

var incidents = findTestIncidents('STRESS_TEST_P1');
var testIds = Object.keys(EXPECTED);
var totalPass = 0;
var totalFail = 0;
var totalWarn = 0;
var results = [];

for (var i = 0; i < testIds.length; i++) {
    var testId = testIds[i];
    var expected = EXPECTED[testId];
    var actual = incidents[testId];

    gs.info('────────────────────────────────────────────────────');
    gs.info('TEST: ' + testId + ' | ' + expected.notes);

    if (!actual) {
        gs.info('  ❌ INCIDENT NOT FOUND — was the Phase 1 creation script run?');
        totalFail++;
        results.push({ test_id: testId, result: 'NOT FOUND', details: 'Incident not found' });
        continue;
    }

    gs.info('  INC: ' + actual.number);
    var passed = true;
    var details = [];

    // --- Check category ---
    if (expected.category) {
        if (actual.category === expected.category) {
            gs.info('  ✅ Category: ' + actual.category + ' (expected: ' + expected.category + ')');
        } else {
            gs.info('  ❌ Category: ' + (actual.category || 'NULL') + ' (expected: ' + expected.category + ')');
            passed = false;
            details.push('category mismatch');
        }
    }

    // --- Check subcategory ---
    if (expected.subcategory) {
        if (actual.subcategory === expected.subcategory) {
            gs.info('  ✅ Subcategory: ' + actual.subcategory + ' (expected: ' + expected.subcategory + ')');
        } else {
            gs.info('  ❌ Subcategory: ' + (actual.subcategory || 'NULL') + ' (expected: ' + expected.subcategory + ')');
            passed = false;
            details.push('subcategory mismatch');
        }
    }

    // --- Check CI (if expected) ---
    if (expected.ci_contains) {
        if (actual.cmdb_ci && actual.cmdb_ci.indexOf(expected.ci_contains) > -1) {
            gs.info('  ✅ CI: ' + actual.cmdb_ci + ' (contains: ' + expected.ci_contains + ')');
        } else {
            gs.info('  ❌ CI: ' + (actual.cmdb_ci || 'NULL') + ' (expected to contain: ' + expected.ci_contains + ')');
            passed = false;
            details.push('CI mismatch');
        }
    } else {
        gs.info('  ℹ️  CI: ' + (actual.cmdb_ci || 'NULL') + ' (no specific expectation)');
    }

    // --- Check service/offering populated ---
    gs.info('  ℹ️  Service: ' + (actual.business_service || 'NULL'));
    gs.info('  ℹ️  Offering: ' + (actual.service_offering || 'NULL'));

    // --- Check MI link ---
    var miLink = getMILink(actual.sys_id);
    if (expected.mi_match) {
        if (miLink.linked) {
            if (expected.mi_number_contains && miLink.mi_number.indexOf(expected.mi_number_contains) > -1) {
                gs.info('  ✅ MI Link: ' + miLink.mi_number + ' (expected match)');
            } else if (expected.mi_number_contains) {
                gs.info('  ⚠️  MI Link: ' + miLink.mi_number + ' (expected to contain: ' + expected.mi_number_contains + ')');
                details.push('MI linked but to different incident');
                totalWarn++;
            } else {
                gs.info('  ✅ MI Link: ' + miLink.mi_number + ' (some MI linked as expected)');
            }
        } else {
            gs.info('  ❌ MI Link: NONE (expected a link)');
            passed = false;
            details.push('MI not linked');
        }
    } else {
        if (miLink.linked) {
            gs.info('  ⚠️  MI Link: ' + miLink.mi_number + ' (NOT expected — agent linked anyway)');
            details.push('unexpected MI link');
            totalWarn++;
        } else {
            gs.info('  ✅ MI Link: NONE (correctly no link)');
        }
    }

    // --- Check Problem link ---
    if (expected.prb_match) {
        if (actual.problem_id) {
            if (expected.prb_number_contains && actual.problem_display.indexOf(expected.prb_number_contains) > -1) {
                gs.info('  ✅ Problem Link: ' + actual.problem_display + ' (expected match)');
            } else if (expected.prb_number_contains) {
                gs.info('  ⚠️  Problem Link: ' + actual.problem_display + ' (expected: ' + expected.prb_number_contains + ')');
                details.push('Problem linked but to different record');
                totalWarn++;
            } else {
                gs.info('  ✅ Problem Link: ' + actual.problem_display + ' (some problem linked as expected)');
            }
        } else {
            gs.info('  ❌ Problem Link: NONE (expected a link)');
            passed = false;
            details.push('Problem not linked');
        }
    } else {
        if (actual.problem_id) {
            gs.info('  ⚠️  Problem Link: ' + actual.problem_display + ' (NOT expected)');
            details.push('unexpected Problem link');
            totalWarn++;
        } else {
            gs.info('  ✅ Problem Link: NONE (correctly no link)');
        }
    }

    // --- Check work notes for all 3 agents ---
    var workNotes = checkWorkNotes(actual.sys_id);
    var agentCount = (workNotes.agent1 ? 1 : 0) + (workNotes.agent2 ? 1 : 0) + (workNotes.agent3 ? 1 : 0);
    if (agentCount === 3) {
        gs.info('  ✅ Work Notes: All 3 agents left evidence');
    } else {
        gs.info('  ⚠️  Work Notes: Only ' + agentCount + '/3 agents detected' +
            ' (A1:' + (workNotes.agent1 ? 'Y' : 'N') +
            ' A2:' + (workNotes.agent2 ? 'Y' : 'N') +
            ' A3:' + (workNotes.agent3 ? 'Y' : 'N') + ')');
        details.push('not all agents detected in work notes');
        totalWarn++;
    }

    // --- Check agent execution logs ---
    var executions = getAgentExecutions(actual.sys_id);
    if (executions.length > 0) {
        gs.info('  ℹ️  Agent Executions: ' + executions.length + ' records found');
        for (var e = 0; e < executions.length; e++) {
            gs.info('       ' + executions[e].agent_name + ' | state: ' + executions[e].state +
                ' | started: ' + executions[e].started);
        }
    } else {
        gs.info('  ⚠️  Agent Executions: No records found in sn_agent_execution (table may differ)');
    }

    // --- Final verdict ---
    if (passed) {
        gs.info('  ══ RESULT: ✅ PASS' + (details.length > 0 ? ' (with warnings: ' + details.join(', ') + ')' : ''));
        totalPass++;
    } else {
        gs.info('  ══ RESULT: ❌ FAIL — ' + details.join(', '));
        totalFail++;
    }

    results.push({
        test_id: testId,
        number: actual.number,
        result: passed ? 'PASS' : 'FAIL',
        details: details.join('; ')
    });
}

// ============================================================
// SUMMARY
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 1 VALIDATION SUMMARY                             ║');
gs.info('╠══════════════════════════════════════════════════════════╣');
gs.info('║  Total Tests:  ' + testIds.length + '                                        ║');
gs.info('║  ✅ Passed:    ' + totalPass + '                                        ║');
gs.info('║  ❌ Failed:    ' + totalFail + '                                        ║');
gs.info('║  ⚠️  Warnings:  ' + totalWarn + '                                        ║');
gs.info('║  Pass Rate:    ' + Math.round((totalPass / testIds.length) * 100) + '%                                      ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
gs.info('');
gs.info('Results for spreadsheet:');
for (var r = 0; r < results.length; r++) {
    gs.info('  ' + results[r].test_id + ' | ' + (results[r].number || 'N/A') + ' | ' +
        results[r].result + ' | ' + results[r].details);
}
