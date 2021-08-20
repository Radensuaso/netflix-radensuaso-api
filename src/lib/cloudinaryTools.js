import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

export const saveMediaCloudinary = new CloudinaryStorage({
  cloudinary,
  params: {
    format: "png",
    folder: "netflixApi/media",
  },
});
