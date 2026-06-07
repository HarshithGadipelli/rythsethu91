import multer from "multer";
import path from "path";

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {

    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, unique + path.extname(file.originalname));

  }

});

const fileFilter = (req, file, cb) => {

  const allowed = ["image/png", "image/jpg", "image/jpeg"];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images allowed"), false);
  }

};

export const upload = multer({
  storage,
  fileFilter
});