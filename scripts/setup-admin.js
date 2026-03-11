// Script to create the admin user via the API route
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000"

async function main() {
  console.log("Creating admin user via API at:", BASE_URL)

  const res = await fetch(`${BASE_URL}/api/setup-admin`, {
    method: "POST",
  })

  const data = await res.json()
  console.log("Response:", JSON.stringify(data, null, 2))
}

main().catch(console.error)
