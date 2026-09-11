export function getTourPopoverPosition(
  box: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
  cardHeight: number,
) {
  const margin = 12;
  const gap = 22;
  const width = Math.min(300, viewport.width - margin * 2);
  const below = box.y + box.height + gap;
  const above = box.y - gap - cardHeight;
  const preferredTop = below + cardHeight <= viewport.height - margin
    ? below : above >= margin ? above : below;
  return {
    width,
    top: Math.max(margin, Math.min(preferredTop, viewport.height - cardHeight - margin)),
    left: Math.max(margin, Math.min(box.x + box.width / 2 - width / 2, viewport.width - width - margin)),
  };
}
