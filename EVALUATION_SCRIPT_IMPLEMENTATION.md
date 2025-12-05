# Evaluation Script Implementation

## Summary

Implemented an internal evaluation script for checklist and document verification quality. The script runs test cases through real services and compares output vs expected results.

## Files Created

### 1. `apps/backend/evaluation/cases.json`

Configuration file with 10-20 test cases. Each case includes:

- **`id`**: Unique case identifier
- **`name`**: Human-readable case name
- **`description`**: Case description
- **`input`**: CanonicalAIUserContext JSON structure with:
  - `applicantProfile`: Sponsor type, status, financial info, etc.
  - `application`: Country code and visa type
  - `riskScore`: Risk level and score
- **`expected`**: Ideal checklist with:
  - `checklist`: Array of expected documents with `documentType` and `category`
- **`sampleDocs`** (optional): Sample documents with:
  - `documentType`: Document type
  - `text`: Document text content
  - `expectedVerification`: Expected verification result

**Example Case:**

```json
{
  "id": "case-001",
  "name": "German Tourist Visa - Self-Funded Employed",
  "input": {
    "applicantProfile": {
      "sponsorType": "self",
      "currentStatus": "employed",
      "bankBalanceUSD": 8000,
      "monthlyIncomeUSD": 2500
    },
    "application": {
      "countryCode": "DE",
      "visaType": "tourist"
    },
    "riskScore": {
      "level": "low",
      "score": 75
    }
  },
  "expected": {
    "checklist": [
      { "documentType": "passport", "category": "required" },
      { "documentType": "bank_statement", "category": "required" }
    ]
  }
}
```

### 2. `apps/backend/scripts/eval-checklists.ts`

Main evaluation script that:

1. **Loads test cases** from `evaluation/cases.json`
2. **For each case:**
   - Builds `CanonicalAIUserContext` from input
   - Converts to `AIUserContext` for service call
   - Calls `VisaChecklistEngineService.generateChecklist()` (real service, not mocked)
   - Compares actual vs expected checklist
   - Optionally evaluates document verification if sample docs provided
3. **Computes scores:**
   - **Matches**: Documents that match expected (same type + category)
   - **Missing**: Expected documents not found in actual
   - **Extra**: Actual documents not in expected
   - **Wrong Category**: Documents with correct type but wrong category
   - **Accuracy**: Percentage of matches vs expected
4. **Prints summary table** with:
   - Per-case results (matches, missing, extra, wrong category, accuracy)
   - Overall statistics
   - Document verification accuracy (if tested)

## Usage

```bash
pnpm eval:checklists
```

The script:

- Runs all test cases through real services
- Prints a formatted summary table
- Exits with code 0 if overall accuracy >= 70%
- Exits with code 1 if overall accuracy < 70%

## Output Format

```
====================================================================================================
CHECKLIST EVALUATION SUMMARY
====================================================================================================

Per-Case Results:
----------------------------------------------------------------------------------------------------
Case ID      Case Name                               Matches   Missing   Extra     Wrong Cat  Accuracy %  Doc Verif %
----------------------------------------------------------------------------------------------------
case-001     German Tourist Visa - Self-Funded       6         0         0         0          100.0%      N/A
case-002     US Student Visa - Sponsored by Parent   5         1         0         0          83.3%       100.0%
...

----------------------------------------------------------------------------------------------------

Overall Statistics:
----------------------------------------------------------------------------------------------------
Total Cases: 5
Total Expected Documents: 30
Total Matches: 28
Total Missing: 2
Total Extra: 0
Total Wrong Category: 0
Overall Checklist Accuracy: 93.3%
Document Verification Tests: 3
Document Verification Passed: 3
Document Verification Accuracy: 100.0%
====================================================================================================
```

## Features

### Checklist Comparison

- **Exact Match**: Document type and category match expected
- **Missing**: Expected document not found in actual checklist
- **Extra**: Document in actual but not expected (may be acceptable)
- **Wrong Category**: Document type matches but category differs (e.g., expected "required" but got "highly_recommended")

### Document Verification Testing

If `sampleDocs` are provided in a case:

- Creates a minimal `VisaRuleSetData` rule for the document
- Calls `VisaDocCheckerService.checkDocument()` with sample text
- Compares actual verification result vs expected
- Reports pass/fail for each document test

### Error Handling

- Catches and logs errors for individual cases
- Continues evaluation even if one case fails
- Reports errors in summary table
- Exits with appropriate code based on overall accuracy

## Test Cases Included

1. **case-001**: German Tourist Visa - Self-Funded Employed
2. **case-002**: US Student Visa - Sponsored by Parent
3. **case-003**: UK Tourist Visa - Low Balance
4. **case-004**: Canada Student Visa - Self-Funded
5. **case-005**: German Tourist Visa - Previous Refusal

## Extending Test Cases

To add more test cases:

1. Edit `apps/backend/evaluation/cases.json`
2. Add a new case object to the `cases` array
3. Include:
   - Unique `id`
   - Descriptive `name` and `description`
   - `input` with complete `CanonicalAIUserContext` structure
   - `expected.checklist` with expected documents
   - Optional `sampleDocs` for document verification testing

## Integration

The script uses real services (not mocked):

- `VisaChecklistEngineService.generateChecklist()` - Real GPT calls
- `VisaDocCheckerService.checkDocument()` - Real GPT calls

**Note**: This means the script requires:

- OpenAI API key configured
- Database connection (for VisaRuleSet lookup)
- Network access for API calls

For faster testing without API calls, consider adding a mock mode in the future.

## Future Improvements

1. **Mock Mode**: Add flag to use mocked services for faster testing
2. **More Metrics**: Add precision, recall, F1 score
3. **Detailed Diff**: Show exactly which documents differ
4. **Export Results**: Save results to JSON/CSV for tracking over time
5. **CI Integration**: Run evaluation in CI/CD pipeline
6. **Baseline Comparison**: Compare against previous evaluation runs
