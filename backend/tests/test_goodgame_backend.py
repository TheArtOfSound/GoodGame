"""GoodGame.center backend integration tests.

Covers: version, public access, onboarding/login/session/logout,
games CRUD + UGC serve + thumbnail + build + patch,
creators, clips, communities/posts/hide, reports.
"""
import io
import os
import secrets
import zipfile

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://production-ready-199.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------------- helpers ----------------
def _uname(prefix="tst"):
    return f"{prefix}{secrets.token_hex(5)}"


def _make_zip(files: dict) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return buf.getvalue()


def _png_bytes() -> bytes:
    # 1x1 PNG
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xfc\xcf"
        b"\xc0\x00\x00\x00\x03\x00\x01\x83\xa9\xea\x84\x00\x00\x00\x00IEND\xaeB`\x82"
    )


def _tiny_mp4() -> bytes:
    # Minimal ftyp box - server only validates content-type, not container
    return b"\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isomiso2mp41" + b"\x00" * 256


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def session_a():
    """Authenticated session for user A (creator)."""
    s = requests.Session()
    username = _uname("a")
    r = s.post(f"{API}/onboarding", json={
        "username": username, "password": "pw12345678", "pin": "1234"
    })
    assert r.status_code == 200, r.text
    s.username = username
    return s


@pytest.fixture(scope="module")
def session_b():
    s = requests.Session()
    username = _uname("b")
    r = s.post(f"{API}/onboarding", json={
        "username": username, "password": "pw12345678", "pin": "4321"
    })
    assert r.status_code == 200, r.text
    s.username = username
    return s


@pytest.fixture(scope="module", autouse=True)
def _prewarm(session_a, session_b):
    """Force session_a/session_b to be created before TestAuth exhausts onboarding rate limit."""
    return None


@pytest.fixture(scope="module")
def uploaded_game(session_a):
    zip_bytes = _make_zip({"index.html": "<html><body>HELLO</body></html>"})
    r = session_a.post(
        f"{API}/games",
        data={"title": f"Test Game {secrets.token_hex(3)}", "pitch": "p", "description": "d", "tags": "test"},
        files={"build": ("game.zip", zip_bytes, "application/zip")},
    )
    assert r.status_code == 200, r.text
    return r.json()["game"]


# ---------------- Version & public pages ----------------
class TestPublic:
    def test_version(self):
        r = requests.get(f"{API}/__version")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True

    @pytest.mark.parametrize("path", [
        "/", "/games", "/games/browser", "/clips", "/communities",
        "/legal/terms", "/legal/privacy", "/legal/dmca", "/legal/content",
    ])
    def test_public_pages_no_redirect_to_login(self, path):
        r = requests.get(f"{BASE_URL}{path}", allow_redirects=False, timeout=20)
        # SPA returns 200 for any path
        assert r.status_code == 200, f"{path} -> {r.status_code}"
        # Ensure no server-side redirect to /login
        loc = r.headers.get("location", "")
        assert "/login" not in loc.lower()


# ---------------- Onboarding / Login / Session ----------------
class TestAuth:
    def test_onboarding_success_sets_cookie(self):
        s = requests.Session()
        r = s.post(f"{API}/onboarding", json={
            "username": _uname("ok"), "password": "pw12345678", "pin": "1234"
        })
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        assert "gg_session" in s.cookies.get_dict()

    def test_onboarding_reserved(self):
        r = requests.post(f"{API}/onboarding", json={
            "username": "admin", "password": "pw12345678", "pin": "1234"
        })
        assert r.status_code == 400

    def test_onboarding_reserved_more(self):
        for u in ("system", "goodgame", "moderator"):
            r = requests.post(f"{API}/onboarding", json={
                "username": u, "password": "pw12345678", "pin": "1234"
            })
            assert r.status_code == 400, f"{u} -> {r.status_code}"

    def test_onboarding_duplicate(self):
        username = _uname("dup")
        r1 = requests.post(f"{API}/onboarding", json={
            "username": username, "password": "pw12345678", "pin": "1234"
        })
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/onboarding", json={
            "username": username, "password": "pw12345678", "pin": "1234"
        })
        assert r2.status_code == 409

    def test_login_success_and_wrong_password(self):
        username = _uname("lg")
        requests.post(f"{API}/onboarding", json={
            "username": username, "password": "pw12345678", "pin": "1234"
        })
        s = requests.Session()
        ok = s.post(f"{API}/login", json={"username": username, "password": "pw12345678"})
        assert ok.status_code == 200
        assert "gg_session" in s.cookies.get_dict()
        bad = requests.post(f"{API}/login", json={"username": username, "password": "wrongpwd!"})
        assert bad.status_code == 401

    def test_session_logged_in_and_out(self, session_a):
        r = session_a.get(f"{API}/session")
        assert r.status_code == 200 and r.json()["logged_in"] is True
        assert r.json()["username"] == session_a.username
        # Unauth
        r2 = requests.get(f"{API}/session")
        assert r2.status_code == 200 and r2.json()["logged_in"] is False

    def test_logout(self, session_a):
        # Login a fresh sub-session for the existing user_a (don't kill session_a)
        s = requests.Session()
        r = s.post(f"{API}/login", json={"username": session_a.username, "password": "pw12345678"})
        if r.status_code == 429:
            pytest.skip("rate-limited login")
        assert r.status_code == 200
        sid = s.cookies.get_dict().get("gg_session")
        assert sid, "expected gg_session cookie"
        rr = s.post(f"{API}/logout")
        assert rr.status_code == 200
        # After logout, the cookie should be invalid
        s2 = requests.Session()
        s2.cookies.set("gg_session", sid)
        r2 = s2.get(f"{API}/session")
        assert r2.json()["logged_in"] is False


# ---------------- Games CRUD + UGC ----------------
class TestGames:
    def test_create_game_appears_in_listing(self, session_a, uploaded_game):
        slug = uploaded_game["slug"]
        r_list = requests.get(f"{API}/games")
        assert r_list.status_code == 200
        slugs = [g["slug"] for g in r_list.json()["games"]]
        assert slug in slugs
        r_det = requests.get(f"{API}/games/{slug}")
        assert r_det.status_code == 200
        body = r_det.json()
        assert body["game"]["slug"] == slug
        assert isinstance(body.get("releases"), list)
        assert len(body["releases"]) >= 1

    def test_zip_without_index_rejected(self, session_a):
        zb = _make_zip({"main.html": "<html></html>"})
        r = session_a.post(
            f"{API}/games",
            data={"title": "NoIndex"},
            files={"build": ("g.zip", zb, "application/zip")},
        )
        assert r.status_code == 400

    def test_zip_with_path_traversal_rejected(self, session_a):
        # All members unsafe -> "no usable files" -> 400
        zb = _make_zip({"../evil.html": "x", "/etc/passwd": "y"})
        r = session_a.post(
            f"{API}/games",
            data={"title": "Bad"},
            files={"build": ("g.zip", zb, "application/zip")},
        )
        assert r.status_code == 400

    def test_ugc_top_level_redirects(self, uploaded_game):
        # game id needed
        slug = uploaded_game["slug"]
        det = requests.get(f"{API}/games/{slug}").json()
        gid = det["game"]["id"]
        r = requests.get(
            f"{API}/ugc/{gid}/index.html",
            headers={"Sec-Fetch-Dest": "document"},
            allow_redirects=False,
        )
        assert r.status_code == 302
        assert f"/games/{slug}/play" in r.headers.get("location", "")

    def test_ugc_iframe_serves_html_with_base_href(self, uploaded_game):
        det = requests.get(f"{API}/games/{uploaded_game['slug']}").json()
        gid = det["game"]["id"]
        r = requests.get(
            f"{API}/ugc/{gid}/index.html",
            headers={"Sec-Fetch-Dest": "iframe"},
        )
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
        assert "content-security-policy" in {k.lower() for k in r.headers.keys()}
        assert f'<base href="/api/ugc/{gid}/' in r.text

    def test_thumbnail_upload_owner(self, session_a, uploaded_game):
        slug = uploaded_game["slug"]
        r = session_a.post(
            f"{API}/games/{slug}/thumbnail",
            files={"file": ("c.png", _png_bytes(), "image/png")},
        )
        assert r.status_code == 200, r.text
        cover = r.json()["cover_image"]
        assert cover and cover.startswith("/api/media/")
        det = requests.get(f"{API}/games/{slug}").json()
        assert det["game"]["cover_image"] == cover

    def test_thumbnail_bad_type(self, session_a, uploaded_game):
        r = session_a.post(
            f"{API}/games/{uploaded_game['slug']}/thumbnail",
            files={"file": ("c.txt", b"hello", "text/plain")},
        )
        assert r.status_code == 400

    def test_thumbnail_too_large(self, session_a, uploaded_game):
        big = b"\x00" * (8 * 1024 * 1024 + 10)
        r = session_a.post(
            f"{API}/games/{uploaded_game['slug']}/thumbnail",
            files={"file": ("c.png", big, "image/png")},
        )
        assert r.status_code == 400

    def test_non_owner_cannot_modify(self, session_b, uploaded_game):
        slug = uploaded_game["slug"]
        # thumbnail
        r1 = session_b.post(
            f"{API}/games/{slug}/thumbnail",
            files={"file": ("c.png", _png_bytes(), "image/png")},
        )
        assert r1.status_code == 403
        # build
        zb = _make_zip({"index.html": "<html>2</html>"})
        r2 = session_b.post(
            f"{API}/games/{slug}/build",
            data={"version": "2.0", "notes": "x"},
            files={"build": ("g.zip", zb, "application/zip")},
        )
        assert r2.status_code == 403
        # patch
        r3 = session_b.post(f"{API}/games/{slug}/patch", data={"version": "9", "notes": "n"})
        assert r3.status_code == 403

    def test_owner_update_build_creates_release(self, session_a, uploaded_game):
        slug = uploaded_game["slug"]
        before = requests.get(f"{API}/games/{slug}").json()
        before_n = len(before["releases"])
        zb = _make_zip({"index.html": "<html>v2</html>"})
        r = session_a.post(
            f"{API}/games/{slug}/build",
            data={"version": "2.0.0", "notes": "bigger"},
            files={"build": ("g.zip", zb, "application/zip")},
        )
        assert r.status_code == 200
        after = requests.get(f"{API}/games/{slug}").json()
        assert len(after["releases"]) == before_n + 1

    def test_owner_patch_creates_release(self, session_a, uploaded_game):
        slug = uploaded_game["slug"]
        before = requests.get(f"{API}/games/{slug}").json()
        n0 = len(before["releases"])
        r = session_a.post(f"{API}/games/{slug}/patch", data={"version": "2.0.1", "notes": "tiny patch"})
        assert r.status_code == 200
        after = requests.get(f"{API}/games/{slug}").json()
        assert len(after["releases"]) == n0 + 1


# ---------------- Creators ----------------
class TestCreators:
    def test_creator_profile(self, session_a, uploaded_game):
        r = requests.get(f"{API}/creators/{session_a.username}")
        assert r.status_code == 200
        body = r.json()
        # Accept either shape (creator+games or user+games)
        assert "games" in body
        slugs = [g["slug"] for g in body["games"]]
        assert uploaded_game["slug"] in slugs


# ---------------- Clips ----------------
class TestClips:
    def test_upload_and_list(self, session_a):
        r = session_a.post(
            f"{API}/clips",
            data={"caption": f"clip{secrets.token_hex(3)}", "tags": "fun"},
            files={"video": ("c.mp4", _tiny_mp4(), "video/mp4")},
        )
        assert r.status_code == 200, r.text
        slug = r.json()["clip"]["slug"]
        lst = requests.get(f"{API}/clips").json()
        assert any(c["slug"] == slug for c in lst["clips"])
        det = requests.get(f"{API}/clips/{slug}")
        assert det.status_code == 200

    def test_clip_unsupported_type(self, session_a):
        r = session_a.post(
            f"{API}/clips",
            data={"caption": "bad"},
            files={"video": ("c.txt", b"hi", "text/plain")},
        )
        assert r.status_code == 400

    def test_clip_too_large(self, session_a):
        big = b"\x00" * (80 * 1024 * 1024 + 16)
        r = session_a.post(
            f"{API}/clips",
            data={"caption": "huge"},
            files={"video": ("c.mp4", big, "video/mp4")},
        )
        assert r.status_code == 400


# ---------------- Communities ----------------
class TestCommunities:
    def test_full_community_flow(self, session_a, session_b):
        name = f"Comm {secrets.token_hex(3)}"
        r = session_a.post(f"{API}/communities", json={"name": name, "description": "d"})
        assert r.status_code == 200, r.text
        slug = r.json()["community"]["slug"]
        # detail
        r2 = requests.get(f"{API}/communities/{slug}")
        assert r2.status_code == 200
        # b joins
        rj = session_b.post(f"{API}/communities/{slug}/join")
        assert rj.status_code == 200
        # b posts
        rp = session_b.post(f"{API}/communities/{slug}/posts", data={"body": "hello world"})
        assert rp.status_code == 200, rp.text
        post_id = rp.json()["post_id"]
        # owner (a) hides
        rh = session_a.post(f"{API}/communities/{slug}/posts/{post_id}/hide")
        assert rh.status_code == 200
        # non-member post -> 403
        s_c = requests.Session()
        oc = s_c.post(f"{API}/onboarding", json={
            "username": _uname("c"), "password": "pw12345678", "pin": "1234"
        })
        if oc.status_code == 429:
            pytest.skip("rate-limited onboarding for third user")
        assert oc.status_code == 200, oc.text
        rnp = s_c.post(f"{API}/communities/{slug}/posts", data={"body": "intruder"})
        assert rnp.status_code == 403


# ---------------- Reports ----------------
class TestReports:
    def test_create_report(self, session_a):
        r = session_a.post(
            f"{API}/reports",
            data={"target_type": "game", "target_id": "gm_anything", "reason": "spam"},
        )
        assert r.status_code == 200
        assert "report_id" in r.json()

    def test_invalid_target_type(self, session_a):
        r = session_a.post(
            f"{API}/reports",
            data={"target_type": "bogus", "target_id": "x", "reason": "y"},
        )
        assert r.status_code == 400
