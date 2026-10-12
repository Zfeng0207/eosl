import type { PageKey } from '@/pages';

/** Suggested questions per page, from the prototype. Static for now. */
export const SUGGESTED: Readonly<Record<PageKey, readonly string[]>> = {
  ov: [
    'Which sub-portfolio has the most red assets?',
    'Are we on track against the remediation budget?',
    'What changes if we project 6 months ahead?',
  ],
  wa: [
    'Which OS versions are already at EoSL?',
    'Which technical services host the most at-risk applications?',
    'Who owns the hosts approaching EoSL?',
  ],
  na: [
    'Which hosts without applications could be decommissioned?',
    'Which portfolio group has the most hosts without applications?',
    'How many of these hosts are at EoSL?',
  ],
  ne: [
    'Which OS families are missing EoSL dates?',
    'How do we get EoSL dates added for these hosts?',
    'Which cloud has the most hosts without EoSL?',
  ],
  db: [
    'Which database products reach end of support first?',
    'How many production databases are at EoSL?',
    'Which applications depend on SQL Server 2016?',
  ],
  lin: [
    'Trace the selected product to its owners',
    'What is the extended-support exposure for this selection?',
    'Which application should we remediate first?',
  ],
  imp: ['What happens if we do nothing for 6 months?', 'Which cluster should be upgraded first?', 'Summarise the business impact'],
  upd: [
    'How does a status update change the RAG?',
    'Who approves a renewal request?',
    'What happens after the automatic status update?',
  ],
};
