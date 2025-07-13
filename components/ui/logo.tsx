import Link from "next/link";
import Image from "next/image";
import logo from "@/public/images/logo.svg";

type LogoProps = {
  className?: string;
};

export default function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={`inline-flex shrink-0 ${className || ""}`} aria-label="Cruip">
      <Image src={logo} alt="Cruip Logo" width={60} height={60} />
    </Link>
  );
}
