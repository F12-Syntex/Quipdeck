"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetGrabber,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Sheet and Dialog open on press; they are modal, so they cannot sit inline. */
export function OverlayDemos() {
  return (
    <div className="flex flex-wrap gap-3">
      <Sheet>
        <SheetTrigger render={<Button variant="glass" size="pill" />}>
          Open sheet
        </SheetTrigger>
        <SheetContent side="bottom" className="items-center px-5 pt-3 pb-8">
          <SheetGrabber />
          <SheetHeader className="w-full p-0">
            <SheetTitle className="text-heading text-fg-primary">
              Someone uses a figure of speech
            </SheetTitle>
            <SheetDescription className="text-body text-fg-secondary">
              The bottom sheet: glass-chrome-strong, rounded-sheet, scrim behind.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
      <Dialog>
        <DialogTrigger render={<Button variant="chrome" size="pill" />}>
          Open dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-heading text-fg-primary">
              Dialog
            </DialogTitle>
            <DialogDescription className="text-body text-fg-secondary">
              glass-chrome-strong on rounded-card, subtle zoom, none under
              reduced motion.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
