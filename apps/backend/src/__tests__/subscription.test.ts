/**
 * NOTE: Subscription tests are skipped because Stripe credentials are not available in CI.
 * These cover key flows and should be unskipped when Stripe test keys are configured.
 */

describe.skip('SubscriptionService', () => {
  it('creates checkout session for a user', async () => {
    // TODO: provide Stripe test keys and mock Prisma to enable this test
  });

  it('handles webhook signature verification failure gracefully', async () => {
    // TODO: constructEvent with invalid signature should return ok=false
  });

  it('marks subscription as active on customer.subscription.created', async () => {
    // TODO: simulate webhook payload and assert DB updates
  });
});
