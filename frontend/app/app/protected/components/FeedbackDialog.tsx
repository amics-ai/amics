'use client'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveFeedback } from "@/app/actions"
import { useState } from "react"
import { SubmitButton } from "@/components/submit-button"

export function FeedbackDialog({ callSid }: { 
  callSid: string;
}) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<string>()
  const [feedback, setFeedback] = useState("")

  const handleSubmit = async (formData: FormData) => {
    if (!rating || !feedback.trim()) return;
    await saveFeedback(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Give Feedback</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>How was your call?</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <input type="hidden" name="call_sid" value={callSid} />
          <div>
            <label htmlFor="rating" className="block text-sm font-medium mb-2">Rating</label>
            <Select name="rating" required onValueChange={setRating}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Excellent</SelectItem>
                <SelectItem value="4">Good</SelectItem>
                <SelectItem value="3">Average</SelectItem>
                <SelectItem value="2">Poor</SelectItem>
                <SelectItem value="1">Very Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium mb-2">Feedback</label>
            <Textarea
              id="feedback"
              name="feedback"
              placeholder="Tell us about your experience"
              required
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          <SubmitButton type="submit" disabled={!rating || !feedback.trim()} pendingText="Submitting Feedback..." formAction={handleSubmit}>
            Submit Feedback
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  )
} 