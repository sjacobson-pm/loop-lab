const MessageTableRow = ({ className, colSpan, children }) => {
  // **********************************************************************
  // * constants / component vars

  const rowClassName = `${className}`.trim();

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <tr className={rowClassName}>
      <td colSpan={colSpan}>{children}</td>
    </tr>
  );
};

export { MessageTableRow };
