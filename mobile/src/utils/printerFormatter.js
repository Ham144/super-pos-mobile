const printerFormatter = {
  ESC_INIT: "\x1B\x40", // Initialize printer
  CUT_PAPER: "\x1D\x56\x00", // Full cut
  ESC_ALIGN_CENTER: "\x1B\x61\x01", // Align center
  ESC_ALIGN_LEFT: "\x1B\x61\x00", // Align left
  ESC_FONT_SIZE_LARGE: "\x1D\x21\x11", // Set larger font size
  ESC_FONT_SIZE_NORMAL: "\x1D\x21\x00", // Set normal font size
  totalWidth: 46,
  formatColumns: (left, middle, right, paperWidth = 46) => {
    left = String(left).trim();
    middle = String(middle).trim();
    right = String(right).trim();

    const leftWidth = Math.floor(paperWidth * 0.5);
    const middleWidth = Math.floor(paperWidth * 0.1);
    const rightWidth = Math.floor(paperWidth * 0.4);

    left =
      left.length > leftWidth
        ? left.substring(0, leftWidth - 1) + "..."
        : left.padEnd(leftWidth);
    middle = middle.padStart(middleWidth);
    right = right.padStart(rightWidth);

    return `${left}${middle}${right}`;
  },

  // Helper function to format with dynamic space
  formatWithSpace: (label, value, paperWidth = 46) => {
    const labelLength = label?.length || 1;
    const valueLength = value?.length || 1;
    const space = paperWidth - labelLength - valueLength;
    const spaceString = " ".repeat(space > 0 ? space : 0); // Buat spasi dinamis
    return `${label}${spaceString || "-"}${value || "-"}`;
  },
};

export default printerFormatter;
