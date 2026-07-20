import { Link } from 'react-router-dom'
import LegalPage from '../components/LegalPage.jsx'
import { CONTACT_EMAIL, GOVERNING_LAW, OPERATOR_NAME, TERMS_LAST_UPDATED, SITE_NAME } from '../utils/legalConstants.js'

const mailto = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>

const sections = [
  {
    id: 'acceptance',
    heading: '1. Acceptance of Terms',
    blocks: [
      {
        type: 'p',
        text: (
          <>
            These Terms of Service ("Terms") govern your access to and use of {SITE_NAME} (the
            "Service"), operated by {OPERATOR_NAME} ("we", "us", "our"). By creating an account or
            otherwise using the Service, you agree to be bound by these Terms and by our{' '}
            <Link to="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
          </>
        ),
      },
    ],
  },
  {
    id: 'eligibility',
    heading: '2. Eligibility',
    blocks: [
      {
        type: 'p',
        text: 'You must be at least 16 years old to create an account. By creating an account, you confirm that you meet this requirement and that any information you provide during sign-up is accurate. Guest browsing (which does not require an account) has no age restriction, but grants read-only access and no ability to contribute.',
      },
    ],
  },
  {
    id: 'account-responsibilities',
    heading: '3. Account Responsibilities',
    blocks: [
      {
        type: 'p',
        text: 'You are responsible for maintaining the confidentiality of your sign-in credentials and for all activity that occurs under your account. You agree to:',
      },
      {
        type: 'ul',
        items: [
          'Provide accurate information when creating your account and keep it up to date.',
          'Use one account per person — do not create multiple accounts to circumvent review limits, points mechanics, or a suspension.',
          <>Notify us promptly at {mailto} if you suspect unauthorized access to your account.</>,
          'Take reasonable steps to keep your password and any linked sign-in method secure.',
        ],
      },
    ],
  },
  {
    id: 'user-content',
    heading: '4. User-Generated Content',
    blocks: [
      {
        type: 'p',
        text: (
          <>
            "User Content" means anything you submit to the Service — archive entries, summaries,
            tags, alternate-perspective notes, attachment links, review notes, your username, and your
            profile photo. You retain ownership of your User Content. By submitting it, you grant{' '}
            {OPERATOR_NAME} a non-exclusive, worldwide, royalty-free license to host, store, display,
            reproduce, and distribute it as part of the Service — including, once an entry is approved
            through peer review, as part of the publicly viewable archive.
          </>
        ),
      },
      {
        type: 'p',
        text: 'You are solely responsible for your User Content and confirm that you have the right to submit it (for example, that any linked attachment or source is one you\'re entitled to reference) and that it does not infringe a third party\'s rights.',
      },
      {
        type: 'p',
        text: (
          <>
            Because the archive is a public, collaboratively maintained research record, approved
            entries may be difficult to fully retract once published, and other members may build on
            them ("deepen" them into more detailed entries) before you request removal. See our{' '}
            <Link to="/privacy">Privacy Policy</Link> for how deletion requests are handled.
          </>
        ),
      },
    ],
  },
  {
    id: 'acceptable-use',
    heading: '5. Acceptable Use',
    blocks: [
      {
        type: 'p',
        text: (
          <>
            {SITE_NAME} exists to build a good-faith, peer-reviewed body of research. When submitting
            or reviewing content, you agree to act honestly: represent sources accurately, disclose
            genuine uncertainty rather than presenting it as settled fact, and review others' work on its
            merits rather than to farm points or favors.
          </>
        ),
      },
    ],
  },
  {
    id: 'prohibited-activities',
    heading: '6. Prohibited Activities',
    blocks: [
      { type: 'p', text: 'You agree not to:' },
      {
        type: 'ul',
        items: [
          'Submit content that is unlawful, fraudulent, defamatory, harassing, hateful, or that infringes another person\'s intellectual property or privacy rights.',
          'Knowingly submit fabricated or deliberately misleading research, or misrepresent AI-generated or plagiarized content as your own original work.',
          'Impersonate another person or misrepresent your affiliation with any person or organization.',
          'Attempt to manipulate the review system — for example, coordinating reviews, creating alternate accounts to review your own submissions, or exploiting the points/leaderboard mechanics.',
          'Upload or link to malware, or use attachment links to distribute harmful content.',
          'Attempt to gain unauthorized access to another user\'s account or to any part of the Service not intended for you.',
          'Scrape, bulk-extract, or use automated means to access the Service in a way that places unreasonable load on it or circumvents rate limits.',
          'Use the Service in any way that violates applicable law.',
        ],
      },
    ],
  },
  {
    id: 'intellectual-property',
    heading: '7. Intellectual Property',
    blocks: [
      {
        type: 'p',
        text: (
          <>
            Aside from User Content, the Service — including its design, branding, and underlying
            software — is owned by {OPERATOR_NAME} and protected by applicable intellectual property
            laws. You may not copy, modify, or create derivative works of the Service itself (as opposed
            to the openly licensed archive content within it) without permission.
          </>
        ),
      },
      {
        type: 'p',
        text: (
          <>
            If you believe content on the Service infringes your intellectual property rights, contact
            us at {mailto} with enough detail to identify the content and your claim, and we will review
            and act on legitimate requests.
          </>
        ),
      },
    ],
  },
  {
    id: 'content-moderation',
    heading: '8. Content Moderation',
    blocks: [
      {
        type: 'p',
        text: 'New submissions go through peer review before appearing in the public archive: independent reviewers fact-check and rate each entry, and an entry is approved or rejected once enough reviews are in, with safeguards preventing you from reviewing your own submission or reviewing the same entry twice.',
      },
      {
        type: 'p',
        text: 'Independent of that review process, we may remove, hide, or edit any content — approved or not — that violates these Terms, and may do so without prior notice where necessary to prevent harm or abuse.',
      },
    ],
  },
  {
    id: 'suspension-termination',
    heading: '9. Account Suspension or Termination',
    blocks: [
      {
        type: 'p',
        text: 'We may suspend or terminate your account if you violate these Terms, if we\'re required to by law, or if we discontinue the Service. Where practical, we\'ll make a reasonable effort to notify you first for anything short of urgent abuse or legal risk.',
      },
      {
        type: 'p',
        text: <>You may stop using the Service at any time and request deletion of your account by following the process in our <Link to="/privacy">Privacy Policy</Link>.</>,
      },
    ],
  },
  {
    id: 'disclaimer',
    heading: '10. Disclaimer of Warranties',
    blocks: [
      {
        type: 'p',
        text: 'The Service, and all archive content on it, is provided "as is" and "as available," without warranties of any kind, express or implied. Peer review improves the reliability of archive entries but does not make them a substitute for professional, medical, legal, safety, or engineering advice — verify anything safety-critical independently before relying on it. We do not warrant that the Service will be uninterrupted, error-free, or secure.',
      },
    ],
  },
  {
    id: 'liability',
    heading: '11. Limitation of Liability',
    blocks: [
      {
        type: 'p',
        text: (
          <>
            To the maximum extent permitted by applicable law, {OPERATOR_NAME} shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages, or any loss of data,
            use, or goodwill, arising from your use of (or inability to use) the Service — including
            reliance on archive content — even if we've been advised of the possibility of such damages.
            Nothing in these Terms limits liability where doing so would be unlawful, such as for fraud
            or death or personal injury caused by our negligence.
          </>
        ),
      },
    ],
  },
  {
    id: 'changes-to-service',
    heading: '12. Changes to the Service',
    blocks: [
      {
        type: 'p',
        text: 'The Service is under active development. We may add, change, or remove features (including entire pages) at any time. We\'ll update these Terms when a change meaningfully affects your rights or obligations, and revise the "Last updated" date above when we do.',
      },
    ],
  },
  {
    id: 'governing-law',
    heading: '13. Governing Law',
    blocks: [
      {
        type: 'p',
        text: (
          <>
            These Terms are governed by the laws of {GOVERNING_LAW}, without regard to its
            conflict-of-law principles, without prejudice to any mandatory consumer-protection
            provisions of the law of your country of residence if you are a consumer in the EU.
          </>
        ),
      },
    ],
  },
  {
    id: 'contact',
    heading: '14. Contact Information',
    blocks: [
      {
        type: 'p',
        text: <>Questions about these Terms can be sent to {mailto}. See also our <Link to="/privacy">Privacy Policy</Link>.</>,
      },
    ],
  },
]

export default function TermsOfService() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      lastUpdated={TERMS_LAST_UPDATED}
      intro="The rules for creating an account, contributing research, and using The SOLAR Archive."
      sections={sections}
      seoDescription="The SOLAR Archive's Terms of Service — account rules, acceptable use, content ownership, and liability terms."
      path="/terms"
    />
  )
}
