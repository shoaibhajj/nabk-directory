/**
 * Uploads a PDF buffer to Cloudinary under the `nabk-pdfs` folder.
 * Returns the secure URL so it can be stored in PdfGenerationJob.outputFileUrl.
 *
 * We use `resource_type: "raw"` with .pdf suffix in public_id to ensure
 * Cloudinary preserves the extension in the public URL.
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
  // Strip any existing .pdf suffix to avoid double extension
  const cleanId = publicId.replace(/\.pdf$/i, "");

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "nabk-pdfs",
        // Including .pdf in public_id makes Cloudinary serve the URL with the extension
        public_id: `${cleanId}.pdf`,
        overwrite: true,
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
