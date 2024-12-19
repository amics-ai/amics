import { createClient } from "@/utils/supabase/server";
import { InfoIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { FeedbackDialog } from "./components/FeedbackDialog"
import { redirect } from "next/navigation";
import { savePhoneNumber } from "../actions";
import { ChangePhoneDialog } from "./components/ChangePhoneDialog"
import { CallButton } from "./components/CallButton"
import { initiateCall } from "../actions"
import { SubmitButton } from "@/components/submit-button";

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 
    ? `${minutes}m ${remainingSeconds}s`
    : `${minutes}m`;
}

export default async function ProtectedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch phone number and calls in parallel for better performance
  const [phoneNumberResult, callsResult] = await Promise.all([
    supabase
      .from('phone_numbers')
      .select('phone_number, is_verified, prefix')
      .eq('user_id', user.id)
      .single(),
      
    supabase
      .from('calls')
      .select(`
        id,
        call_sid, 
        status,
        start_time,
        duration,
        from_number,
        to_number,
        feedback_submitted:feedback
      `)
      .order('start_time', { ascending: false })
  ]);

  const phoneNumber = phoneNumberResult.data;
  const calls = phoneNumberResult.data?.phone_number 
    ? callsResult.data?.filter(call => call.to_number === phoneNumberResult.data.phone_number)
    : [];


  

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      
      
      {!phoneNumber ? (
        <div className="flex flex-col gap-2 items-center w-full">
          <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
              <InfoIcon size="16" strokeWidth={2} />
              Input your phone number and we'll send you a two minute call with our AI. You can call as many times as you want.
            </div>
          <div className="w-full max-w-sm">
            
          </div>
          <h2 className="font-bold text-2xl mb-4">Enter your phone number</h2>
          <form  className="flex flex-col gap-4 w-full max-w-sm">
            <div>
              <label htmlFor="prefix" className="block text-sm font-medium mb-2">Country Code</label>
              <select 
                id="prefix"
                name="prefix"
                className="w-full p-2 border rounded-md"
                required
              >
                {(await supabase
                  .from('phone_prefixes')
                  .select('prefix'))
                  .data?.map(({ prefix }) => (
                    <option key={prefix} value={prefix}>{prefix}</option>
                  ))
                }
              </select>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                className="w-full p-2 border rounded-md"
                placeholder="Enter your phone number"
                required
              />
            </div>

            <SubmitButton formAction={savePhoneNumber} pendingText="Saving Phone Number..." >
              Submit
            </SubmitButton>
          </form>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
              <InfoIcon size="16" strokeWidth={2} />
              Request a call anytime you want to chat with your AI companion.
            </div>
            
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Phone number: {phoneNumber.phone_number}
              </p>
              <ChangePhoneDialog 
                prefixes={(await supabase.from('phone_prefixes').select('prefix')).data || []}
                currentNumber={phoneNumber.phone_number}
                currentPrefix={phoneNumber.prefix}
              />
              <CallButton 
                initiateCall={initiateCall} 
                isVerified={phoneNumber.is_verified} 
              />
            </div>
          </div>

          {calls && calls.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-bold text-2xl">Call History</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell suppressHydrationWarning>
                        {format(new Date(call.start_time), 'PPp')}
                      </TableCell>
                      <TableCell>
                        {formatDuration(call.duration)}
                      </TableCell>
                      <TableCell>
                        <span className={`capitalize ${
                          call.status === 'completed' ? 'text-green-600' : 
                          call.status === 'failed' ? 'text-red-600' : 
                          'text-yellow-600'
                        }`}>
                          {call.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {call.feedback_submitted ? (
                          <span className="text-green-600">Submitted</span>
                        ) : (
                          <span className="text-yellow-600">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!call.feedback_submitted && call.status === 'completed' && (
                          <FeedbackDialog callSid={call.call_sid} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
