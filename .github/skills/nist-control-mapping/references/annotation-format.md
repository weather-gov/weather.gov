# Annotation Format

Use the same field names in comments across file types. Adapt the comment prefix to the language (`#`, `//`, `/* */`, or the file format's supported comment syntax) and place the block immediately before the smallest meaningful code or configuration section. Keep the control citation canonical, including the catalog revision and enhancement notation.

```text
# compliance-control: NIST SP 800-53 Rev. 5 AC-6(1)
# compliance-coverage: partial
# compliance-rationale: The deployment role is limited to the actions required by this service.
# compliance-evidence: tests/security/test_deployment_role.py::test_role_has_scoped_actions
```

Repeat the `compliance-control` field in separate annotation blocks when one section relates to multiple controls.

## Coverage Values

Use only these values:

- `implemented`: This artifact supports the stated control implementation; this does not establish that the full control is satisfied.
- `partial`: This artifact supports only part of the control implementation.
- `planned`: The implementation is intended but is not present yet.
- `inherited`: The implementation is supplied by an identified common control provider or external service.
- `not-applicable`: Use only when an authorized assessor has determined this; include the rationale and source of that determination.

## Files Without Comments

For formats without comments (for example, strict JSON), use a sidecar mapping file in the repository's established compliance/evidence location. Each record must include the file path and a stable section locator such as a symbol, resource address, or JSON Pointer. Include line numbers only as supplemental navigation because they can change. Record the same fields as inline annotations.

## Infrastructure-as-Code

In Terraform or other declarative infrastructure, prefer a local comment annotation unless the team explicitly wants control metadata embedded in deployable resource attributes or tags. Do not add provider-specific tags or alter deployment behavior just to make the mapping machine-readable.
