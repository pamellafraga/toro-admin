import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validar credenciais
    const validUsername = "ADMIN"
    const validPassword = "Blg/101029"

    const usernameMatch = username.toUpperCase().trim() === validUsername
    const passwordMatch = password === validPassword

    if (!usernameMatch || !passwordMatch) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      )
    }

    // Cria resposta com sucesso e seta o cookie
    const response = NextResponse.json(
      { success: true, user: username },
      { status: 200 }
    )

    // Seta o cookie de autenticação
    response.cookies.set({
      name: 'xpress_auth',
      value: JSON.stringify({ user: username, authenticated: true }),
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao autenticar" },
      { status: 500 }
    )
  }
}
