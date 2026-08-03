import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type PehchaanBrandProps = {
  href?: string;
  compact?: boolean;
  inverse?: boolean;
  name?: ReactNode;
  subtitle?: ReactNode;
};

export function PehchaanBrand({
  href = "/",
  compact = false,
  inverse = false,
  name = "Pehchaan",
  subtitle,
}: PehchaanBrandProps) {
  return (
    <Link href={href} className={`pehchaan-brand ${inverse ? "pehchaan-brand--inverse" : ""}`} aria-label="Pehchaan home">
      <Image
        src="/pehchaan-icon.png"
        width={compact ? 34 : 42}
        height={compact ? 34 : 42}
        alt=""
        className="pehchaan-brand__mark"
        priority
      />
      <span>
        <span className="pehchaan-brand__name">
          {name}
        </span>
        {subtitle ? <span className="pehchaan-brand__subtitle">{subtitle}</span> : null}
      </span>
    </Link>
  );
}
