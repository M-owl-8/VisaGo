import { isKetdikInstructionIntent } from '../ketdik/ketdik.intent';
import { isKetdikResponseSafe } from '../ketdik/ketdik.response-guard';

describe('Ketdik intent classifier', () => {
  it('returns true for document collection questions', () => {
    expect(isKetdikInstructionIntent('How to get bank statement in Uzbekistan?')).toBe(true);
    expect(isKetdikInstructionIntent('Where to notarize an invitation letter?')).toBe(true);
    expect(isKetdikInstructionIntent('Need translation for police clearance')).toBe(true);
  });

  it('returns false for checklist or eligibility questions', () => {
    expect(isKetdikInstructionIntent('What documents are required?')).toBe(false);
    expect(isKetdikInstructionIntent('Am I eligible for a visa?')).toBe(false);
    expect(isKetdikInstructionIntent('What is my approval chance?')).toBe(false);
  });
});

describe('Ketdik response safety', () => {
  it('flags approvals or checklists as unsafe', () => {
    expect(isKetdikResponseSafe('Your visa is 100% approved')).toBe(false);
    expect(isKetdikResponseSafe('Required documents: passport, bank statement')).toBe(false);
    expect(isKetdikResponseSafe('Here is the checklist you need')).toBe(false);
  });

  it('accepts procedural, source-aware guidance', () => {
    expect(
      isKetdikResponseSafe(
        'Get the bank statement from your Uzbek bank branch. Verify with the official bank or embassy site if requirements changed.'
      )
    ).toBe(true);
  });
});
