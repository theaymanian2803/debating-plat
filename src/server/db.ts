import { createClient, type Client } from "@libsql/client/web";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getStashedCloudflareEnv, resolveTursoCredentials } from "./env";
import { migrate } from "./schema";

let clientPromise: Promise<Client> | undefined;

export function getDb(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const cloudflare = getStashedCloudflareEnv();
      const { url, token } = resolveTursoCredentials({
        ...(cloudflare ? { cloudflare } : {}),
        processEnv: process.env,
        readFile: (p) => {
          try {
            return readFileSync(join(process.cwd(), p), "utf8");
          } catch {
            return undefined;
          }
        },
      });
      const client = createClient({ url, authToken: token });
      await migrate(client);
      return client;
    })();
  }
  return clientPromise;
}
