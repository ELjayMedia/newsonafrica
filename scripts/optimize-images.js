const fs = require("node:fs/promises")
const path = require("node:path")
const sharp = require("sharp")

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"])
const PUBLIC_DIR = path.join(process.cwd(), "public")

async function getImageFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      try {
        const nested = await getImageFiles(entryPath)
        files.push(...nested)
      } catch (error) {
        console.warn(`Warning: Unable to process directory ${entryPath}:`, error.message)
      }
    } else if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(extension)) {
        files.push(entryPath)
      }
    }
  }

  return files
}

async function optimizeFile(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return
  }

  const originalBuffer = await fs.readFile(filePath)
  const image = sharp(originalBuffer)

  let optimizedBuffer

  if (extension === ".png") {
    optimizedBuffer = await image.clone().png({ compressionLevel: 9, palette: true }).toBuffer()
  } else {
    optimizedBuffer = await image
      .clone()
      .jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer()
  }

  if (optimizedBuffer.length < originalBuffer.length) {
    await fs.writeFile(filePath, optimizedBuffer)
  }

  const webpPath = filePath.replace(/\.(jpe?g|png)$/i, ".webp")
  const webpBuffer = await image.clone().webp({ quality: 75 }).toBuffer()
  await fs.writeFile(webpPath, webpBuffer)
}

async function optimizeImages() {
  try {
    console.log("Scanning for images...")
    const imageFiles = await getImageFiles(PUBLIC_DIR)
    console.log(`Found ${imageFiles.length} images to optimize`)

    if (imageFiles.length === 0) {
      return
    }

    for (const filePath of imageFiles) {
      try {
        await optimizeFile(filePath)
        console.log(`Optimized ${filePath}`)
      } catch (error) {
        console.error(`Failed to optimize ${filePath}:`, error.message)
      }
    }

    console.log("Image optimization complete!")
  } catch (error) {
    console.error("Error optimizing images:", error)
    process.exitCode = 1
  }
}

optimizeImages()
