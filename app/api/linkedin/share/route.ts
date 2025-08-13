import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Get the LinkedIn access token from the cookie
  const linkedInToken = request.cookies.get('linkedin_token')?.value;

  if (!linkedInToken) {
    return NextResponse.json({ error: 'Not authenticated with LinkedIn' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, url, summary, imageUrl } = body;

    // First, verify the token is still valid
    const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${linkedInToken}`,
      },
    });

    if (!profileResponse.ok) {
      // Token is invalid or expired
      return NextResponse.json({ error: 'LinkedIn token expired or invalid' }, { status: 401 });
    }

    // Create the share content using the UGC API (newer API)
    const shareContent = {
      author: `urn:li:person:${(await profileResponse.json()).id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: summary || title,
          },
          shareMediaCategory: 'ARTICLE',
          media: [
            {
              status: 'READY',
              description: {
                text: summary || title,
              },
              originalUrl: url,
              title: {
                text: title,
              },
              thumbnails: imageUrl ? [{ url: imageUrl }] : undefined,
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    // Post to LinkedIn UGC API
    const shareResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${linkedInToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(shareContent),
    });

    if (!shareResponse.ok) {
      console.error('LinkedIn API error:', await shareResponse.text());
      throw new Error('Failed to share content on LinkedIn');
    }

    const shareData = await shareResponse.json();
    return NextResponse.json({ success: true, data: shareData });
  } catch (error) {
    console.error('LinkedIn sharing error:', error);
    return NextResponse.json({ error: 'Failed to share content on LinkedIn' }, { status: 500 });
  }
}
