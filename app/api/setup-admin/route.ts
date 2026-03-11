import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY env var" },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Delete any existing admin user first
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingAdmin = existingUsers?.users?.find(
    (u) => u.email === "admin@xpress.local"
  )

  if (existingAdmin) {
    await supabase.auth.admin.deleteUser(existingAdmin.id)
  }

  // Create admin user via Admin API (proper password hashing by GoTrue)
  const { data, error } = await supabase.auth.admin.createUser({
    email: "admin@xpress.local",
    password: "Blg/101029",
    email_confirm: true,
    user_metadata: {
      name: "Admin",
      role: "admin",
      permissions: [
        "home",
        "produtos",
        "clientes",
        "seguradoras",
        "chat",
        "relatorios",
        "notificacoes",
        "atividades",
        "usuarios",
      ],
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: "Admin criado com sucesso!",
    user_id: data.user.id,
  })
}
