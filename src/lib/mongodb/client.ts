import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI?.trim();

export function isMongoConfigured(): boolean {
  return Boolean(uri);
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  return global._mongoClientPromise;
}

/** Default database name comes from the URI path (e.g. .../smart). */
export async function getMongoDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}
