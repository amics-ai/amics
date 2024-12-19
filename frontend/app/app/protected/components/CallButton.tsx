'use client'

import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function CallButton({ 
  initiateCall, 
  isVerified 
}: { 
  initiateCall: () => Promise<void>,
  isVerified: boolean 
}) {
  return (
    <form action={async () => {
      try {
        await initiateCall();
      } catch (error) {
        
        toast.error('Failed to initiate call', {
          description: 'Please try again later',
        });
      }
    }} className="inline">
      <Button 
        type="submit"
        //disabled={!isVerified}
      >
        Call me
      </Button>
    </form>
  );
} 