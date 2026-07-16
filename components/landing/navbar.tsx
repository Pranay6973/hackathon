import Link from "next/link";
import {SignedIn, SignedOut} from "@clerk/nextjs";
import {Button} from "../ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
        >
          <img src="/logo.svg" alt="" className="size-7" />
            Lovable Clone
        </Link>
        <div className="flex items-center gap-3">
  <SignedOut>
    <Button
      variant="outline"
      size="sm"
      className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:brightness-100"
      asChild
    >
      <Link href="/sign-in">Log in</Link>
    </Button>

    <Button
      size="sm"
      className="bg-white text-black hover:bg-white/90"
      asChild
    >
      <Link href="/sign-up">Get started</Link>
    </Button>
  </SignedOut>

  <SignedIn>
    <Button
      size="sm"
      className="bg-white text-black hover:bg-white/90"
      asChild
    >
      <Link href="/dashboard">Dashboard</Link>
    </Button>
  </SignedIn>
</div>





      </nav>
    </header>
  );
}