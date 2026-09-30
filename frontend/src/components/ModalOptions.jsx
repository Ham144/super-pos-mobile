export default function ModalOptions({ onClose, options, modalId }) {
  return (
    <dialog id={modalId} className="modal  w-full">
      <div className="modal-box p-6 max-w-md w-full shadow-xl">
        {/* Modal header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Options</h3>
          <button
            onClick={() => document.getElementById(modalId).close()}
            className="btn btn-circle btn-ghost btn-sm hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div className="flex flex-col gap-3">
          {options.map((option, index) => (
            <button
              key={index}
              onClick={option.onClick}
              className="btn btn-outline w-full justify-start px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              {option.icon && <span className="mr-2">{option.icon}</span>}
              <span className="text-gray-700">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Modal footer */}
        <div className="modal-action mt-4">
          <button
            onClick={() => document.getElementById(modalId).close()}
            className="btn btn-ghost text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
