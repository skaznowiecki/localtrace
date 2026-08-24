export const examples = [
  {
    description: "Error logs in the last 15 minutes",
    arguments: { severity: "ERROR" as const, since_minutes: 15, limit: 20 },
  },
  {
    description: "One service, message contains timeout",
    arguments: { service: "api", message: "timeout", since_minutes: 60 },
  },
]
