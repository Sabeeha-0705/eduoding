// server/utils/upload.js (ESM) - Cloudinary + S3 support, robust
import cloudinary from "cloudinary";
import streamifier from "streamifier";
import AWS from "aws-sdk";

/*
  EXPECTED env:
  - STORAGE = "cloudinary" (default) or "s3"
  - For Cloudinary:
    CLOUDINARY_URL  OR CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
    (optional) CLOUDINARY_CERT_FOLDER
  - For S3:
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
    (optional) AWS_S3_PREFIX
*/

const CLOUD_FOLDER = process.env.CLOUDINARY_CERT_FOLDER || "certificates";

// configure cloudinary if credentials present
if (process.env.CLOUDINARY_URL) {
  // cloudinary reads CLOUDINARY_URL automatically; set secure flag
  cloudinary.v2.config({ secure: true });
} else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/* Helper: upload buffer to Cloudinary (raw resource for PDFs) */
function uploadBufferToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    if (!cloudinary || !cloudinary.v2) return reject(new Error("Cloudinary not configured"));
    const publicId = String(filename).replace(/\.[^.]+$/, ""); // drop extension
    const opts = {
      resource_type: "raw", // use raw for pdf
      folder: CLOUD_FOLDER,
      public_id: publicId,
      overwrite: true,
      use_filename: false,
    };

    const uploadStream = cloudinary.v2.uploader.upload_stream(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/* Helper: upload buffer to S3 */
async function uploadBufferToS3(buffer, filename) {
  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET,
    AWS_S3_PREFIX,
  } = process.env;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET) {
    throw new Error("S3 configuration missing in env (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET)");
  }

  const s3 = new AWS.S3({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION,
  });

  const prefix = AWS_S3_PREFIX ? AWS_S3_PREFIX.replace(/\/+$/, "") + "/" : "certificates/";
  const Key = `${prefix}${filename}`;

  await s3
    .putObject({
      Bucket: AWS_S3_BUCKET,
      Key,
      Body: buffer,
      ContentType: "application/pdf",
      ACL: "public-read",
    })
    .promise();

  const publicUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${Key}`;
  return { Location: publicUrl, Key };
}

/**
 * uploadPDFBuffer(buffer, filename)
 * - buffer: Buffer (PDF)
 * - filename: string, e.g. "certificate-123.pdf"
 *
 * Returns: { url, provider, raw }
 */
export async function uploadPDFBuffer(buffer, filename = `file-${Date.now()}.pdf`) {
  if (!buffer || !(buffer instanceof Buffer)) {
    throw new Error("uploadPDFBuffer: buffer must be a Node Buffer");
  }
  const storage = (process.env.STORAGE || "cloudinary").toLowerCase();

  if (storage === "s3") {
    const res = await uploadBufferToS3(buffer, filename);
    return { url: res.Location, provider: "s3", raw: res };
  }

  // default: cloudinary
  // ensure cloudinary is configured
  try {
    const res = await uploadBufferToCloudinary(buffer, filename);
    // cloudinary returns secure_url for accessible link
    const url = res.secure_url || res.url || (res.info && res.info.secure_url) || null;
    return { url, provider: "cloudinary", raw: res };
  } catch (err) {
    // if cloudinary fails and S3 is configured, try S3 as fallback
    if (process.env.AWS_S3_BUCKET) {
      try {
        const s3res = await uploadBufferToS3(buffer, filename);
        return { url: s3res.Location, provider: "s3", raw: s3res };
      } catch (s3err) {
        // rethrow original cloudinary error with note
        throw new Error(`Cloudinary upload failed: ${err.message}; S3 fallback also failed: ${s3err.message}`);
      }
    }
    throw err;
  }
}
