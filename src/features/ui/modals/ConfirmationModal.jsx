import { Modal } from './modal/Modal';

const ConfirmationModal = ({
  isOpen,
  title,
  confirmationMessage,
  confirmButtonText,
  cancelButtonText,
  size,
  onConfirm,
  onCancel,
}) => {
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
    <Modal isOpen={isOpen} centered size={size} onHide={onCancel}>
      <Modal.Header title={title} />
      <Modal.Body>{confirmationMessage}</Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {cancelButtonText}
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          {confirmButtonText}
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export { ConfirmationModal };
