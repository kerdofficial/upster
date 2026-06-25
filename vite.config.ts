import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const allowedHosts = [
  "upster.upster.orb.local",
  ...(process.env.UPSTER_ALLOWED_HOSTS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean) ?? []),
]

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    allowedHosts,
  },
  preview: {
    allowedHosts,
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
