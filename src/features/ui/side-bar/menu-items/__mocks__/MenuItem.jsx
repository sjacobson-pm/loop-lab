export const MenuItem = ({ icon, title, onClick }) => (
  <div data-icon={JSON.stringify(icon)} data-title={title} onClick={onClick}>
    MenuItem
  </div>
);
