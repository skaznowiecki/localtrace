import type { McpServer } from "@modelcontextprotocol/server"
import type { Db } from "@shared/db"
import { register as list } from "./list"
import { register as services } from "./resources/services"

export function register(server: McpServer, db: Db) {
  list(server, db)
  services(server, db)
}
