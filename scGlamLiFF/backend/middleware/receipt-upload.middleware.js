import multer from "multer";

const MAX_RECEIPT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_RECEIPT_FILE_SIZE_BYTES,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (file?.mimetype?.startsWith("image/")) {
      callback(null, true);
      return;
    }

    const error = new Error("receipt must be an image file");
    error.status = 400;
    callback(error);
  }
});

const receiptUploadMiddleware = (req, res, next) => {
  upload.single("receipt")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "receipt image is too large" });
      return;
    }

    res.status(error.status || 400).json({
      error: error.message || "Failed to upload receipt image"
    });
  });
};

export default receiptUploadMiddleware;
