import { useParams, Link } from "react-router-dom";

const PAGES = {
  terms: {
    title: "Terms of Service",
    body: `Welcome to GoodGame.center. By using this platform you agree to the following.

1. Eligibility. You must be old enough to legally use this service in your jurisdiction.
2. Accounts. You are responsible for the activity that happens under your account. Choose a strong password and do not share credentials.
3. User content. You retain ownership of the games, clips, posts, and assets you upload. By uploading you grant GoodGame.center a non-exclusive license to host, display, and stream that content for the purpose of operating the service.
4. Acceptable use. You will not upload content that is illegal, infringes another party's rights, contains malware, attempts to compromise other users, or violates the Content Policy below.
5. Sandboxing. Uploaded games run in a sandboxed iframe. Attempts to escape that sandbox, exfiltrate session cookies, fingerprint users, or run miners are prohibited.
6. Termination. We may suspend or remove content and accounts that violate these terms.
7. Disclaimer. The service is provided "as is" without warranty. We are not liable for indirect damages.
8. Updates. We may update these terms. Continued use after an update constitutes acceptance.

This page is a baseline policy. Production launches should be reviewed by counsel.`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `What we collect.
- Account data you provide: username, display name, password hash, PIN hash.
- Session data: a random session id stored in an HttpOnly cookie; your user id is never used as the cookie value.
- Content you upload: game builds, thumbnails, clips, posts.
- Operational telemetry: request logs, error logs.

What we do not do.
- We do not sell personal data.
- We do not embed third-party advertising trackers in the application UI.
- We do not require a wallet or any crypto identifier.

How content is served.
- Uploaded game assets are served from authenticated backend routes. Top-level navigation to raw upload paths is blocked and redirected to the safe game page.
- Cookies are HttpOnly, SameSite=Lax, Secure over HTTPS, and host-scoped.

Your controls.
- You can delete your uploads and request account deletion by contacting safety@goodgame.center.

This page is a baseline policy. Production launches should be reviewed by counsel.`,
  },
  dmca: {
    title: "DMCA & Copyright Policy",
    body: `If you believe content on GoodGame.center infringes your copyright, send a notice that includes:
- Your contact information.
- A description of the copyrighted work.
- The URL of the allegedly infringing material.
- A statement, under penalty of perjury, that you are authorized to act on the copyright owner's behalf and have a good-faith belief that the use is not authorized.
- Your physical or electronic signature.

Send notices to: copyright@goodgame.center.

Counter notices. If your content was removed and you believe it was a mistake, you may submit a counter notice with the same elements above plus consent to jurisdiction.

Repeat infringers. Accounts that receive multiple valid notices will be terminated.

This page is a baseline policy. Production launches should be reviewed by counsel.`,
  },
  content: {
    title: "Content Policy & Community Guidelines",
    body: `GoodGame.center exists to host games and the community around them. Keep it that way.

You may not upload, post, or stream:
- Content that sexualizes minors. Zero tolerance. Reports trigger immediate removal and legal referral.
- Content that incites violence, harassment, or hatred against a person or group.
- Content that contains malware, browser exploits, drive-by downloads, cryptominers, or anything that abuses the user's device.
- Content that impersonates another person without consent.
- Content that violates someone else's copyright, trademark, or other rights.
- Spam, deceptive scams, fake giveaways, or phishing.

Moderation.
- Community owners and moderators can hide posts in their communities.
- Reports can be filed via the report button on most content.
- Reported content may be reviewed and removed.

Repeat infringer policy. Accounts that repeatedly violate this policy will be permanently removed.

This page is a baseline policy. Production launches should be reviewed by counsel.`,
  },
};

export default function Legal() {
  const { topic } = useParams();
  const page = PAGES[topic];
  if (!page)
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl uppercase font-bold text-white">Not found</h1>
        <Link to="/" className="text-[#D4AF37] underline mt-4 inline-block">
          Home
        </Link>
      </div>
    );
  return (
    <article className="max-w-3xl mx-auto px-4 md:px-0 py-16" data-testid={`legal-${topic}`}>
      <div className="text-[#D4AF37] font-mono text-xs uppercase tracking-[0.3em]">Trust & Safety</div>
      <h1 className="text-3xl md:text-4xl font-bold uppercase text-white mt-2 tracking-tight">
        {page.title}
      </h1>
      <div className="mt-8 text-[#A1A1AA] whitespace-pre-wrap leading-relaxed text-base">
        {page.body}
      </div>
      <div className="mt-12 border-t border-[#1A1A1A] pt-6 text-[#52525B] font-mono text-xs uppercase tracking-[0.2em]">
        Last updated: 2026
      </div>
    </article>
  );
}
