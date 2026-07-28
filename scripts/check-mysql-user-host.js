const fs = require("fs")
const mysql = require("mysql2/promise")

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim()
  if (!t || t.startsWith("#")) continue
  const i = t.indexOf("=")
  if (i > -1 && !process.env[t.slice(0, i).trim()]) {
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
}

;(async () => {
  const c = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  })
  try {
    const [rows] = await c.query("SELECT user, host FROM mysql.user WHERE user = ?", [
      process.env.DATABASE_USER,
    ])
    console.log("Usuários MySQL:", rows)
  } catch (e) {
    console.log("Sem permissão para mysql.user:", e.message)
  }
  await c.end()
})()
