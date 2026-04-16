---
status: testing
phase: 02-ptz-enhancement
source: 02-SUMMARY.md
started: 2026-04-16T00:00:00Z
updated: 2026-04-16T00:00:00Z
---

## Current Test

number: 1
name: Focus Control
expected: |
  Focus slider (range 0-100) and Near/Far buttons control camera focus.
  Using the slider or buttons sends the focus value to the camera via the
  SetFocus API command, and the camera adjusts focus accordingly.
awaiting: user response

## Tests

### 1. Focus Control
expected: Focus slider (range 0-100) and Near/Far buttons control camera focus.
result: pending

### 2. Iris Control
expected: Iris slider (range 0-100) and Open/Close buttons control camera aperture.
result: pending

### 3. Speed Slider
expected: Speed slider (range 1-10) with +/- buttons affects PTZ movement speed.
result: pending

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

[none yet]