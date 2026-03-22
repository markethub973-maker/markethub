/**
 * Resolves the correct access token for an Instagram Business Account.
 * If the stored token is a User Token, tries to get the Page Access Token
 * from /me/accounts, which is required for IG Business API calls.
 */
export async function resolveIGToken(
  storedToken: string,
  igId: string,
  knownPageIds?: string
): Promise<string> {
  // First, test if the stored token works directly
  const testRes = await fetch(
    `https://graph.facebook.com/v21.0/${igId}?fields=id&access_token=${storedToken}`
  );
  const testData = await testRes.json();
  if (!testData.error) return storedToken; // token works fine

  // Token doesn't work — try to get Page Access Token via /me/accounts
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,access_token,instagram_business_account,connected_instagram_account&access_token=${storedToken}`
  );
  const pagesData = await pagesRes.json();

  if (!pagesData.error && pagesData.data?.length > 0) {
    for (const page of pagesData.data) {
      // Check both Business and Creator account fields
      const linkedIg = page.instagram_business_account?.id || page.connected_instagram_account?.id;
      if (linkedIg === igId) {
        return page.access_token;
      }
      // Also try fetching IG account from this page token
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account,connected_instagram_account&access_token=${page.access_token}`
      );
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id === igId || igData.connected_instagram_account?.id === igId) {
        return page.access_token;
      }
    }

    // If IG ID not matched but we have pages, try the first page token directly
    const firstPageToken = pagesData.data[0].access_token;
    const testWithPageRes = await fetch(
      `https://graph.facebook.com/v21.0/${igId}?fields=id&access_token=${firstPageToken}`
    );
    const testWithPage = await testWithPageRes.json();
    if (!testWithPage.error) return firstPageToken;
  }

  // Try known page IDs from env
  const knownIds = (knownPageIds || process.env.FACEBOOK_PAGE_IDS || "").split(",").filter(Boolean);
  for (const pageId of knownIds) {
    const pageRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token,instagram_business_account&access_token=${storedToken}`
    );
    const pageData = await pageRes.json();
    if (pageData.instagram_business_account?.id === igId && pageData.access_token) {
      return pageData.access_token;
    }
  }

  // Return original token as last resort
  return storedToken;
}
