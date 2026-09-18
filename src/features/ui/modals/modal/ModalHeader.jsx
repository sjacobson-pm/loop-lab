import Modal from 'react-bootstrap/Modal';

const ModalHeader = ({ title }) => {
  // **********************************************************************
  // * constants / component vars

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  // **********************************************************************
  // * side effects

  // **********************************************************************
  // * render

  return (
    <Modal.Header closeButton closeLabel="cancel/close">
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
  );
};

export { ModalHeader };
