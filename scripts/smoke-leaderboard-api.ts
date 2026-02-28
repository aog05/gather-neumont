const baseUrl = process.env.LEADERBOARD_API_BASE_URL ?? "http://localhost:3000";
const endpoint = `${baseUrl.replace(/\/$/, "")}/api/leaderboard?limit=10`;

async function main(): Promise<void> {
  console.log(`[smoke] GET ${endpoint}`);
  const response = await fetch(endpoint);
  const bodyText = await response.text();

  console.log(`[smoke] status=${response.status}`);
  try {
    const json = JSON.parse(bodyText);
    console.log(JSON.stringify(json, null, 2));
  } catch {
    console.log(bodyText);
  }

  if (!response.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[smoke] Failed:", error);
  process.exit(1);
});
