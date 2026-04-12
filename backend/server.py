from __future__ import annotations

import base64
import hashlib
import html
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error as urlerror
from urllib import request as urlrequest
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent


def load_env_file():
    env_path = ROOT.parent / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()

DATA_ROOT = Path(os.environ.get("APPLYMATE_DATA_DIR", str(ROOT)))
DB_PATH = Path(
    os.environ.get("APPLYMATE_DB_PATH", str(DATA_ROOT / "data" / "applymate.db"))
)
UPLOAD_ROOT = Path(
    os.environ.get("APPLYMATE_UPLOAD_DIR", str(DATA_ROOT / "uploads"))
)
HOST = os.environ.get("APPLYMATE_HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT") or os.environ.get("APPLYMATE_PORT", "8002"))
SECRET = os.environ.get("APPLYMATE_SECRET", "applymate-local-dev-secret")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_TIMEOUT = int(os.environ.get("GEMINI_TIMEOUT", "60"))
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get("APPLYMATE_ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
}

DB_PATH.parent.mkdir(parents=True, exist_ok=True)
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

TABLE_COLUMNS = {
    "profiles": {"id", "user_id", "display_name", "avatar_url", "bio", "skills", "education", "experience", "achievements", "interests", "gpa", "major", "education_level", "cv_raw_text", "activity_streak", "monthly_goal", "quick_notes", "last_active_at", "created_at", "updated_at"},
    "user_roles": {"id", "user_id", "role"},
    "scholarships": {"id", "user_id", "name", "organization", "amount", "deadline", "link", "status", "eligibility_notes", "tags", "notes", "share_token", "is_shared", "created_at", "updated_at", "position", "is_favorited", "application_type"},
    "shared_scholarships": {"id", "scholarship_id", "shared_by", "shared_with", "created_at"},
    "scholarship_files": {"id", "scholarship_id", "user_id", "file_name", "file_path", "file_size", "mime_type", "created_at"},
    "community_posts": {"id", "user_id", "user_email", "content", "scholarship_id", "created_at", "updated_at"},
    "community_replies": {"id", "post_id", "user_id", "user_email", "content", "created_at"},
    "application_checklist": {"id", "scholarship_id", "user_id", "label", "is_done", "position", "created_at"},
    "ai_results_cache": {"id", "user_id", "scholarship_id", "result_type", "result_data", "created_at", "updated_at"},
}
JSON_COLUMNS = {
    "profiles": {"skills", "education", "experience", "achievements", "interests"},
    "scholarships": {"tags"},
    "ai_results_cache": {"result_data"},
}
BOOL_COLUMNS = {
    "scholarships": {"is_shared", "is_favorited"},
    "application_checklist": {"is_done"},
}
OWNER_FIELD = {
    "profiles": "user_id",
    "scholarships": "user_id",
    "scholarship_files": "user_id",
    "application_checklist": "user_id",
    "ai_results_cache": "user_id",
    "community_posts": "user_id",
    "community_replies": "user_id",
}


def now():
    return datetime.now(timezone.utc).isoformat()


def conn():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    return db


def json_cell(table, col, value):
    if col in JSON_COLUMNS.get(table, set()):
        default = {} if col == "result_data" else []
        return json.dumps(default if value is None else value)
    if col in BOOL_COLUMNS.get(table, set()):
        return 1 if value else 0
    return value


def decode_row(table, row):
    if row is None:
        return None
    data = dict(row)
    for col in JSON_COLUMNS.get(table, set()):
        raw = data.get(col)
        data[col] = json.loads(raw) if raw else ({} if col == "result_data" else [])
    for col in BOOL_COLUMNS.get(table, set()):
        data[col] = bool(data.get(col))
    return data


def decode_rows(table, rows):
    return [decode_row(table, row) for row in rows]


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    raw = hashlib.scrypt(password.encode(), salt=salt.encode(), n=2**14, r=8, p=1)
    return f"{salt}${base64.urlsafe_b64encode(raw).decode()}"


def verify_password(password, stored):
    salt, expected = stored.split("$", 1)
    actual = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(actual, expected)


def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def b64d(data):
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def token_for(user):
    payload = json.dumps({"sub": user["id"], "email": user["email"], "exp": int(time.time()) + 604800}, separators=(",", ":")).encode()
    sig = hmac.new(SECRET.encode(), payload, hashlib.sha256).digest()
    return f"{b64(payload)}.{b64(sig)}"


def parse_token(token):
    if not token or "." not in token:
        return None
    payload_part, sig_part = token.split(".", 1)
    payload = b64d(payload_part)
    sig = hmac.new(SECRET.encode(), payload, hashlib.sha256).digest()
    if not hmac.compare_digest(sig, b64d(sig_part)):
        return None
    data = json.loads(payload.decode())
    if data.get("exp", 0) < int(time.time()):
        return None
    return data


def get_user_by_email(email):
    db = conn()
    try:
        return db.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
    finally:
        db.close()


def get_user_by_id(user_id):
    db = conn()
    try:
        return db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    finally:
        db.close()


def has_role(user_id, role):
    db = conn()
    try:
        return db.execute("SELECT 1 FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1", (user_id, role)).fetchone() is not None
    finally:
        db.close()


def ensure_schema():
    db = conn()
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL, display_name TEXT, avatar_url TEXT, bio TEXT, skills TEXT DEFAULT '[]', education TEXT DEFAULT '[]', experience TEXT DEFAULT '[]', achievements TEXT DEFAULT '[]', interests TEXT DEFAULT '[]', gpa TEXT, major TEXT, education_level TEXT, cv_raw_text TEXT, activity_streak INTEGER DEFAULT 0, monthly_goal INTEGER DEFAULT 5, quick_notes TEXT DEFAULT '', last_active_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS user_roles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, UNIQUE(user_id, role), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS scholarships (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, organization TEXT, amount REAL, deadline TEXT, link TEXT, status TEXT NOT NULL DEFAULT 'saved', eligibility_notes TEXT, tags TEXT DEFAULT '[]', notes TEXT, share_token TEXT UNIQUE, is_shared INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, position INTEGER DEFAULT 0, is_favorited INTEGER DEFAULT 0, application_type TEXT NOT NULL DEFAULT 'scholarship', FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS shared_scholarships (id TEXT PRIMARY KEY, scholarship_id TEXT NOT NULL, shared_by TEXT NOT NULL, shared_with TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS scholarship_files (id TEXT PRIMARY KEY, scholarship_id TEXT NOT NULL, user_id TEXT NOT NULL, file_name TEXT NOT NULL, file_path TEXT NOT NULL, file_size INTEGER, mime_type TEXT, created_at TEXT NOT NULL, FOREIGN KEY(scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS community_posts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_email TEXT NOT NULL, content TEXT NOT NULL, scholarship_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(scholarship_id) REFERENCES scholarships(id) ON DELETE SET NULL);
        CREATE TABLE IF NOT EXISTS community_replies (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL, user_email TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(post_id) REFERENCES community_posts(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS application_checklist (id TEXT PRIMARY KEY, scholarship_id TEXT NOT NULL, user_id TEXT NOT NULL, label TEXT NOT NULL, is_done INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, FOREIGN KEY(scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS ai_results_cache (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, scholarship_id TEXT, result_type TEXT NOT NULL, result_data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(user_id, scholarship_id, result_type));
        """
    )
    db.commit()
    db.close()


def create_user(email, password):
    user = {"id": str(uuid.uuid4()), "email": email.lower().strip()}
    timestamp = now()
    db = conn()
    try:
        first_user = db.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"] == 0
        db.execute("INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", (user["id"], user["email"], hash_password(password), timestamp, timestamp))
        db.execute("INSERT INTO profiles (id, user_id, display_name, skills, education, experience, achievements, interests, activity_streak, monthly_goal, quick_notes, created_at, updated_at) VALUES (?, ?, ?, '[]', '[]', '[]', '[]', '[]', 0, 5, '', ?, ?)", (str(uuid.uuid4()), user["id"], user["email"].split("@", 1)[0], timestamp, timestamp))
        db.execute("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)", (str(uuid.uuid4()), user["id"], "admin" if first_user else "user"))
        db.commit()
    finally:
        db.close()
    return user


def sanitize_columns(table, raw):
    allowed = TABLE_COLUMNS[table]
    if not raw or raw.strip() == "*":
        return ["*"]
    cols = [part.strip() for part in raw.split(",") if part.strip() in allowed]
    return cols or ["*"]


def where_sql(filters, params):
    clauses = []
    for item in filters or []:
        col = item.get("column")
        op = item.get("op", "eq")
        value = item.get("value")
        if not col:
            continue
        if op == "eq":
            clauses.append(f"{col} = ?")
            params.append(value)
        elif op == "in":
            values = value if isinstance(value, list) else []
            if not values:
                clauses.append("1 = 0")
            else:
                clauses.append(f"{col} IN ({', '.join('?' for _ in values)})")
                params.extend(values)
        elif op == "is":
            clauses.append(f"{col} IS NULL" if value is None else f"{col} IS ?")
            if value is not None:
                params.append(value)
    return (" WHERE " + " AND ".join(clauses)) if clauses else ""


def check_access(table, operation, user, values, filters):
    if table not in TABLE_COLUMNS:
        raise ValueError("Unknown table")
    if table in {"community_posts", "community_replies"} and operation == "select":
        if not user:
            raise PermissionError("Unauthorized")
        return
    if table == "user_roles":
        if not user:
            raise PermissionError("Unauthorized")
        if operation != "select" and not has_role(user["id"], "admin"):
            raise PermissionError("Admin access required")
        return
    if not user:
        raise PermissionError("Unauthorized")


def run_query(payload, user):
    table = payload.get("table")
    operation = payload.get("operation", "select")
    filters = payload.get("filters") or []
    values = payload.get("values")
    check_access(table, operation, user, values, filters)
    db = conn()
    try:
        if operation == "select":
            params = []
            sql = f"SELECT {', '.join(sanitize_columns(table, payload.get('select')))} FROM {table}"
            sql += where_sql(filters, params)
            order = []
            for item in payload.get("order") or []:
                col = item.get("column")
                if col in TABLE_COLUMNS[table]:
                    order.append(f"{col} {'ASC' if item.get('ascending', True) else 'DESC'}")
            if order:
                sql += " ORDER BY " + ", ".join(order)
            if isinstance(payload.get("limit"), int):
                sql += " LIMIT ?"
                params.append(payload["limit"])
            rows = decode_rows(table, db.execute(sql, params).fetchall())
            if payload.get("single"):
                if not rows:
                    raise LookupError("No row found")
                return rows[0]
            if payload.get("maybeSingle"):
                return rows[0] if rows else None
            return rows
        if operation == "insert":
            rows = values if isinstance(values, list) else [values]
            inserted = []
            for row in rows:
                data = dict(row)
                data.setdefault("id", str(uuid.uuid4()))
                if table == "scholarships":
                    data.setdefault("share_token", str(uuid.uuid4()))
                    data.setdefault("is_shared", False)
                    data.setdefault("is_favorited", False)
                    data.setdefault("status", "saved")
                    data.setdefault("application_type", "scholarship")
                    data.setdefault("position", 0)
                stamp = now()
                if "created_at" in TABLE_COLUMNS[table]:
                    data.setdefault("created_at", stamp)
                if "updated_at" in TABLE_COLUMNS[table]:
                    data.setdefault("updated_at", stamp)
                cols = [col for col in data if col in TABLE_COLUMNS[table]]
                params = [json_cell(table, col, data[col]) for col in cols]
                db.execute(f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)})", params)
                inserted.append(decode_row(table, db.execute(f"SELECT * FROM {table} WHERE id = ?", (data["id"],)).fetchone()))
            db.commit()
            return inserted
        if operation == "update":
            if not isinstance(values, dict) or not values:
                return []
            params = []
            data = dict(values)
            if "updated_at" in TABLE_COLUMNS[table]:
                data["updated_at"] = now()
            sets = []
            for col, value in data.items():
                if col in TABLE_COLUMNS[table]:
                    sets.append(f"{col} = ?")
                    params.append(json_cell(table, col, value))
            sql = f"UPDATE {table} SET {', '.join(sets)}"
            sql += where_sql(filters, params)
            db.execute(sql, params)
            db.commit()
            return []
        if operation == "delete":
            params = []
            sql = f"DELETE FROM {table}" + where_sql(filters, params)
            db.execute(sql, params)
            db.commit()
            return []
        if operation == "upsert":
            data = dict(values or {})
            data.setdefault("id", str(uuid.uuid4()))
            stamp = now()
            if "created_at" in TABLE_COLUMNS[table]:
                data.setdefault("created_at", stamp)
            if "updated_at" in TABLE_COLUMNS[table]:
                data["updated_at"] = stamp
            cols = [col for col in data if col in TABLE_COLUMNS[table]]
            conflict = [col.strip() for col in (payload.get("onConflict") or "").split(",") if col.strip() in TABLE_COLUMNS[table]]
            if not conflict:
                raise ValueError("Upsert requires onConflict")
            update_cols = [col for col in cols if col not in conflict and col != "created_at"]
            sql = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' for _ in cols)}) ON CONFLICT ({', '.join(conflict)}) DO UPDATE SET " + ", ".join(f"{col} = excluded.{col}" for col in update_cols)
            db.execute(sql, [json_cell(table, col, data[col]) for col in cols])
            db.commit()
            where = " AND ".join(f"{col} = ?" for col in conflict)
            return decode_row(table, db.execute(f"SELECT * FROM {table} WHERE {where}", [data[col] for col in conflict]).fetchone())
        raise ValueError("Unsupported operation")
    finally:
        db.close()


def run_rpc(name, body, user):
    db = conn()
    try:
        if name == "has_role":
            target = body.get("_user_id")
            role = body.get("_role")
            if not target or not role:
                return False
            if user and (user["id"] == target or has_role(user["id"], "admin")):
                return has_role(target, role)
            return False
        if name == "get_recent_public_posts":
            rows = db.execute(
                """
                SELECT community_posts.id, community_posts.content, community_posts.created_at,
                       COALESCE(NULLIF(profiles.display_name, ''), substr(community_posts.user_email, 1, instr(community_posts.user_email, '@') - 1)) AS display_name
                FROM community_posts
                LEFT JOIN profiles ON profiles.user_id = community_posts.user_id
                ORDER BY community_posts.created_at DESC
                LIMIT 6
                """
            ).fetchall()
            return [dict(row) for row in rows]
        if name == "get_shared_scholarship":
            token = body.get("_token")
            if not token:
                return []
            row = db.execute(
                "SELECT id, amount, created_at, deadline, eligibility_notes, is_shared, link, name, notes, organization, status, tags, updated_at FROM scholarships WHERE share_token = ? AND is_shared = 1 LIMIT 1",
                (token,),
            ).fetchone()
            return [decode_row("scholarships", row)] if row else []
        raise ValueError("Unknown RPC")
    finally:
        db.close()


def require_gemini():
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured for the local backend")


def gemini_chat(messages, json_mode=False, temperature=0.4):
    require_gemini()
    system_parts = []
    contents = []
    for message in messages:
        role = message.get("role")
        content = str(message.get("content") or "").strip()
        if not content:
            continue
        if role == "system":
            system_parts.append({"text": content})
            continue
        mapped_role = "model" if role == "assistant" else "user"
        contents.append({"role": mapped_role, "parts": [{"text": content}]})

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
        },
    }
    if system_parts:
        payload["systemInstruction"] = {"parts": system_parts}
    if json_mode:
        payload["generationConfig"]["responseMimeType"] = "application/json"

    req = urlrequest.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
        },
        method="POST",
    )
    try:
        with urlrequest.urlopen(req, timeout=GEMINI_TIMEOUT) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urlerror.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(detail)
            message = parsed.get("error", {}).get("message") or detail
        except Exception:
            message = detail or str(exc)
        raise ValueError(f"Gemini request failed: {message}") from exc
    except urlerror.URLError as exc:
        raise ValueError(f"Gemini request failed: {exc.reason}") from exc

    parts = (
        raw.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    content = "".join(part.get("text", "") for part in parts).strip()
    if not content:
        raise ValueError("Gemini returned an empty response")
    if json_mode:
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise ValueError("Gemini returned invalid JSON") from exc
    return content.strip()


def clamp_score(value):
    try:
        return max(0, min(100, int(round(float(value)))))
    except Exception:
        return 50


def clean_list(value, limit=6):
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()][:limit]


def clean_text(text, limit=4000):
    value = re.sub(r"\s+", " ", str(text or "")).strip()
    return value[:limit]


def fetch_url_text(url):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http/https URLs are supported")
    req = urlrequest.Request(
        url,
        headers={
            "User-Agent": "ApplyMateLocalBackend/1.0 (+https://applymate.local)"
        },
    )
    try:
        with urlrequest.urlopen(req, timeout=20) as response:
            raw = response.read(250000)
    except urlerror.URLError as exc:
        raise ValueError(f"Could not fetch URL: {exc.reason}") from exc

    text = raw.decode("utf-8", errors="ignore")
    text = re.sub(r"(?is)<script.*?>.*?</script>", " ", text)
    text = re.sub(r"(?is)<style.*?>.*?</style>", " ", text)
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        raise ValueError("No readable content found at that URL")
    return text[:12000]


def profile_is_complete(profile):
    return bool(
        (profile.get("education_level") or "").strip()
        or (profile.get("major") or "").strip()
        or (profile.get("bio") or "").strip()
        or (profile.get("skills") or [])
    )


def function_ai_advisor(body):
    mode = body.get("mode") or "dashboard"
    if mode == "dashboard":
        applications = body.get("applications") or []
        advice = gemini_chat(
            [
                {
                    "role": "system",
                    "content": "You are an application strategy advisor. Give concise, practical guidance in one short paragraph.",
                },
                {
                    "role": "user",
                    "content": f"Analyze these applications and give the best next-step advice:\n{json.dumps(applications)[:9000]}",
                },
            ],
            temperature=0.5,
        )
        return {"advice": advice}

    if mode == "checklist":
        scholarship_context = body.get("scholarshipContext") or {}
        result = gemini_chat(
            [
                {
                    "role": "system",
                    "content": "Generate a practical application checklist. Return JSON with a tasks array of objects with a label field.",
                },
                {
                    "role": "user",
                    "content": json.dumps({"scholarship": scholarship_context}),
                },
            ],
            json_mode=True,
            temperature=0.4,
        )
        tasks = result.get("tasks") or []
        return {
            "tasks": [
                {"label": clean_text(item.get("label"), 120)}
                for item in tasks
                if clean_text(item.get("label"), 120)
            ][:8]
        }

    if mode == "prioritize":
        applications = body.get("applications") or []
        result = gemini_chat(
            [
                {
                    "role": "system",
                    "content": "Pick the single application the user should focus on next. Return JSON with id, name, and reason.",
                },
                {
                    "role": "user",
                    "content": json.dumps({"applications": applications}),
                },
            ],
            json_mode=True,
            temperature=0.3,
        )
        return {
            "focus": {
                "id": str(result.get("id") or ""),
                "name": clean_text(result.get("name") or "", 120),
                "reason": clean_text(result.get("reason") or "", 240),
            }
        }

    if mode == "summarize":
        scholarship_context = body.get("scholarshipContext") or {}
        summary = gemini_chat(
            [
                {
                    "role": "system",
                    "content": "Summarize application notes into a crisp, helpful paragraph with the most important points only.",
                },
                {
                    "role": "user",
                    "content": json.dumps({"application": scholarship_context}),
                },
            ],
            temperature=0.3,
        )
        return {"summary": summary}

    raise ValueError("Unsupported ai-advisor mode")


def function_pipeline_insights(body):
    result = gemini_chat(
        [
            {
                "role": "system",
                "content": "Analyze an applications pipeline. Return JSON with summary, highlights, warnings, and tips.",
            },
            {"role": "user", "content": json.dumps(body)},
        ],
        json_mode=True,
        temperature=0.4,
    )
    return {
        "insights": {
            "summary": clean_text(result.get("summary") or "", 320),
            "highlights": clean_list(result.get("highlights"), 5),
            "warnings": clean_list(result.get("warnings"), 5),
            "tips": clean_list(result.get("tips"), 5),
        }
    }


def function_essay_assistant(body):
    scholarship_context = body.get("scholarshipContext") or {}
    user_prompt = body.get("userPrompt") or ""
    conversation_history = body.get("conversationHistory") or []
    messages = [
        {
            "role": "system",
            "content": (
                "You are a scholarship and application writing assistant. "
                "Help draft, revise, and improve essays. Be specific and useful."
            ),
        },
        {
            "role": "user",
            "content": f"Application context: {json.dumps(scholarship_context)[:4000]}",
        },
    ]
    for item in conversation_history[-6:]:
        role = item.get("role")
        if role in {"user", "assistant"} and item.get("content"):
            messages.append({"role": role, "content": str(item["content"])[:4000]})
    messages.append({"role": "user", "content": str(user_prompt)[:4000]})
    return {"reply": gemini_chat(messages, temperature=0.7)}


def function_parse_cv(body):
    cv_text = clean_text(body.get("cvText") or "", 12000)
    if not cv_text:
        raise ValueError("cvText is required")
    result = gemini_chat(
        [
            {
                "role": "system",
                "content": (
                    "Extract structured profile data from a resume/CV. "
                    "Return JSON with display_name, bio, education_level, major, gpa, "
                    "skills, achievements, interests, education, and experience."
                ),
            },
            {"role": "user", "content": cv_text},
        ],
        json_mode=True,
        temperature=0.2,
    )
    return {
        "parsed": {
            "display_name": clean_text(result.get("display_name") or "", 120),
            "bio": clean_text(result.get("bio") or "", 500),
            "education_level": clean_text(result.get("education_level") or "", 60),
            "major": clean_text(result.get("major") or "", 120),
            "gpa": clean_text(result.get("gpa") or "", 40),
            "skills": clean_list(result.get("skills"), 20),
            "achievements": clean_list(result.get("achievements"), 12),
            "interests": clean_list(result.get("interests"), 12),
            "education": result.get("education") if isinstance(result.get("education"), list) else [],
            "experience": result.get("experience") if isinstance(result.get("experience"), list) else [],
        }
    }


def function_parse_scholarship(body):
    text = body.get("text")
    url = body.get("url")
    source_text = clean_text(text or "", 12000)
    source_url = None
    if url:
        source_url = str(url).strip()
        source_text = fetch_url_text(source_url)
    if not source_text:
        raise ValueError("Either text or url is required")

    result = gemini_chat(
        [
            {
                "role": "system",
                "content": (
                    "Extract scholarship or job listing details. Return JSON with: "
                    "name, organization, amount, deadline, link, eligibility_notes, tags, description."
                ),
            },
            {
                "role": "user",
                "content": json.dumps({"url": source_url, "content": source_text}),
            },
        ],
        json_mode=True,
        temperature=0.2,
    )
    parsed = {
        "name": clean_text(result.get("name") or "", 160),
        "organization": clean_text(result.get("organization") or "", 160),
        "amount": result.get("amount"),
        "deadline": clean_text(result.get("deadline") or "", 80),
        "link": clean_text(result.get("link") or source_url or "", 300),
        "eligibility_notes": clean_text(
            result.get("eligibility_notes") or result.get("eligibility") or "", 1200
        ),
        "tags": clean_list(result.get("tags"), 10),
        "description": clean_text(result.get("description") or "", 1500),
    }
    return {"success": True, "data": parsed, **parsed}


def function_ai_recommender(body):
    recommendations = gemini_chat(
        [
            {
                "role": "system",
                "content": "Suggest promising scholarship directions based on the user's profile. Be practical and concise. Use short paragraphs or bullets in plain text.",
            },
            {"role": "user", "content": json.dumps(body)},
        ],
        temperature=0.6,
    )
    return {"recommendations": recommendations}


def function_success_meter(body, user):
    scholarship_id = body.get("scholarshipId")
    if not scholarship_id:
        raise ValueError("scholarshipId is required")
    db = conn()
    try:
        scholarship = db.execute(
            "SELECT * FROM scholarships WHERE id = ? LIMIT 1", (scholarship_id,)
        ).fetchone()
        profile = db.execute(
            "SELECT * FROM profiles WHERE user_id = ? LIMIT 1", (user["id"],)
        ).fetchone()
    finally:
        db.close()

    if not scholarship:
        raise LookupError("Scholarship not found")
    scholarship = decode_row("scholarships", scholarship)
    profile = decode_row("profiles", profile) if profile else {}
    if not profile_is_complete(profile):
        return {"error": "incomplete_profile"}

    result = gemini_chat(
        [
            {
                "role": "system",
                "content": (
                    "Estimate the user's fit for an application. Return JSON with "
                    "score (0-100), confidence (low|medium|high), summary, strengths, gaps, and tips."
                ),
            },
            {
                "role": "user",
                "content": json.dumps({"profile": profile, "scholarship": scholarship})[:12000],
            },
        ],
        json_mode=True,
        temperature=0.3,
    )
    return {
        "analysis": {
            "score": clamp_score(result.get("score")),
            "confidence": result.get("confidence")
            if result.get("confidence") in {"low", "medium", "high"}
            else "medium",
            "summary": clean_text(result.get("summary") or "", 280),
            "strengths": clean_list(result.get("strengths"), 5),
            "gaps": clean_list(result.get("gaps"), 5),
            "tips": clean_list(result.get("tips"), 5),
        }
    }


def function_ai_community_assist(body):
    suggestion = gemini_chat(
        [
            {
                "role": "system",
                "content": "Write a thoughtful, friendly community reply suggestion in 1 short paragraph.",
            },
            {"role": "user", "content": json.dumps(body)},
        ],
        temperature=0.7,
    )
    return {"suggestion": suggestion}


def run_function(name, body, user):
    if name == "ai-advisor":
        return function_ai_advisor(body)
    if name == "pipeline-insights":
        return function_pipeline_insights(body)
    if name == "essay-assistant":
        return function_essay_assistant(body)
    if name == "parse-cv":
        return function_parse_cv(body)
    if name == "parse-scholarship":
        return function_parse_scholarship(body)
    if name == "ai-recommender":
        return function_ai_recommender(body)
    if name == "success-meter":
        return function_success_meter(body, user)
    if name == "ai-community-assist":
        return function_ai_community_assist(body)
    raise ValueError(f"Unknown function: {name}")


def parse_multipart(content_type, raw):
    if "boundary=" not in content_type:
        raise ValueError("Missing multipart boundary")
    boundary = content_type.split("boundary=", 1)[1].strip().strip('"')
    marker = ("--" + boundary).encode()
    for part in raw.split(marker):
        if b'name="file"' not in part:
            continue
        if b"\r\n\r\n" not in part:
            continue
        head, body = part.split(b"\r\n\r\n", 1)
        body = body.rstrip(b"\r\n-")
        headers = head.decode("utf-8", errors="ignore").split("\r\n")
        filename = None
        mime_type = None
        for header in headers:
            lower = header.lower()
            if "content-disposition:" in lower and "filename=" in lower:
                filename = header.split("filename=", 1)[1].strip().strip('"')
            if lower.startswith("content-type:"):
                mime_type = header.split(":", 1)[1].strip()
        return {"filename": filename, "mime_type": mime_type, "content": body}
    raise ValueError("Missing file")


class Handler(BaseHTTPRequestHandler):
    def cors_origin(self):
        origin = self.headers.get("Origin")
        if "*" in ALLOWED_ORIGINS:
            return "*"
        if origin and origin in ALLOWED_ORIGINS:
            return origin
        return "null"

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", self.cors_origin())
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "authorization, content-type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        self.route()

    def do_POST(self):
        self.route()

    def do_PATCH(self):
        self.route()

    def do_DELETE(self):
        self.route()

    def route(self):
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            if path == "/api/health":
                return self.reply({"ok": True, "backend": "python-sqlite"})
            if path == "/api/auth/signup" and self.command == "POST":
                return self.signup()
            if path == "/api/auth/login" and self.command == "POST":
                return self.login()
            if path == "/api/auth/session" and self.command == "GET":
                return self.session()
            if path == "/api/auth/password" and self.command == "PATCH":
                return self.update_password()
            if path == "/api/query" and self.command == "POST":
                return self.reply({"data": run_query(self.read_json(), self.user(False)), "error": None})
            if path.startswith("/api/rpc/") and self.command == "POST":
                return self.reply({"data": run_rpc(path.split("/api/rpc/", 1)[1], self.read_json(), self.user(False)), "error": None})
            if path.startswith("/api/functions/") and self.command == "POST":
                user = self.user(True)
                name = path.split("/api/functions/", 1)[1]
                return self.reply({"data": run_function(name, self.read_json(), user), "error": None})
            if path == "/api/storage/upload" and self.command == "POST":
                return self.upload(parsed)
            return self.reply({"error": "Not found"}, 404)
        except PermissionError as exc:
            return self.reply({"error": str(exc)}, 403)
        except LookupError as exc:
            return self.reply({"error": str(exc)}, 404)
        except sqlite3.IntegrityError as exc:
            return self.reply({"error": str(exc)}, 400)
        except ValueError as exc:
            return self.reply({"error": str(exc)}, 400)
        except Exception as exc:
            return self.reply({"error": str(exc)}, 500)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def reply(self, payload, status=200):
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def user(self, required=True):
        header = self.headers.get("Authorization", "")
        token = header.replace("Bearer ", "", 1) if header.startswith("Bearer ") else None
        session = parse_token(token)
        if not session:
            if required:
                raise PermissionError("Unauthorized")
            return None
        user = get_user_by_id(session["sub"])
        if not user:
            if required:
                raise PermissionError("Unauthorized")
            return None
        return {"id": user["id"], "email": user["email"]}

    def signup(self):
        body = self.read_json()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        if not email or "@" not in email:
            raise ValueError("Valid email is required")
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")
        if get_user_by_email(email):
            raise ValueError("User already registered")
        user = create_user(email, password)
        token = token_for(user)
        self.reply({"data": {"session": {"access_token": token, "user": user}, "user": user}, "error": None})

    def login(self):
        body = self.read_json()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""
        record = get_user_by_email(email)
        if not record or not verify_password(password, record["password_hash"]):
            return self.reply({"data": None, "error": {"message": "Invalid login credentials"}}, 401)
        user = {"id": record["id"], "email": record["email"]}
        token = token_for(user)
        self.reply({"data": {"session": {"access_token": token, "user": user}, "user": user}, "error": None})

    def session(self):
        user = self.user(False)
        if not user:
            return self.reply({"data": {"session": None}, "error": None})
        token = self.headers.get("Authorization", "").replace("Bearer ", "", 1)
        self.reply({"data": {"session": {"access_token": token, "user": user}}, "error": None})

    def update_password(self):
        user = self.user(True)
        body = self.read_json()
        password = body.get("password") or ""
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")
        db = conn()
        try:
            db.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (hash_password(password), now(), user["id"]))
            db.commit()
        finally:
            db.close()
        self.reply({"data": {"user": user}, "error": None})

    def upload(self, parsed):
        user = self.user(True)
        params = parse_qs(parsed.query)
        bucket = (params.get("bucket") or ["files"])[0]
        path = (params.get("path") or [str(uuid.uuid4())])[0]
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            raise ValueError("Expected multipart/form-data")
        length = int(self.headers.get("Content-Length", "0"))
        part = parse_multipart(content_type, self.rfile.read(length))
        target = UPLOAD_ROOT / bucket / path
        target.parent.mkdir(parents=True, exist_ok=True)
        raw = part["content"]
        target.write_bytes(raw)
        self.reply({"data": {"path": f"{bucket}/{path}", "size": len(raw), "uploaded_by": user["id"], "mime_type": part["mime_type"], "file_name": part["filename"]}, "error": None})


def main():
    ensure_schema()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"ApplyMate backend running on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
