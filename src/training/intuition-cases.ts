/** Server-only: never import this catalogue into the browser bundle. Prompts are
 * pedagogical reconstructions, not verbatim records of a historical decision. */
export const INTUITION_CASES = [
  {
    id: 'case-a', kind: 'prioritization', title: 'Unexpected automated activity',
    prompt: 'An automated transaction system has just received a software update. Error messages appear before opening, and unexpected activity follows. What do you prioritize?',
    options: ['Contain activity and verify deployed versions', 'Wait for the activity to settle', 'Increase throughput to clear the queue'],
    recommended: 0,
    rationale: 'Contain exposure first, then verify deployment consistency. Fast output is not evidence of correct behavior.',
    reveal: { name: 'Knight Capital — August 1, 2012', outcome: 'The SEC found a faulty deployment and inadequate controls. Knight sent millions of erroneous orders and lost more than $460 million.', source: 'SEC enforcement announcement, October 16, 2013', url: 'https://www.sec.gov/newsroom/press-releases/2013-222' },
  },
  {
    id: 'case-b', kind: 'tradeoffs', title: 'Recovery after a network interruption',
    prompt: 'A service has experienced a brief network interruption. Database states have diverged. You can restore availability faster by accepting uncertain data consistency, or pause parts of the service for reconciliation. Choose your initial approach.',
    options: ['Resume all writes immediately', 'Prioritize data integrity and communicate a slower recovery', 'Assume reconnection repaired the data'],
    recommended: 1,
    rationale: 'Availability and integrity can conflict. Identify irreversible data risks and communicate the recovery tradeoff; a short network fault can have long-lived effects.',
    reveal: { name: 'GitHub — October 21–22, 2018', outcome: 'A 43-second connectivity interruption triggered database problems and 24 hours and 11 minutes of degraded service. GitHub prioritized data integrity during recovery.', source: 'GitHub official post-incident analysis', url: 'https://github.blog/news-insights/company-news/oct21-post-incident-analysis/' },
  },
  {
    id: 'case-c', kind: 'hypotheses', title: 'A mismatch between two teams',
    prompt: 'Two teams exchange numerical data used to guide a remote vehicle. The observed trajectory differs from the prediction. Which hypothesis would you test first at the interface?',
    options: ['The measurements must be random noise', 'The vehicle must have a mechanical fault', 'The producer and consumer may interpret units differently'],
    recommended: 2,
    rationale: 'Check shared contracts, units and transformations before dismissing discrepancies. This is a useful hypothesis, not proof from the limited information given.',
    reveal: { name: 'Mars Climate Orbiter — September 1999', outcome: 'NASA/JPL reported that an uncorrected transfer error between teams using English and metric units led to the loss of the spacecraft.', source: 'NASA/JPL preliminary findings, September 30, 1999', url: 'https://www.jpl.nasa.gov/news/mars-climate-orbiter-team-finds-likely-cause-of-loss/' },
  },
  {
    id: 'case-d', kind: 'hypotheses', title: 'Checkout registration friction',
    prompt: 'Many shoppers abandon checkout right after clicking the checkout button, where they are asked to register or sign in before paying. Which product hypothesis would you test first?',
    options: ['Replace mandatory pre-checkout registration with guest checkout and optional account creation after purchase', 'Add clearer password validation hints to the registration form', 'Send a discount reminder email 24 hours after abandonment'],
    recommended: 0,
    rationale: 'Remove unrequested commitment before payment. First-time buyers want to complete their purchase, and returning buyers often forget whether they already created an account.',
    reveal: { name: 'UIE / Jared Spool — The $300 Million Button (2009)', outcome: 'Replacing mandatory pre-checkout registration with a simple continue button increased purchasing customers by 45% and added $300 million in first-year revenue.', source: 'User Interface Engineering (UIE) usability case study, January 2009', url: 'https://articles.centercentre.com/three_hundred_million_button/' },
  },
  {
    id: 'case-e', kind: 'tradeoffs', title: 'Feature bloat vs. core job-to-be-done',
    prompt: 'Your mobile check-in app includes gaming badges, group planning, and photo sharing, yet retention is flat and only one workflow — sharing photos with filters — shows strong organic pull. How do you allocate the next product cycle?',
    options: ['Build more check-in rewards to lift the lagging features', 'Refocus the product around the single high-signal photo workflow and cut the rest', 'Keep every feature and redesign the navigation bar'],
    recommended: 1,
    rationale: 'When one workflow carries almost all organic pull, stripping surrounding complexity clarifies product value and accelerates iteration.',
    reveal: { name: 'Burbn to Instagram pivot — October 2010', outcome: 'Founders Kevin Systrom and Mike Krieger stripped location check-ins and schedules from Burbn to focus on mobile photos and filters, reaching 25,000 users on launch day.', source: 'Instagram product history & founder interviews', url: 'https://www.theatlantic.com/technology/archive/2014/07/instagram-used-to-be-called-brbn/373815/' },
  },
  {
    id: 'case-f', kind: 'prioritization', title: 'High traffic, low bookings on a marketplace',
    prompt: 'Listings on a peer-to-peer accommodation marketplace receive views in a major city, but bookings remain low. Looking at the listings, photos are dark and taken on low-resolution phones. What do you prioritize this week?',
    options: ['Rewrite the search ranking algorithm', 'Test higher-quality photography directly on a sample of listings to verify if visual trust is the bottleneck', 'Lower platform service fees by 2%'],
    recommended: 1,
    rationale: 'Before rebuilding search infrastructure, test whether listing presentation and visual trust are blocking conversion at the decision moment.',
    reveal: { name: 'Airbnb — New York photography experiment (2009)', outcome: 'Replacing amateur listing photos with high-quality photographs in New York doubled weekly revenue and led to Airbnb’s Photography Program.', source: 'First Round Review / Airbnb design history', url: 'https://review.firstround.com/How-design-thinking-transformed-Airbnb-from-failing-startup-to-billion-dollar-business/' },
  },
] as const;
export function publicIntuitionCases() {
  return INTUITION_CASES.map(({ id, kind, title, prompt, options }) => ({ id, kind, title, prompt, options }));
}
