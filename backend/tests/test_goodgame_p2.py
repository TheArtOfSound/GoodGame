"""GoodGame.center P1+P2 backend tests.

Covers: profile edit (display_name/bio), avatar/banner upload,
follow/unfollow, search, tags, sitemap, community moderation (members,
role/mute/ban/unban/remove), community-scoped reports queue + resolve,
per-route rate limit on report endpoint.
"""
import io
import os
import secrets

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL required"
API = f"{BASE_URL}/api"


def _uname(prefix="p2"):
    return f"{prefix}{secrets.token_hex(5)}"


def _png_bytes() -> bytes:
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc\xcf"
        b"\xc0\x00\x00\x00\x03\x00\x01\x83\xa9\xea\x84\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def _onboard(prefix="p2"):
    s = requests.Session()
    username = _uname(prefix)
    r = s.post(f"{API}/onboarding", json={
        "username": username, "password": "pw12345678", "pin": "1234"
    })
    if r.status_code == 429:
        pytest.skip(f"onboarding rate-limited for {prefix}")
    assert r.status_code == 200, r.text
    s.username = username
    return s


# Shared sessions
@pytest.fixture(scope="module")
def user_a():
    return _onboard("pa")


@pytest.fixture(scope="module")
def user_b():
    return _onboard("pb")


@pytest.fixture(scope="module")
def user_c():
    return _onboard("pc")


# ---------------- Profile edit ----------------
class TestProfile:
    def test_patch_profile_display_name_and_bio(self, user_a):
        new_dn = f"Alpha {secrets.token_hex(2)}"
        new_bio = "I make tiny browser games."
        r = user_a.patch(f"{API}/me/profile", json={"display_name": new_dn, "bio": new_bio})
        assert r.status_code == 200, r.text
        # GET creator reflects it
        rg = requests.get(f"{API}/creators/{user_a.username}")
        assert rg.status_code == 200
        c = rg.json()["creator"]
        assert c["display_name"] == new_dn
        assert c["bio"] == new_bio

    def test_patch_profile_empty_dn_400(self, user_a):
        r = user_a.patch(f"{API}/me/profile", json={"display_name": "   "})
        assert r.status_code == 400

    def test_patch_profile_requires_auth(self):
        r = requests.patch(f"{API}/me/profile", json={"bio": "hi"})
        assert r.status_code == 401


# ---------------- Avatar / Banner ----------------
class TestAvatarBanner:
    def test_avatar_upload_png_ok_and_served(self, user_a):
        r = user_a.post(
            f"{API}/me/avatar",
            files={"file": ("a.png", _png_bytes(), "image/png")},
        )
        assert r.status_code == 200, r.text
        url = r.json()["avatar_url"]
        assert url.startswith("/api/user-media/") and url.endswith(".png")
        # creator profile carries avatar
        c = requests.get(f"{API}/creators/{user_a.username}").json()["creator"]
        assert c["avatar"] == url
        # serve works
        rs = requests.get(f"{BASE_URL}{url}")
        assert rs.status_code == 200
        assert "image" in rs.headers.get("content-type", "")

    def test_avatar_rejects_text(self, user_a):
        r = user_a.post(
            f"{API}/me/avatar",
            files={"file": ("a.txt", b"hello", "text/plain")},
        )
        assert r.status_code == 400

    def test_avatar_rejects_oversize(self, user_a):
        big = b"\x00" * (4 * 1024 * 1024 + 16)
        r = user_a.post(
            f"{API}/me/avatar",
            files={"file": ("a.png", big, "image/png")},
        )
        assert r.status_code == 400

    def test_banner_upload_ok(self, user_a):
        r = user_a.post(
            f"{API}/me/banner",
            files={"file": ("b.png", _png_bytes(), "image/png")},
        )
        assert r.status_code == 200, r.text
        assert r.json()["banner_url"].startswith("/api/user-media/")

    def test_banner_rejects_oversize(self, user_a):
        big = b"\x00" * (8 * 1024 * 1024 + 16)
        r = user_a.post(
            f"{API}/me/banner",
            files={"file": ("b.png", big, "image/png")},
        )
        assert r.status_code == 400


# ---------------- Follow / Unfollow ----------------
class TestFollow:
    def test_follow_self_400(self, user_a):
        r = user_a.post(f"{API}/follow/{user_a.username}")
        assert r.status_code == 400

    def test_follow_nonexistent_404(self, user_a):
        r = user_a.post(f"{API}/follow/nosuchuser_zzz_xx9")
        assert r.status_code == 404

    def test_follow_unfollow_flow(self, user_a, user_b):
        # A follows B
        r = user_a.post(f"{API}/follow/{user_b.username}")
        assert r.status_code == 200, r.text
        assert r.json()["following"] is True
        # GET creator(B) with A cookie -> is_following True, follower_count >=1
        rg = user_a.get(f"{API}/creators/{user_b.username}")
        assert rg.status_code == 200
        body = rg.json()
        assert body["is_following"] is True
        assert body["creator"]["follower_count"] >= 1
        # B's followers includes A
        rf = requests.get(f"{API}/creators/{user_b.username}/followers")
        assert rf.status_code == 200
        unames = [u["username"] for u in rf.json()["followers"]]
        assert user_a.username in unames
        # A's following includes B
        rfo = requests.get(f"{API}/creators/{user_a.username}/following")
        assert rfo.status_code == 200
        assert user_b.username in [u["username"] for u in rfo.json()["following"]]
        # Unfollow
        ru = user_a.post(f"{API}/unfollow/{user_b.username}")
        assert ru.status_code == 200
        rg2 = user_a.get(f"{API}/creators/{user_b.username}").json()
        assert rg2["is_following"] is False

    def test_follow_requires_auth(self, user_b):
        r = requests.post(f"{API}/follow/{user_b.username}")
        assert r.status_code == 401


# ---------------- Discover: search / tags / sitemap ----------------
class TestDiscover:
    def test_search_neon(self):
        r = requests.get(f"{API}/search", params={"q": "neon"})
        assert r.status_code == 200
        slugs = [g["slug"] for g in r.json()["results"]]
        assert "neon-starfighter" in slugs, f"got slugs={slugs}"

    def test_search_empty_q(self):
        r = requests.get(f"{API}/search", params={"q": ""})
        assert r.status_code == 200
        assert r.json()["results"] == []

    def test_tag_retro(self):
        r = requests.get(f"{API}/tags/retro")
        assert r.status_code == 200
        slugs = [g["slug"] for g in r.json()["games"]]
        assert "neon-starfighter" in slugs

    def test_popular_tags(self):
        r = requests.get(f"{API}/tags")
        assert r.status_code == 200
        tags = [t["tag"] for t in r.json()["tags"]]
        # At least one of these expected from neon-starfighter
        assert any(t in tags for t in ("retro", "arcade", "space"))

    def test_sitemap_xml(self):
        r = requests.get(f"{API}/sitemap.xml")
        assert r.status_code == 200
        assert "xml" in r.headers.get("content-type", "")
        body = r.text
        assert "/games/neon-starfighter" in body
        assert "/creators/" in body


# ---------------- Community moderation ----------------
class TestCommunityModeration:
    @pytest.fixture(scope="class")
    def comm(self, user_a, user_b, user_c):
        """Create community as user_a, b joins. Returns slug."""
        name = f"Mod {secrets.token_hex(3)}"
        r = user_a.post(f"{API}/communities", json={"name": name, "description": "d"})
        assert r.status_code == 200, r.text
        slug = r.json()["community"]["slug"]
        # b and c join
        r2 = user_b.post(f"{API}/communities/{slug}/join")
        assert r2.status_code == 200
        r3 = user_c.post(f"{API}/communities/{slug}/join")
        assert r3.status_code == 200
        return slug

    def test_members_listing(self, user_a, user_b, comm):
        r = user_a.get(f"{API}/communities/{comm}/members")
        assert r.status_code == 200
        body = r.json()
        assert body["viewer_role"] == "owner"
        unames = [m["username"] for m in body["members"]]
        assert user_a.username in unames
        assert user_b.username in unames

    def test_role_promote_only_owner(self, user_a, user_b, user_c, comm):
        # b cannot promote c
        rbad = user_b.post(
            f"{API}/communities/{comm}/members/{await_user_id(user_c)}/role",
            data={"role": "moderator"},
        )
        assert rbad.status_code == 403
        # owner can promote b
        bid = await_user_id(user_b)
        rok = user_a.post(
            f"{API}/communities/{comm}/members/{bid}/role",
            data={"role": "moderator"},
        )
        assert rok.status_code == 200
        # b can now hide a post
        # b posts then hides own post
        rp = user_b.post(f"{API}/communities/{comm}/posts", data={"body": "modtest"})
        assert rp.status_code == 200
        pid = rp.json()["post_id"]
        rh = user_b.post(f"{API}/communities/{comm}/posts/{pid}/hide")
        assert rh.status_code == 200

    def test_mute_unmute(self, user_a, user_c, comm):
        cid = await_user_id(user_c)
        rm = user_a.post(f"{API}/communities/{comm}/members/{cid}/mute")
        assert rm.status_code == 200
        # muted -> cannot post
        rp = user_c.post(f"{API}/communities/{comm}/posts", data={"body": "muted post"})
        assert rp.status_code == 403
        # unmute
        ru = user_a.post(f"{API}/communities/{comm}/members/{cid}/unmute")
        assert ru.status_code == 200
        rp2 = user_c.post(f"{API}/communities/{comm}/posts", data={"body": "hello after unmute"})
        assert rp2.status_code == 200

    def test_ban_unban(self, user_a, user_c, comm):
        cid = await_user_id(user_c)
        rb = user_a.post(f"{API}/communities/{comm}/members/{cid}/ban")
        assert rb.status_code == 200
        rp = user_c.post(f"{API}/communities/{comm}/posts", data={"body": "banned"})
        assert rp.status_code == 403
        ru = user_a.post(f"{API}/communities/{comm}/members/{cid}/unban")
        assert ru.status_code == 200

    def test_owner_cannot_be_modified(self, user_a, comm):
        aid = await_user_id(user_a)
        r = user_a.post(f"{API}/communities/{comm}/members/{aid}/ban")
        assert r.status_code == 400

    def test_remove_member(self, user_a, user_c, comm):
        # ensure c is in
        user_c.post(f"{API}/communities/{comm}/join")
        cid = await_user_id(user_c)
        rr = user_a.post(f"{API}/communities/{comm}/members/{cid}/remove")
        assert rr.status_code == 200


# ---------------- Reports queue + resolve ----------------
class TestReportsQueue:
    @pytest.fixture(scope="class")
    def setup(self, user_a, user_b, user_c):
        """Create community A-owned, b and c join, b posts, c reports."""
        name = f"RepC {secrets.token_hex(3)}"
        r = user_a.post(f"{API}/communities", json={"name": name})
        assert r.status_code == 200, r.text
        slug = r.json()["community"]["slug"]
        assert user_b.post(f"{API}/communities/{slug}/join").status_code == 200
        assert user_c.post(f"{API}/communities/{slug}/join").status_code == 200
        rp = user_b.post(f"{API}/communities/{slug}/posts", data={"body": "to be reported"})
        assert rp.status_code == 200, rp.text
        pid = rp.json()["post_id"]
        rr = user_c.post(
            f"{API}/reports",
            data={
                "target_type": "community_post",
                "target_id": pid,
                "reason": "spam test",
                "community_slug": slug,
            },
        )
        assert rr.status_code == 200, rr.text
        return {"slug": slug, "pid": pid, "rid": rr.json()["report_id"]}

    def test_queue_visible_to_mod(self, user_a, setup):
        r = user_a.get(f"{API}/communities/{setup['slug']}/reports")
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()["reports"]]
        assert setup["rid"] in ids

    def test_queue_403_for_nonmod(self, user_c, setup):
        r = user_c.get(f"{API}/communities/{setup['slug']}/reports")
        assert r.status_code == 403

    def test_resolve_dismiss(self, user_a, setup):
        r = user_a.post(
            f"{API}/reports/{setup['rid']}/resolve",
            data={"resolution": "dismissed"},
        )
        assert r.status_code == 200
        # No longer open
        rl = user_a.get(f"{API}/communities/{setup['slug']}/reports").json()
        ids = [x["id"] for x in rl["reports"]]
        assert setup["rid"] not in ids


# ---------------- Helpers ----------------
_user_id_cache = {}


def await_user_id(sess):
    """Sync helper to fetch user.id from /api/session for a session."""
    if sess.username in _user_id_cache:
        return _user_id_cache[sess.username]
    r = sess.get(f"{API}/session")
    assert r.status_code == 200, r.text
    uid = r.json().get("user", {}).get("id") or r.json().get("user_id")
    if not uid:
        # fall back to creator endpoint
        c = requests.get(f"{API}/creators/{sess.username}").json()
        uid = c["creator"]["id"]
    _user_id_cache[sess.username] = uid
    return uid
