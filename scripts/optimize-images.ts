import fs from "fs"
import path from "path"
import { promisify } from "util"
import imagemin from "imagemin"
import imageminMozjpeg from "imagemin-mozjpeg"
import imageminPngquant from "imagemin-pngquant"
import imageminWebp from "imagemin-webp"

const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)

// Directories to process
const PUBLIC_DIR = path.join(process.cwd(), "public")

// Function to get all image files recursively
async function getImageFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir)
  const imageFiles: string[] = []

  for (const file of files) {
    const filePath = path.join(dir, file)

    try {
      const stats = await stat(filePath)

      if (stats.isDirectory()) {
        try {
          const subDirImages = await getImageFiles(filePath)
          imageFiles.push(...subDirImages)
        } catch (error: any) {
          console.warn(`Warning: Could not process directory ${filePath}:`, error.message)
        }
      } else if (stats.isFile() && /\.(jpe?g|png)$/i.test(file)) {
        imageFiles.push(filePath)
      }
    } catch (error: any) {
      console.warn(`Warning: Could not stat ${filePath}:`, error.message)
      continue
    }
  }

  return imageFiles
}

// Function to optimize images
async function optimizeImages() {
  try {
    console.log("Scanning for images...")
    const imageFiles = await getImageFiles(PUBLIC_DIR)
    console.log(`Found ${imageFiles.length} images to optimize`)

    if (imageFiles.length === 0) {
      console.log("No images to optimize")
      return
    }

    // Group images by directory for processing
    const imagesByDir = imageFiles.reduce<Record<string, string[]>>((acc, file) => {
      const dir = path.dirname(file)
      if (!acc[dir]) {
        acc[dir] = []
      }
      acc[dir].push(path.basename(file))
      return acc
    }, {})

    // Process each directory
    for (const [dir, files] of Object.entries(imagesByDir)) {
      console.log(`Processing ${files.length} images in ${dir}...`)

      try {
        // Optimize JPEG and PNG
        await imagemin([`${dir}/*.{jpg,jpeg,png}`], {
          destination: dir,
          plugins: [imageminMozjpeg({ quality: 80 }), imageminPngquant({ quality: [0.65, 0.8] })],
        })

        // Convert to WebP
        await imagemin([`${dir}/*.{jpg,jpeg,png}`], {
          destination: dir,
          plugins: [imageminWebp({ quality: 75 })],
        })

        console.log(`Finished processing images in ${dir}`)
      } catch (error: any) {
        console.error(`Error processing images in ${dir}:`, error.message)
        continue
      }
    }

    console.log("Image optimization complete!")
  } catch (error) {
    console.error("Error optimizing images:", error)
    process.exit(1)
  }
}

// Run the optimization
optimizeImages()
