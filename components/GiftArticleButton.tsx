"use client"

import { useState } from "react"
import { Gift } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PaystackButton } from "@/components/PaystackButton"
import { GIFT_ARTICLE_AMOUNT } from "@/config/paystack"

interface GiftArticleButtonProps {
  postSlug: string
  postTitle: string
}

export function GiftArticleButton({ postSlug, postTitle }: GiftArticleButtonProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full flex items-center gap-1 md:gap-2 bg-white text-xs md:text-sm px-2 md:px-3 py-1 md:py-2"
        >
          <Gift className="w-3 h-3 md:w-4 md:h-4" />
          <span className="hidden sm:inline">Gift article</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gift this article</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <PaystackButton
            email={email}
            amount={GIFT_ARTICLE_AMOUNT}
            currency="ZAR"
            firstName={firstName}
            lastName={lastName}
            metadata={{ type: "gift", post_slug: postSlug, post_title: postTitle }}
            onSuccess={() => setOpen(false)}
            label="Pay with Paystack"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
