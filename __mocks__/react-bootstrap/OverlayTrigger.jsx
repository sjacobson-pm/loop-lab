export default function OverlayTrigger({ trigger, placement, delay, overlay, children }) {
  return (
    <div data-trigger={JSON.stringify(trigger)} data-placement={placement} data-delay={JSON.stringify(delay)}>
      OverlayTrigger
      {children}
      {overlay}
    </div>
  );
}
