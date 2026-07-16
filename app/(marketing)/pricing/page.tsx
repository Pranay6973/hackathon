import { Navbar } from "@/components/landing";
import { PricingTable } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";

const PricingPage = () => {
  return (
    <div className="relative min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-28">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to home
        </Link>

        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Choose your plan
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free, upgrade when you need more power.
          </p>
        </div>

        <PricingTable />
        <p className="mt-8 text-center text-sm text-muted-foreground">
        All plans include: Live preview, Code editor, Verion control, Dark mode
        </p>
      </main>
    </div>
  );
};

export default PricingPage;