---
name: nist-control-mapping
description: 'Add traceable NIST SP 800-53 control annotations to source code, infrastructure-as-code, and other technical files, then roll them up into control and evidence documents. Use when mapping implementation artifacts to controls or preparing code-level evidence for an ATO package.'
argument-hint: 'Provide the files, directories, changes, or system boundary to annotate or roll up. Optionally include the NIST SP 800-53 revision, impact baseline, tailoring, overlays, and the outputs you need.'
---

# NIST Control Mapping

Create consistent, reviewable links between technical implementation and specific NIST SP 800-53 controls. Aggregate those links into traceability artifacts that can inform an SSP or other ATO documentation. Keep the workflow usable across programming languages, Terraform and other infrastructure-as-code, configuration files, and documentation.

## When to Use

- Mapping implementation artifacts to NIST SP 800-53 controls
- Preparing code-level evidence for an ATO package
- Rolling up existing control annotations into a traceability matrix, implementation statements, or evidence register

## Inputs

- Scope (required): files, directories, changes, or system boundary to annotate or roll up.
- Control baseline (optional): applicable NIST SP 800-53 revision, impact baseline, tailoring, and agency overlays, if known.
- Output artifacts (optional): requested outputs, such as a control traceability matrix, implementation statements, or evidence register.

## Outputs

- Annotations: minimal source annotations or sidecar mappings with control references and implementation context.
- Control matrix: control-to-artifact mapping with coverage statements and evidence references.
- Evidence register: inventory of supporting implementation artifacts and validation evidence.
- Limitations: unconfirmed applicability, missing evidence, and review required before ATO use.

## Preconditions

- The user identifies the system or artifact scope.
- Use the organization's specified NIST catalog revision, impact baseline, tailoring decisions, and overlays when available.
- If the control baseline or applicability is unknown, ask for it. You may produce a clearly labeled provisional inventory, but do not select a baseline or claim applicability on the organization's behalf.

## Procedure

### 1. Confirm authority and scope

- Identify the system boundary, files or change set, authoritative NIST catalog revision, selected baseline, tailoring, overlays, and any organization-specific annotation convention.
- Distinguish NIST SP 800-53 controls from NIST AI RMF categories and other frameworks.
- If required inputs are unavailable, record the gap and keep mappings provisional.

### 2. Inspect before editing

- Find existing annotations, sidecar inventories, control catalogs, SSP language, tests, and evidence references. Reuse established conventions.
- Determine which files support comments.
- Avoid generated, vendored, or out-of-scope files unless requested.

### 3. Select defensible mappings

- Map a code section only to a specific control or enhancement that it directly supports.
- Verify the control identifier and title against the selected catalog when available.
- Record a concise rationale and relevant evidence.
- Do not infer that a control is fully implemented from a resource tag, comment, test, or single code section.

### 4. Annotate minimally

Read the [annotation format](./references/annotation-format.md) before editing files.

- Add the annotation block next to the relevant function, module, resource, policy, or configuration.
- For unsupported comment formats, add or update the sidecar record instead.
- Preserve behavior, formatting, and existing annotations.
- Do not add speculative controls to make coverage appear broader.

### 5. Build the roll-up

Read the [roll-up guidance](./references/roll-up-guidance.md). Read annotations and sidecar records in the requested scope, then produce the requested control traceability matrix, implementation statements, and/or evidence register. For each mapping, retain:

- Control identifier, title, and catalog revision
- Applicability or tailoring source, when supplied
- Artifact path and stable section locator
- Implementation rationale and coverage value
- Evidence references and their validation status
- Open questions, inherited-control provider, and assessor review needs

### 6. Check traceability

- Confirm every reported mapping points to an annotation or sidecar record.
- Confirm control identifiers match the supplied catalog and locators resolve.
- Do not represent evidence links as verified unless checked.
- Report unannotated scope separately. Absence of an annotation is not evidence that a control is absent or unmet.

### 7. Report limitations

Summarize changed files, produced artifacts, unmapped or uncertain areas, missing evidence, and the reviews needed before the output is used in an authorization package.

## Completion Criteria

- [ ] Each added mapping has a canonical control citation, a specific locator, a rationale, and a coverage value.
- [ ] Unsupported file formats are represented in a sidecar mapping using stable locators.
- [ ] Requested roll-up artifacts preserve links back to implementation and evidence.
- [ ] Unknown applicability, unverified evidence, and assessor review needs are explicit.
- [ ] No compliance or authorization claim is inferred from annotation presence.

## Graceful Degradation

When the catalog, baseline, tailoring, evidence, or parsing capability is unavailable, do not guess or silently omit the limitation. Produce only the supported inventory, label unresolved mappings as provisional, identify files or evidence that could not be checked, and request review from the responsible security or compliance authority.

## References

- NIST SP 800-53 Rev. 5, Security and Privacy Controls for Information Systems and Organizations: <https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final>
- NIST SP 800-53B, Control Baselines for Information Systems and Organizations: <https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final>
- NIST OSCAL, machine-readable security and compliance data formats: <https://pages.nist.gov/OSCAL/>
