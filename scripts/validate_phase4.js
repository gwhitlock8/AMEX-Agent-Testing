// ============================================================
// PHASE 4 VALIDATION: Parallel Execution & Conflict Checker
// ============================================================
// Run AFTER triggering the agentic workflow on all Phase 4 incidents.
//
// This phase focuses on:
//   - All 3 agents leaving work notes (no missing entries)
//   - No field overwrites between Agent 1 and Agent 2
//   - Duplicate run detection (PX-03)
//   - Concurrent link + update persistence (PX-05)
//
// NOTE: PX-03 (double trigger) and PX-04 (manual edit) require
//       specific manual testing steps — this script validates the
//       resulting state after those manual actions.
// ============================================================

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

function getDetailedWorkNotes(incidentSysId) {
    var notes = [];
    var gr = new GlideRecord('sys_journal_field');
    gr.addQuery('element_id', incidentSysId);
    gr.addQuery('element', 'work_notes');
    gr.addQuery('name', 'incident');
    gr.orderBy('sys_created_on');
    gr.query();
    while (gr.next()) {
        notes.push({
            timestamp: gr.sys_created_on.toString(),
            text: gr.value.toString().substring(0, 200),
            created_by: gr.sys_created_by.toString()
        });
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

function countMILinks(incidentSysId) {
    var count = 0;
    var links = [];
    var rel = new GlideRecord('task_rel_task');
    if (rel.isValid()) {
        rel.addQuery('child', incidentSysId);
        rel.query();
        while (rel.next()) {
            count++;
            links.push(rel.parent.getDisplayValue());
        }
    }
    // Also check parent_incident
    var inc = new GlideRecord('incident');
    if (inc.get(incidentSysId) && inc.parent_incident.toString()) {
        count++;
        links.push(inc.parent_incident.getDisplayValue());
    }
    return { count: count, links: links };
}


// ============================================================
// MAIN VALIDATION
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 4 VALIDATION: Parallel Execution & Conflicts     ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
gs.info('');

var incidents = findTestIncidents('4 - Parallel/Conflict');
var totalPass = 0;
var totalFail = 0;
var totalWarn = 0;

// ============================================================
// PX-01: All 3 agents should leave work notes
// ============================================================
gs.info('────────────────────────────────────────────────────');
gs.info('TEST: PX-01 | All 3 agents leave work notes');
(function() {
    var actual = incidents['PX-01'];
    if (!actual) { gs.info('  ❌ INCIDENT NOT FOUND'); totalFail++; return; }
    gs.info('  INC: ' + actual.number);

    var workNotes = getDetailedWorkNotes(actual.sys_id);
    gs.info('  Total work notes: ' + workNotes.length + ' (including test creation note)');

    // Agent-generated notes should be > 1 (creation note + at least 3 agent notes)
    var agentNotes = 0;
    for (var n = 0; n < workNotes.length; n++) {
        if (workNotes[n].text.indexOf('[STRESS TEST]') === -1) {
            agentNotes++;
            gs.info('    Note ' + agentNotes + ': [' + workNotes[n].timestamp + '] ' +
                workNotes[n].text.substring(0, 100) + '...');
        }
    }

    if (agentNotes >= 3) {
        gs.info('  ✅ PASS: ' + agentNotes + ' agent work notes found (expected >= 3)');
        totalPass++;
    } else if (agentNotes > 0) {
        gs.info('  ⚠️  WARN: Only ' + agentNotes + ' agent work notes (expected 3 — one per agent)');
        totalWarn++;
    } else {
        gs.info('  ❌ FAIL: No agent work notes found — did the workflow run?');
        totalFail++;
    }

    var executions = getAgentExecutions(actual.sys_id);
    gs.info('  Agent executions: ' + executions.length);
    for (var e = 0; e < executions.length; e++) {
        gs.info('    ' + executions[e].agent_name + ' | ' + executions[e].state);
    }
})();

// ============================================================
// PX-02: Agent 1 and Agent 2 don't overwrite each other
// ============================================================
gs.info('');
gs.info('────────────────────────────────────────────────────');
gs.info('TEST: PX-02 | Agent 1 vs Agent 2 field conflict check');
(function() {
    var actual = incidents['PX-02'];
    if (!actual) { gs.info('  ❌ INCIDENT NOT FOUND'); totalFail++; return; }
    gs.info('  INC: ' + actual.number);

    var passed = true;
    var details = [];

    // Agent 1 fields
    gs.info('  Agent 1 fields:');
    if (actual.category) {
        gs.info('    ✅ Category: ' + actual.category);
    } else {
        gs.info('    ❌ Category: NULL (Agent 1 may not have run or was overwritten)');
        passed = false;
        details.push('category empty');
    }
    if (actual.subcategory) {
        gs.info('    ✅ Subcategory: ' + actual.subcategory);
    } else {
        gs.info('    ⚠️  Subcategory: NULL');
    }

    // Agent 2 fields
    gs.info('  Agent 2 fields:');
    if (actual.business_service) {
        gs.info('    ✅ Service: ' + actual.business_service);
    } else {
        gs.info('    ⚠️  Service: NULL (Agent 2 may not have found a match)');
    }
    if (actual.service_offering) {
        gs.info('    ✅ Offering: ' + actual.service_offering);
    } else {
        gs.info('    ⚠️  Offering: NULL');
    }
    if (actual.cmdb_ci) {
        gs.info('    ✅ CI: ' + actual.cmdb_ci);
    } else {
        gs.info('    ⚠️  CI: NULL');
    }

    // Key check: both sets of fields populated = no overwrite
    if (actual.category && (actual.business_service || actual.cmdb_ci)) {
        gs.info('  ✅ PASS: Both Agent 1 (category) and Agent 2 (service/CI) fields populated — no overwrite');
        totalPass++;
    } else if (actual.category && !actual.business_service && !actual.cmdb_ci) {
        gs.info('  ⚠️  WARN: Agent 1 fields set but Agent 2 fields empty — Agent 2 may not have found a match (or was overwritten)');
        totalWarn++;
    } else {
        gs.info('  ❌ FAIL: Possible field overwrite — check if one agent cleared the other\'s fields');
        totalFail++;
    }
})();

// ============================================================
// PX-03: Double trigger — check for duplicate processing
// ============================================================
gs.info('');
gs.info('────────────────────────────────────────────────────');
gs.info('TEST: PX-03 | Double trigger — duplicate detection');
(function() {
    var actual = incidents['PX-03'];
    if (!actual) { gs.info('  ❌ INCIDENT NOT FOUND'); totalFail++; return; }
    gs.info('  INC: ' + actual.number);

    // Check for duplicate agent executions
    var executions = getAgentExecutions(actual.sys_id);
    gs.info('  Agent executions: ' + executions.length);
    for (var e = 0; e < executions.length; e++) {
        gs.info('    ' + executions[e].agent_name + ' | ' + executions[e].state + ' | ' + executions[e].started);
    }
    if (executions.length > 3) {
        gs.info('  ⚠️  More than 3 executions — agents likely ran twice');
        gs.info('      This is expected if you triggered twice. Check for consistency.');
        totalWarn++;
    } else if (executions.length === 3) {
        gs.info('  ℹ️  Exactly 3 executions — workflow ran once (or deduplication worked)');
    }

    // Check for duplicate MI/Problem links
    var linkCount = countMILinks(actual.sys_id);
    gs.info('  MI/Relationship links: ' + linkCount.count);
    if (linkCount.count > 1) {
        gs.info('  ⚠️  Multiple links found — possible duplicate from double trigger:');
        for (var l = 0; l < linkCount.links.length; l++) {
            gs.info('    ' + linkCount.links[l]);
        }
        totalWarn++;
    }

    // Check work notes for duplicate entries
    var workNotes = getDetailedWorkNotes(actual.sys_id);
    var agentNotes = workNotes.filter(function(n) { return n.text.indexOf('[STRESS TEST]') === -1; });
    gs.info('  Agent work notes: ' + agentNotes.length);
    if (agentNotes.length > 4) {
        gs.info('  ⚠️  High work note count (' + agentNotes.length + ') — likely processed twice');
    }

    gs.info('  👁️  OBSERVE: Manual review needed — check if double-trigger produced consistent results');
})();

// ============================================================
// PX-04: Manual edit during agent run
// ============================================================
gs.info('');
gs.info('────────────────────────────────────────────────────');
gs.info('TEST: PX-04 | Manual edit during agent run');
(function() {
    var actual = incidents['PX-04'];
    if (!actual) { gs.info('  ❌ INCIDENT NOT FOUND'); totalFail++; return; }
    gs.info('  INC: ' + actual.number);

    gs.info('  Current state:');
    gs.info('    Category: ' + (actual.category || 'NULL'));
    gs.info('    Subcategory: ' + (actual.subcategory || 'NULL'));
    gs.info('    Service: ' + (actual.business_service || 'NULL'));
    gs.info('    CI: ' + (actual.cmdb_ci || 'NULL'));

    var miLink = getMILink(actual.sys_id);
    gs.info('    MI Link: ' + (miLink.linked ? miLink.mi_number : 'NONE'));
    gs.info('    Problem: ' + (actual.problem_display || 'NONE'));

    gs.info('  👁️  OBSERVE: Compare the above with what YOU manually entered.');
    gs.info('      Did your manual edits persist? Did agent updates overwrite them?');
    gs.info('      Check the audit history: sys_audit table for this incident.');
})();

// ============================================================
// PX-05: Agent 3 link + Agent 2 update simultaneously
// ============================================================
gs.info('');
gs.info('────────────────────────────────────────────────────');
gs.info('TEST: PX-05 | Link + classification both persist');
(function() {
    var actual = incidents['PX-05'];
    if (!actual) { gs.info('  ❌ INCIDENT NOT FOUND'); totalFail++; return; }
    gs.info('  INC: ' + actual.number);

    var passed = true;
    var details = [];

    // Agent 2 should have classified
    gs.info('  Agent 2 (classification):');
    gs.info('    Service: ' + (actual.business_service || 'NULL'));
    gs.info('    Offering: ' + (actual.service_offering || 'NULL'));
    gs.info('    CI: ' + (actual.cmdb_ci || 'NULL'));

    if (actual.business_service || actual.cmdb_ci) {
        gs.info('    ✅ Classification fields populated');
    } else {
        gs.info('    ⚠️  Classification fields empty');
        details.push('no classification');
        totalWarn++;
    }

    // Agent 3 should have linked MI INC030340795
    var miLink = getMILink(actual.sys_id);
    gs.info('  Agent 3 (MI link):');
    if (miLink.linked) {
        gs.info('    ✅ MI Link: ' + miLink.mi_number);
        if (miLink.mi_number.indexOf('INC030340795') > -1) {
            gs.info('    ✅ Correct MI: INC030340795 (Enroll Offers UK)');
        } else {
            gs.info('    ⚠️  Different MI: expected INC030340795');
            totalWarn++;
        }
    } else {
        gs.info('    ❌ MI Link: NONE (expected link to INC030340795)');
        passed = false;
        details.push('MI not linked');
    }

    // Both should persist
    if ((actual.business_service || actual.cmdb_ci) && miLink.linked) {
        gs.info('  ✅ PASS: Both classification AND link persisted — no conflict');
        totalPass++;
    } else if (miLink.linked && !actual.business_service && !actual.cmdb_ci) {
        gs.info('  ⚠️  WARN: Link persisted but classification did not — possible overwrite');
        totalWarn++;
    } else if (!miLink.linked && (actual.business_service || actual.cmdb_ci)) {
        gs.info('  ⚠️  WARN: Classification persisted but link did not — possible overwrite');
        totalWarn++;
    } else {
        gs.info('  ❌ FAIL: Neither classification nor link persisted');
        totalFail++;
    }
})();


// ============================================================
// SUMMARY
// ============================================================
gs.info('');
gs.info('╔══════════════════════════════════════════════════════════╗');
gs.info('║  PHASE 4 VALIDATION SUMMARY                             ║');
gs.info('╠══════════════════════════════════════════════════════════╣');
gs.info('║  ✅ Passed:    ' + totalPass + '                                        ║');
gs.info('║  ❌ Failed:    ' + totalFail + '                                        ║');
gs.info('║  ⚠️  Warnings:  ' + totalWarn + '                                        ║');
gs.info('╠══════════════════════════════════════════════════════════╣');
gs.info('║  MANUAL STEPS REQUIRED:                                 ║');
gs.info('║  PX-03: Must trigger workflow TWICE on same INC         ║');
gs.info('║  PX-04: Must manually edit INC while workflow runs      ║');
gs.info('╚══════════════════════════════════════════════════════════╝');
