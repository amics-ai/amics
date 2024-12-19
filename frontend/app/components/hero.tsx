import {LogInIcon } from "lucide-react";
import NextLogo from "./next-logo";
import SupabaseLogo from "./supabase-logo";
import { Button } from "./ui/button";
import Link from "next/link";

export default function Header() {
  return (
    <div className="flex flex-col gap-16 items-center">
      
        <h1 className="text-4xl font-bold">Amics</h1>
        <p className="text-xl">Your AI companion</p>

        <p className="text-sm text-foreground/50">
          We are in a private state. Please sign in to continue.
        </p>

        <Link href="/sign-in">
          <Button >
            <LogInIcon size="16" strokeWidth={2} className="mr-2"/>
            Sign in
          </Button>
        </Link>
    </div>
  );
}
