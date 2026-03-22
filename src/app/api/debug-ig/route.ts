import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("instagram_access_token, instagram_user_id, instagram_username")
    .eq("id", user.id)
    .single();

  if (!profile?.instagram_access_token) return NextResponse.json({ error: "No token" });

  const token = profile.instagram_access_token;
  const igId = profile.instagram_user_id;

  const [meRes, accountsRes, bizRes] = await Promise.all([
    fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`),
    fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account,connected_instagram_account&access_token=${token}`),
    fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name&access_token=${token}`),
  ]);

  const [me, accounts, businesses] = await Promise.all([meRes.json(), accountsRes.json(), bizRes.json()]);

  const pages = accounts.data || [];

  // For each page, try to get real IG account (both Business and Creator fields)
  const pageDetails = await Promise.all(pages.map(async (page: any) => {
    const pageToken = page.access_token;
    const [igFromPageRes, igWithPageTokenRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username,followers_count},connected_instagram_account{id,username,followers_count}&access_token=${pageToken}`),
      fetch(`https://graph.facebook.com/v21.0/${igId}?fields=id,username,followers_count&access_token=${pageToken}`),
    ]);
    const [igFromPage, igWithPageToken] = await Promise.all([igFromPageRes.json(), igWithPageTokenRes.json()]);
    return {
      pageId: page.id,
      pageName: page.name,
      igBusinessAccount: igFromPage.instagram_business_account || null,
      igConnectedAccount: igFromPage.connected_instagram_account || null,
      igFromPageError: igFromPage.error || null,
      igWithPageToken: igWithPageToken.error ? igWithPageToken.error.message : igWithPageToken,
    };
  }));

  // Check business portfolios for IG accounts
  const bizDetails = [];
  if (!businesses.error && businesses.data?.length > 0) {
    for (const biz of businesses.data) {
      const igAccRes = await fetch(
        `https://graph.facebook.com/v21.0/${biz.id}/instagram_business_accounts?fields=id,username&access_token=${token}`
      );
      const igAccData = await igAccRes.json();
      bizDetails.push({
        bizId: biz.id,
        bizName: biz.name,
        igAccounts: igAccData.data || igAccData.error || null,
      });
    }
  }

  return NextResponse.json({
    savedIgId: igId,
    savedUsername: profile.instagram_username,
    me,
    pageDetails,
    bizDetails,
  });
}
