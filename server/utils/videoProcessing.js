// server/utils/videoProcessing.js
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

export const extractMetadataAndThumbnail = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return resolve({ duration: null, thumbnail: null });

    const outThumb = `${filePath}-thumb.jpg`;
    try {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return resolve({ duration: null, thumbnail: null });

        const duration = Math.floor(metadata.format.duration || 0);

        // create thumbnail at 10% of duration if possible
        const seek = Math.max(1, Math.floor(duration * 0.1));
        ffmpeg(filePath)
          .screenshots({
            timestamps: [seek],
            filename: path.basename(outThumb),
            folder: path.dirname(outThumb),
            size: "640x?",
          })
          .on("end", () => {
            if (fs.existsSync(outThumb)) {
              resolve({ duration, thumbnail: `/uploads/${path.basename(outThumb)}` });
            } else {
              resolve({ duration, thumbnail: null });
            }
          })
          .on("error", () => resolve({ duration, thumbnail: null }));
      });
    } catch (e) {
      resolve({ duration: null, thumbnail: null });
    }
  });
};
