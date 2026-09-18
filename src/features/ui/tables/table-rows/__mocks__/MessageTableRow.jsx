export const MessageTableRow = ({ children, className, colSpan }) => (
  <div data-class={className} data-colspan={colSpan}>
    {children}
  </div>
);
