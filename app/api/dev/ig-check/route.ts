import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TOKEN = process.env.META_ACCESS_TOKEN?.trim();
const BASE  = 'https://graph.instagram.com/v21.0';

async function igFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: 'no-store',
  });
  return res.json();
}

export async function GET() {
  if (!TOKEN) {
    return NextResponse.json({ error: 'META_ACCESS_TOKEN is not set in .env.local' }, { status: 400 });
  }

  // 1. Get account info
  const me = await igFetch('/me', { fields: 'id,name,username' });
  if (me.error) {
    return NextResponse.json({
      connected: false,
      token_preview: TOKEN.slice(0, 12) + '…',
      error: me.error.message,
      error_code: me.error.code,
    });
  }

  // 2. Fetch conversations — first page
  const convoPage1 = await igFetch(`/${me.id}/conversations`, {
    fields: 'id,participants,messages{message,from,created_time}',
  });

  // 3. If first page is empty but has a next cursor, follow it
  let convoPage2 = null;
  const nextUrl = convoPage1.paging?.next;
  if (Array.isArray(convoPage1.data) && convoPage1.data.length === 0 && nextUrl) {
    convoPage2 = await igFetch(nextUrl);
  }

  // Extract the real IG account ID from the next URL if available
  // (Instagram often returns a different internal ID in the pagination URL)
  let internalIgId: string | null = null;
  if (nextUrl) {
    const match = nextUrl.match(/\/(\d+)\/conversations/);
    if (match) internalIgId = match[1];
  }

  // 4. Try with the internal ID if it differs from me.id
  let convoViaInternalId = null;
  if (internalIgId && internalIgId !== me.id) {
    convoViaInternalId = await igFetch(`/${internalIgId}/conversations`, {
      fields: 'id,participants,messages{message,from,created_time}',
    });
  }

  // 5. Probe whether instagram_business_manage_messages scope is present
  //    by requesting a field that requires it — a permission error = scope missing
  const messagingProbe = await igFetch(`/${me.id}/conversations`, {
    fields: 'id,messages',
    limit: '1',
  });

  const scopeMissing =
    messagingProbe?.error?.code === 200 ||
    messagingProbe?.error?.type === 'OAuthException' ||
    (Array.isArray(messagingProbe?.data) && messagingProbe.data.length === 0 && !nextUrl);

  // Pick the first result set that has actual data
  const allConvos =
    (convoViaInternalId?.data?.length > 0 && convoViaInternalId.data) ||
    (convoPage2?.data?.length > 0 && convoPage2.data) ||
    convoPage1.data ||
    [];

  return NextResponse.json({
    connected: true,
    token_preview: TOKEN.slice(0, 12) + '…',
    account: me,
    scoped_id: me.id,
    internal_ig_id: internalIgId,
    conversations: allConvos,
    conversations_error: convoPage1?.error?.message ?? null,
    messaging_probe: messagingProbe,
    scope_diagnosis: scopeMissing
      ? 'Token likely missing instagram_business_manage_messages scope — regenerate with that permission'
      : 'Scope looks OK',
    debug: {
      page1_count: convoPage1.data?.length ?? 0,
      page2_count: convoPage2?.data?.length ?? 0,
      internal_id_count: convoViaInternalId?.data?.length ?? 0,
      has_next: !!nextUrl,
    },
  });
}
