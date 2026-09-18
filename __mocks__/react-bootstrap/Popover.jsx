export default function Popover({ children }) {
  return <div>Popover{children}</div>;
}

const Header = ({ children }) => <div>PopoverHeader{children}</div>;
const Body = ({ children }) => <div>PopoverBody{children}</div>;

Popover.Header = Header;
Popover.Body = Body;
