import {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

function resolveCredentialPath(envPath: string): string {
  const t = envPath.trim();
  return isAbsolute(t) ? t : resolve(process.cwd(), t);
}

/** True only if the env var is set and points at an existing file (avoids “configured” when the key is missing). */
function credentialFileExists(envPath: string | undefined): boolean {
  if (!envPath?.trim()) return false;
  try {
    return existsSync(resolveCredentialPath(envPath));
  } catch {
    return false;
  }
}

/** Same shape as `admin.credential.cert(serviceAccount)` with a downloaded JSON file. */
function certFromServiceAccountJson(parsed: {
  project_id: string;
  client_email: string;
  private_key: string;
}) {
  return cert({
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  });
}

function initAdminApp(): App {
  if (getApps().length) {
    return getApp();
  }

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    const cred = JSON.parse(rawJson) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return initializeApp({
      credential: certFromServiceAccountJson(cred),
    });
  }

  /** Like `require("./serviceAccountKey.json")` + `cert(serviceAccount)` — path relative to cwd or absolute. */
  const jsonPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (jsonPath) {
    const filePath = resolveCredentialPath(jsonPath);
    const cred = JSON.parse(
      readFileSync(filePath, "utf8"),
    ) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return initializeApp({
      credential: certFromServiceAccountJson(cred),
    });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")?.trim();

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  /** Standard local / server pattern: path to downloaded service account JSON. */
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return initializeApp({
      credential: applicationDefault(),
    });
  }

  throw new Error("Firebase Admin is not configured.");
}

export function isFirebaseAdminConfigured(): boolean {
  try {
    const hasJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
    const hasPath = credentialFileExists(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    );
    const hasParts = Boolean(
      process.env.FIREBASE_PROJECT_ID?.trim() &&
        process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
        process.env.FIREBASE_PRIVATE_KEY?.trim(),
    );
    const hasAdcFile = credentialFileExists(
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
    );
    return hasJson || hasPath || hasParts || hasAdcFile;
  } catch {
    return false;
  }
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(initAdminApp());
}
