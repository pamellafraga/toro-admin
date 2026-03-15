import type { MetadataRoute } from "next"

/**
 * Bloqueia todo o painel para mecanismos de busca.
 * O dashboard não deve aparecer em Google, Bing etc.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  }
}
