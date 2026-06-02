"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falha silenciosa — app continua funcionando sem PWA offline
    })
  }, [])

  return null
}
