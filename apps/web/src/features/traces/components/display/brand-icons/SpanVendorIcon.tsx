import type { SpanVendor } from "../../../lib/span-vendor"
import { PostgresIcon } from "./PostgresIcon"
import { PrismaIcon } from "./PrismaIcon"
import { S3Icon } from "./S3Icon"

type SpanVendorIconProps = {
  vendor: SpanVendor
  className?: string
}

const VENDOR_LABEL: Record<SpanVendor, string> = {
  s3: "Amazon S3",
  postgres: "PostgreSQL",
  prisma: "Prisma",
}

/** Brand mark for a resolved span vendor (Overview header). */
export function SpanVendorIcon({ vendor, className }: SpanVendorIconProps) {
  switch (vendor) {
    case "s3":
      return <S3Icon className={className} title={VENDOR_LABEL.s3} />
    case "postgres":
      return <PostgresIcon className={className} title={VENDOR_LABEL.postgres} />
    case "prisma":
      return <PrismaIcon className={className} title={VENDOR_LABEL.prisma} />
  }
}
