
/**
 * Sorts stops according to the display requirements:
 * 1. Pickup Site (Priority 1)
 * 2. Delivery Site (Priority 2)
 * 3. Other Site stops (Priority 3)
 * 4. Pickup LPO (Priority 4)
 * 5. Delivery LPO (Priority 5)
 * 6. Other LPO stops (Priority 6)
 * 7. Anything else (Priority 7)
 * 
 * Also attaches the originalIndex to each stop for status update handlers.
 */
export const sortStops = (stops: any[]) => {
  return [...(stops || [])]
    .map((s, index) => ({ ...s, originalIndex: index }))
    .sort((a, b) => {
      const getPriority = (label: string) => {
        const l = (label || '').toLowerCase();
        if (l.includes('pickup site')) return 1;
        if (l.includes('delivery site')) return 2;
        if (l.includes('site')) return 3;
        if (l.includes('pickup lpo')) return 4;
        if (l.includes('delivery lpo')) return 5;
        if (l.includes('lpo')) return 6;
        return 7;
      };
      
      const pA = getPriority(a.label);
      const pB = getPriority(b.label);
      
      if (pA !== pB) return pA - pB;
      return (a.sequence || 0) - (b.sequence || 0);
    });
};
