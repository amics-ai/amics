'use client'

import { Button } from "@/components/ui/button"
import { updatePhoneNumber } from "@/app/actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"

export function ChangePhoneDialog({ 
  prefixes, 
  
  currentNumber,
  currentPrefix 
}: { 
  prefixes: { prefix: string }[];
  
  currentNumber: string;
  currentPrefix: string;
}) {
  const [open, setOpen] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    await updatePhoneNumber(formData, currentNumber);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Change Number</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Phone Number</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="prefix" className="block text-sm font-medium mb-2">Country Code</label>
            <select 
              id="prefix"
              name="prefix"
              className="w-full p-2 border rounded-md"
              defaultValue={currentPrefix}
              required
            >
              {prefixes.map(({ prefix }) => (
                <option key={prefix} value={prefix}>{prefix}</option>
              ))}
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
              defaultValue={currentNumber.replace(/^\+\d+/, '')}
              required
            />
          </div>

          <Button type="submit">Update Number</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 