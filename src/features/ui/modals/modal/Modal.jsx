import ReactModal from 'react-bootstrap/Modal';

import { ModalBody } from './ModalBody';
import { ModalFooter } from './ModalFooter';
import { ModalHeader } from './ModalHeader';

const Modal = ({ isOpen, allowEscapeClose = false, centered, size, children, onHide }) => {
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
    <ReactModal
      show={isOpen}
      size={size}
      centered={centered}
      backdrop="static"
      keyboard={allowEscapeClose}
      scrollable
      onHide={onHide}>
      {children}
    </ReactModal>
  );
};

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export { Modal };
