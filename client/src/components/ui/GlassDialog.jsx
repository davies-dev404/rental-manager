import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import React from 'react';

/**
 * GlassDialog – a reusable dialog with glass‑morphism background and subtle entrance animation.
 * Usage:
 * <GlassDialog open={open} onOpenChange={setOpen} title="My Title" description="My description">
 *   {/* dialog body */}
 * </GlassDialog>
 */
export const GlassDialog = ({ open, onOpenChange, children, title, description }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm glass" asChild>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.25 }}
        >
          <DialogHeader>
            {title && <DialogTitle className="text-center">{title}</DialogTitle>}
            {description && (
              <DialogDescription className="text-center">{description}</DialogDescription>
            )}
          </DialogHeader>
          {children}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
