/**
 * Uploads a PDF buffer to Cloudinary under the `nabk-pdfs` folder.
 * Returns the secure URL so it can be stored in PdfGenerationJob.outputFileUrl.
 *
 * We use the `raw` resource type because Cloudinary treats PDFs as raw files
 * when you want to serve them directly (not convert to images).
 */
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadPdfToCloudinary(
  buffer: Buffer,
  publicId: string, // e.g. "nabk-directory-2025-edition-1"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "nabk-pdfs",
        public_id: publicId,
        overwrite: true,
        // Allow direct download via ?dl=1 query param
        access_mode: "public",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
        } else {
          resolve(result.secure_url);
        }
      },
    );
    stream.end(buffer);
  });
}
