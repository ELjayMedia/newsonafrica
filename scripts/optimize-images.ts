import fs from "fs";
import path from "path";
import { promisify } from "util";
import imagemin from "imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminWebp from "imagemin-webp";
import logger from "../utils/logger";

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const PUBLIC_DIR = path.join(process.cwd(), "public");

async function getImageFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  const imageFiles: string[] = [];

  for (const file of files) {
    const filePath = path.join(dir, file);

    try {
      const stats = await stat(filePath);

      if (stats.isDirectory()) {
        try {
          const subDirImages = await getImageFiles(filePath);
          imageFiles.push(...subDirImages);
        } catch (error: any) {
          logger.warn(`Warning: Could not process directory ${filePath}:`, error.message);
        }
      } else if (stats.isFile() && /\.(jpe?g|png)$/i.test(file)) {
        imageFiles.push(filePath);
      }
    } catch (error: any) {
      logger.warn(`Warning: Could not stat ${filePath}:`, error.message);
      continue;
    }
  }

  return imageFiles;
}

async function optimizeImages() {
  try {
    logger.info("Scanning for images...");
    const imageFiles = await getImageFiles(PUBLIC_DIR);
    logger.info(`Found ${imageFiles.length} images to optimize`);

    if (imageFiles.length === 0) {
      logger.info("No images to optimize");
      return;
    }

    const imagesByDir = imageFiles.reduce<Record<string, string[]>>((acc, file) => {
      const dir = path.dirname(file);
      if (!acc[dir]) {
        acc[dir] = [];
      }
      acc[dir].push(path.basename(file));
      return acc;
    }, {});

    for (const [dir, files] of Object.entries(imagesByDir)) {
      logger.info(`Processing ${files.length} images in ${dir}...`);

      try {
        await imagemin([`${dir}/*.{jpg,jpeg,png}`], {
          destination: dir,
          plugins: [imageminMozjpeg({ quality: 80 }), imageminPngquant({ quality: [0.65, 0.8] })],
        });

        await imagemin([`${dir}/*.{jpg,jpeg,png}`], {
          destination: dir,
          plugins: [imageminWebp({ quality: 75 })],
        });

        logger.info(`Finished processing images in ${dir}`);
      } catch (error: any) {
        logger.error(`Error processing images in ${dir}:`, error.message);
        continue;
      }
    }

    logger.info("Image optimization complete!");
  } catch (error) {
    logger.error("Error optimizing images:", error);
    process.exit(1);
  }
}

optimizeImages();
