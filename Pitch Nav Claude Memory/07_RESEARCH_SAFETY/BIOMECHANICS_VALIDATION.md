---
type: validation
status: required-before-athlete-agents
---

# Biomechanics Validation

For every metric:

1. What is the definition?
2. Which frame or phase is used?
3. Can the supported view observe it?
4. What is the ground truth?
5. What is the expected error?
6. What confidence threshold applies?
7. Is it repeatable?
8. Does it change across devices?
9. What user decision does it support?
10. What happens when it fails?

## Product layers

```text
Capture quality
→ Pose or landmark measurement
→ Validated metric
→ Confidence
→ Rule or interpretation
→ User explanation
→ Approved development action
```

An LLM must not replace the measurement layer.
