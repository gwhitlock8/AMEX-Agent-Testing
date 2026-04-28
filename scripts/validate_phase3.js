// ============================================================
// PHASE 3 VALIDATION: Edge Case Results Checker
// ============================================================
// Run AFTER triggering the agentic workflow on all Phase 3 incidents.
//
// Edge cases have unique expected behaviors:
//   - Some EXPECT null/empty results (vague descriptions)
//   - Some test pre-populated field preservation
//   - Some test state-based refusal (resolved/closed/canceled)
//   - EC-19 is manual only (fake INC number)
// ============================================================

var EXPECTED = {
    // --- Agent 1 Edge Cases ---
    'EC-01': { category_null: true, subcategory_null: true,
               notes: 'Vague: "Something is broken" — should set null per 100% certainty rule' },
    'EC-02': { category_null: true, subcategory_null: true,
               notes: 'Placeholder: "test" — should NOT infer a category' },
    'EC-03': { category_observe: true,
               notes: 'Multi-ambiguity: network + software — observe which is picked or null' },
    'EC-04': { pre_populated: true, original_cat: 'hardware', original_sub: 'disk',
               notes: 'Pre-categorized (wrong): hardware/disk — does Agent 1 overwrite with correct value?' },
    'EC-05a': { non_english: 'es', category_any: true,
                notes: 'Spanish description — agent should respond in Spanish per LANGUAGE RULE' },
    'EC-05b': { non_english: 'ja', category_any: true,
                notes: 'Japanese description — agent should respond in Japanese per LANGUAGE RULE' },

    // --- Agent 2 Edge Cases ---
    'EC-06': { service_null: true, offering_null: true, ci_null: true,
               notes: 'No matching service in CMDB — should set null per "do not invent" rule' },
    'EC-07': { service_observe: true,
               notes: 'Multiple equally strong candidates — observe heuristic selection' },
    'EC-08': { service_any: true,
               notes: 'Data Localization — callerAssignedCIs fallback test' },
    'EC-09': { pre_classified: true,
               notes: 'Pre-populated service/CI — does Agent 2 overwrite or respect?' },
    'EC-10': { guidance_pin: true, pinned_cat: 'software', pinned_sub: 'business',
               notes: 'Guidance pin — Agent 2 should NOT override pinned fields' },

    // --- Agent 3 Edge Cases ---
    'EC-11': { mi_match: false, prb_match: false,
               notes: 'No match: conference room projector — nothing in MI/PRB list' },
    'EC-12': { mi_match: true, mi_observe: true,
               notes: 'Multiple MIs match GO2 — observe which one Agent 3 picks' },
    'EC-13': { mi_observe: true,
               notes: 'Resolved MI (state=6) match test — does Agent 3 match resolved MIs?' },
    'EC-14': { mi_match: false, prb_match: true, prb_number_contains: 'PRB0085836',
               notes: 'Problem only: Db2 weekend failures — no MI, should link PRB0085836' },
    'EC-15': { mi_match: true, mi_number_contains: 'INC030309271', prb_match: true, prb_number_contains: 'PRB0085846',
               notes: 'Both MI and PRB match — observe priority/preference' },

    // --- Workflow Edge Cases ---
    'EC-16': { state_test: 'resolved', should_process: false,
               notes: 'Resolved incident — agents should STOP' },
    'EC-17': { state_test: 'closed', should_process: false,
               notes: 'Closed incident — agents should STOP' },
    'EC-18': { state_test: 'canceled', should_process: false,
               notes: 'Canceled incident — agents should STOP' },
    // EC-19: MANUAL TEST — use fake INC number, no incident created
    'EC-20': { empty_input: true,
               notes: 'Empty short_description AND description — how do agents handle?' }
};


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function findTestIncidents(phase) {
    var incidents = {};
    var gr = new GlideRecord('incident');
    gr.addQuery('work_notes', 'CONTAINS', '[STRESS TEST]');
    gr.addQuery('work_notes', 'CONTAINS', 'Phase: ' + phase);
    gr.query();
    while (gr.next()) {
        var wn = gr.work_notes.getJournalEntry(1);
        var match = /Test ID:\s*(\S+)/.exec(wn);
        if (match) {
            incidents[match[1]] = {
                sys_id: gr.sys_id.toString(),
                number: gr.number.toString(),
                category: gr.category.toString(),
                subcategory: gr.subcategory.toString(),
                business_service: gr.business_service.getDisplayValue(),
                service_offering: gr.service_offering.getDisplayValue(),
                cmdb_ci: gr.cmdb_ci.getDisplayValue(),
                incident_state: gr.incident_state.toString(),
                state: gr.state.toString(),
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
                return { linked: true, mi_number: parent.number.toString() };
            }
        }
    }
    var rel = new GlideRecord('task_rel_task');
    if (rel.isValid()) {
        rel.addQuery('child', incidentSysId);
        rel.addQuery('type.name', 'CONTAINS', 'Major');
        rel.query();
        if (rel.next()) {
            var parentTask = new GlideRecord('incident');
            if (parentTask.get(rel.parent.toString())) {
                return { linked: true, mi_number: parentTask.number.toString() };
            }
        }
    }
    return { linked: false, mi_number: '' };
}

function checkWorkNotes(incidentSysId) {
    var notes = { agent1: false, agent2: false, agent3: false, total_count: 0, language_detected: '' };
    var gr = new GlideRecord('sys_journal_field');
    gr.addQuery('element_id', incidentSysId);
    gr.addQuery('element', 'work_notes');
    gr.addQuery('name', 'incident');
    gr.query();
    while (gr.next()) {
        var text = gr.value.toString();
        var lc = text.toLowerCase();
        notes.total_count++;
        if (lc.indexOf('categor') > -1 || lc.indexOf('classif') > -1) notes.agent1 = true;
        if (lc.indexOf('service') > -1 || lc.indexOf('offering') > -1) notes.agent2 = true;
        if (lc.indexOf('major') > -1 || lc.indexOf('problem') > -1 || lc.indexOf('link') > -1) notes.agent3 = true;
        // Detect language of work notes (crude check)
        if (text.match(/[áéíóúñ¿¡]/)) notes.language_detected = 'es';
        if (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/)) notes.language_detected = 'ja';
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
        gr.query();
        while (gr.next()) {
            executions.push({
                agent_name: gr.getDisplayValue('agent') || gr.getDisplayValue('name') || 'unknown',
                state: gr.getDisplayValue('state') || ''
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
gs.info('║  PHASE 3 VALIDATION: Edge Case Results                  ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
gs.info('');

var incidents = findTestIncidents('3 - Edge Case');
var testIds = Object.keys(EXPECTED);
var totalPass = 0;
var totalFail = 0;
var totalWarn = 0;
var totalObserve = 0;
var results = [];

for (var i = 0; i < testIds.length; i++) {
    var testId = testIds[i];
    var expected = EXPECTED[testId];
    var actual = incidents[testId];

    gs.info('────────────────────────────────────────────────────');
    gs.info('TEST: ' + testId + ' | ' + expected.notes);

    if (!actual) {
        gs.info('  ❌ INCIDENT NOT FOUND');
        totalFail++;
        results.push({ test_id: testId, result: 'NOT FOUND', details: '' });
        continue;
    }

    gs.info('  INC: ' + actual.number + ' | state: ' + actual.incident_state);
    var passed = true;
    var details = [];

    // ===== NULL EXPECTATION TESTS (EC-01, EC-02) =====
    if (expected.category_null) {
        if (!actual.category || actual.category === '') {
            gs.info('  ✅ Category: NULL (correctly left blank for vague input)');
        } else {
            gs.info('  ❌ Category: ' + actual.category + ' (expected NULL — agent should not have categorized)');
            passed = false;
            details.push('category should be null');
        }
    }
    if (expected.subcategory_null) {
        if (!actual.subcategory || actual.subcategory === '') {
            gs.info('  ✅ Subcategory: NULL (correctly left blank)');
        } else {
            gs.info('  ❌ Subcategory: ' + actual.subcategory + ' (expected NULL)');
            passed = false;
            details.push('subcategory should be null');
        }
    }

    // ===== OBSERVE TESTS (EC-03) =====
    if (expected.category_observe) {
        gs.info('  👁️  Category: ' + (actual.category || 'NULL') + ' | Subcategory: ' + (actual.subcategory || 'NULL'));
        gs.info('      (OBSERVE: multi-ambiguity — either a specific pick or null is acceptable)');
        totalObserve++;
    }

    // ===== PRE-POPULATED TESTS (EC-04) =====
    if (expected.pre_populated) {
        gs.info('  ℹ️  Pre-populated: category=' + expected.original_cat + ', subcategory=' + expected.original_sub);
        gs.info('  ℹ️  Current:       category=' + (actual.category || 'NULL') + ', subcategory=' + (actual.subcategory || 'NULL'));
        if (actual.category === expected.original_cat && actual.subcategory === expected.original_sub) {
            gs.info('  👁️  Agent 1 did NOT change pre-populated values (preserved original)');
            details.push('agent preserved wrong pre-populated values');
        } else if (actual.category && actual.category !== expected.original_cat) {
            gs.info('  👁️  Agent 1 OVERWROTE pre-populated values with: ' + actual.category + '/' + actual.subcategory);
            details.push('agent overwrote to: ' + actual.category + '/' + actual.subcategory);
        } else {
            gs.info('  👁️  Agent 1 set to NULL (cleared pre-populated values)');
            details.push('agent cleared to null');
        }
        totalObserve++;
    }

    // ===== NON-ENGLISH TESTS (EC-05a, EC-05b) =====
    if (expected.non_english) {
        var workNotes = checkWorkNotes(actual.sys_id);
        gs.info('  ℹ️  Category: ' + (actual.category || 'NULL') + '/' + (actual.subcategory || 'NULL'));
        if (workNotes.language_detected === expected.non_english) {
            gs.info('  ✅ Work notes language: ' + workNotes.language_detected + ' (matches input language)');
        } else if (workNotes.language_detected) {
            gs.info('  ⚠️  Work notes language: ' + workNotes.language_detected + ' (expected: ' + expected.non_english + ')');
            totalWarn++;
            details.push('language mismatch in work notes');
        } else {
            gs.info('  👁️  Work notes language: could not detect (check manually)');
            totalObserve++;
        }
    }

    // ===== SERVICE NULL TESTS (EC-06) =====
    if (expected.service_null) {
        if (!actual.business_service || actual.business_service === '') {
            gs.info('  ✅ Service: NULL (correctly did not invent a service)');
        } else {
            gs.info('  ❌ Service: ' + actual.business_service + ' (expected NULL — no matching service in CMDB)');
            passed = false;
            details.push('service should be null');
        }
    }
    if (expected.offering_null) {
        if (!actual.service_offering || actual.service_offering === '') {
            gs.info('  ✅ Offering: NULL');
        } else {
            gs.info('  ❌ Offering: ' + actual.service_offering + ' (expected NULL)');
            passed = false;
            details.push('offering should be null');
        }
    }
    if (expected.ci_null) {
        if (!actual.cmdb_ci || actual.cmdb_ci === '') {
            gs.info('  ✅ CI: NULL');
        } else {
            gs.info('  ❌ CI: ' + actual.cmdb_ci + ' (expected NULL)');
            passed = false;
            details.push('CI should be null');
        }
    }

    // ===== SERVICE OBSERVE TESTS (EC-07, EC-08) =====
    if (expected.service_observe || expected.service_any) {
        gs.info('  👁️  Service: ' + (actual.business_service || 'NULL'));
        gs.info('      Offering: ' + (actual.service_offering || 'NULL'));
        gs.info('      CI: ' + (actual.cmdb_ci || 'NULL'));
        totalObserve++;
    }

    // ===== PRE-CLASSIFIED TEST (EC-09) =====
    if (expected.pre_classified) {
        gs.info('  ℹ️  Service: ' + (actual.business_service || 'NULL'));
        gs.info('  ℹ️  Offering: ' + (actual.service_offering || 'NULL'));
        gs.info('  ℹ️  CI: ' + (actual.cmdb_ci || 'NULL'));
        gs.info('  👁️  (Check if values changed from pre-populated "Statement" service)');
        totalObserve++;
    }

    // ===== GUIDANCE PIN TEST (EC-10) =====
    if (expected.guidance_pin) {
        if (actual.category === expected.pinned_cat && actual.subcategory === expected.pinned_sub) {
            gs.info('  ✅ Pinned values preserved: ' + actual.category + '/' + actual.subcategory);
        } else {
            gs.info('  ⚠️  Pinned values changed: ' + (actual.category || 'NULL') + '/' + (actual.subcategory || 'NULL'));
            gs.info('      (Expected pinned: ' + expected.pinned_cat + '/' + expected.pinned_sub + ')');
            totalWarn++;
            details.push('pinned values may have been overridden');
        }
    }

    // ===== MI/PROBLEM LINK CHECKS =====
    if (expected.mi_match !== undefined && !expected.mi_observe) {
        var miLink = getMILink(actual.sys_id);
        if (expected.mi_match) {
            if (miLink.linked) {
                if (expected.mi_number_contains && miLink.mi_number.indexOf(expected.mi_number_contains) > -1) {
                    gs.info('  ✅ MI Link: ' + miLink.mi_number);
                } else if (expected.mi_number_contains) {
                    gs.info('  ⚠️  MI Link: ' + miLink.mi_number + ' (expected: ' + expected.mi_number_contains + ')');
                    totalWarn++;
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
                gs.info('  ❌ MI Link: ' + miLink.mi_number + ' (expected NONE)');
                passed = false;
                details.push('unexpected MI link');
            } else {
                gs.info('  ✅ MI Link: NONE (correct)');
            }
        }
    }
    if (expected.mi_observe) {
        var miLink2 = getMILink(actual.sys_id);
        gs.info('  👁️  MI Link: ' + (miLink2.linked ? miLink2.mi_number : 'NONE') + ' (observe)');
        totalObserve++;
    }

    if (expected.prb_match !== undefined) {
        if (expected.prb_match) {
            if (actual.problem_id) {
                if (expected.prb_number_contains && actual.problem_display.indexOf(expected.prb_number_contains) > -1) {
                    gs.info('  ✅ Problem Link: ' + actual.problem_display);
                } else if (expected.prb_number_contains) {
                    gs.info('  ⚠️  Problem Link: ' + actual.problem_display + ' (expected: ' + expected.prb_number_contains + ')');
                    totalWarn++;
                } else {
                    gs.info('  ✅ Problem Link: ' + actual.problem_display);
                }
            } else {
                gs.info('  ❌ Problem Link: NONE (expected a link)');
                passed = false;
                details.push('Problem not linked');
            }
        } else if (expected.prb_match === false) {
            if (actual.problem_id) {
                gs.info('  ⚠️  Problem Link: ' + actual.problem_display + ' (not expected)');
                totalWarn++;
            } else {
                gs.info('  ✅ Problem Link: NONE (correct)');
            }
        }
    }

    // ===== STATE-BASED REFUSAL TESTS (EC-16/17/18) =====
    if (expected.state_test) {
        gs.info('  ℹ️  Incident state: ' + actual.incident_state);
        var executions = getAgentExecutions(actual.sys_id);
        var stateWorkNotes = checkWorkNotes(actual.sys_id);
        // For resolved/closed/canceled: agents should NOT have processed
        // Check if category/service were populated (they shouldn't be)
        var agentsProcessed = (actual.category && actual.category !== '') ||
                              (actual.business_service && actual.business_service !== '');
        if (!expected.should_process && !agentsProcessed) {
            gs.info('  ✅ Agents correctly did NOT process this ' + expected.state_test + ' incident');
        } else if (!expected.should_process && agentsProcessed) {
            gs.info('  ❌ Agents PROCESSED a ' + expected.state_test + ' incident (they should have stopped)');
            gs.info('      Category: ' + (actual.category || 'NULL') + ' | Service: ' + (actual.business_service || 'NULL'));
            passed = false;
            details.push('agents processed ' + expected.state_test + ' incident');
        }
        gs.info('  ℹ️  Agent executions found: ' + executions.length);
    }

    // ===== EMPTY INPUT TEST (EC-20) =====
    if (expected.empty_input) {
        gs.info('  ℹ️  Category: ' + (actual.category || 'NULL'));
        gs.info('  ℹ️  Service: ' + (actual.business_service || 'NULL'));
        gs.info('  👁️  (Empty input — observe how each agent handles no data)');
        totalObserve++;
    }

    // --- Verdict ---
    if (expected.category_observe || expected.pre_populated || expected.pre_classified ||
        expected.service_observe || expected.mi_observe || expected.empty_input) {
        gs.info('  ══ RESULT: 👁️ OBSERVE — requires manual review');
        results.push({ test_id: testId, number: actual.number, result: 'OBSERVE', details: details.join('; ') });
    } else if (passed) {
        gs.info('  ══ RESULT: ✅ PASS');
        totalPass++;
        results.push({ test_id: testId, number: actual.number, result: 'PASS', details: details.join('; ') });
    } else {
        gs.info('  ══ RESULT: ❌ FAIL — ' + details.join(', '));
        totalFail++;
        results.push({ test_id: testId, number: actual.number, result: 'FAIL', details: details.join('; ') });
    }
}

// ============================================================
// SUMMARY
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 3 VALIDATION SUMMARY                             ║');
gs.info('╠══════════════════════════════════════════════════════════╣');
gs.info('║  Total Tests:   ' + testIds.length + '                                       ║');
gs.info('║  ✅ Passed:     ' + totalPass + '                                        ║');
gs.info('║  ❌ Failed:     ' + totalFail + '                                        ║');
gs.info('║  ⚠️  Warnings:   ' + totalWarn + '                                        ║');
gs.info('║  👁️  Observe:    ' + totalObserve + '                                        ║');
gs.info('╠══════════════════════════════════════════════════════════╣');
gs.info('║  REMINDER: EC-19 is manual — use "INC9999999" directly  ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
gs.info('');
gs.info('Results:');
for (var r = 0; r < results.length; r++) {
    gs.info('  ' + results[r].test_id + ' | ' + (results[r].number || 'N/A') + ' | ' +
        results[r].result + ' | ' + results[r].details);
}
