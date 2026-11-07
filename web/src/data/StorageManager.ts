export const storageSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1048576
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : bytes < 1073741824
        ? `${(bytes / 1048576).toFixed(2)} MiB`
        : `${(bytes / 1073741824).toFixed(2)} GiB`;
