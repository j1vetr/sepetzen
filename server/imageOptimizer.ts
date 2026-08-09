import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

const DEFAULT_OPTIONS: OptimizeOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 85,
  format: 'webp',
};

export async function optimizeImage(
  inputPath: string,
  options: OptimizeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const baseName = path.basename(inputPath, ext);
  const outputPath = path.join(dir, `${baseName}.webp`);
  
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Re-encoding a GIF as WebP can flatten animated files to a single frame.
    // Keep GIF uploads byte-for-byte so both static and animated GIFs continue
    // to work in admin previews and on the storefront.
    if (metadata.format === 'gif') {
      console.log(`[ImageOptimizer] Preserved GIF: ${path.basename(inputPath)}`);
      return inputPath;
    }
    
    let pipeline = image;
    
    if (metadata.width && metadata.height) {
      if (metadata.width > (opts.maxWidth || 1200) || metadata.height > (opts.maxHeight || 1200)) {
        pipeline = pipeline.resize({
          width: opts.maxWidth,
          height: opts.maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }
    
    await pipeline
      .webp({ quality: opts.quality })
      .toFile(outputPath);
    
    if (inputPath !== outputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    
    const originalSize = metadata.size || 0;
    const optimizedStats = fs.statSync(outputPath);
    const savedPercent = originalSize > 0 
      ? Math.round((1 - optimizedStats.size / originalSize) * 100) 
      : 0;
    
    console.log(`[ImageOptimizer] Optimized: ${baseName} - Saved ${savedPercent}% (${formatBytes(originalSize)} -> ${formatBytes(optimizedStats.size)})`);
    
    return outputPath;
  } catch (error) {
    console.error(`[ImageOptimizer] Error optimizing ${inputPath}:`, error);
    return inputPath;
  }
}

export async function optimizeImageBuffer(
  buffer: Buffer,
  outputPath: string,
  options: OptimizeOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const dir = path.dirname(outputPath);
  const ext = path.extname(outputPath);
  const baseName = path.basename(outputPath, ext);
  const finalPath = path.join(dir, `${baseName}.webp`);
  
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // `outputPath` is often a temporary .tmp/.webp path for imported images.
    // Write GIF data to a real .gif file without decoding/re-encoding it so
    // animation, timing, and transparency are preserved.
    if (metadata.format === 'gif') {
      const gifPath = path.join(dir, `${baseName}.gif`);
      await fs.promises.writeFile(gifPath, buffer);
      console.log(`[ImageOptimizer] Preserved GIF buffer: ${path.basename(gifPath)}`);
      return gifPath;
    }
    
    let pipeline = image;
    
    if (metadata.width && metadata.height) {
      if (metadata.width > (opts.maxWidth || 1200) || metadata.height > (opts.maxHeight || 1200)) {
        pipeline = pipeline.resize({
          width: opts.maxWidth,
          height: opts.maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }
    
    await pipeline
      .webp({ quality: opts.quality })
      .toFile(finalPath);
    
    const optimizedStats = fs.statSync(finalPath);
    const originalSize = buffer.length;
    const savedPercent = Math.round((1 - optimizedStats.size / originalSize) * 100);
    
    console.log(`[ImageOptimizer] Optimized: ${baseName} - Saved ${savedPercent}% (${formatBytes(originalSize)} -> ${formatBytes(optimizedStats.size)})`);
    
    return finalPath;
  } catch (error) {
    console.error(`[ImageOptimizer] Error optimizing buffer:`, error);
    const dir = path.dirname(outputPath);
    const ext = path.extname(outputPath);
    const baseName = path.basename(outputPath, ext);
    const fallbackPath = path.join(dir, `${baseName}.jpg`);
    await fs.promises.writeFile(fallbackPath, buffer);
    return fallbackPath;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export async function optimizeUploadedFiles(files: Express.Multer.File[]): Promise<string[]> {
  const optimizedPaths: string[] = [];
  
  for (const file of files) {
    try {
      const optimizedPath = await optimizeImage(file.path);
      const relativePath = optimizedPath.replace(process.cwd() + '/client/public', '');
      optimizedPaths.push(relativePath);
    } catch (error) {
      console.error(`[ImageOptimizer] Failed to optimize ${file.filename}:`, error);
      const relativePath = file.path.replace(process.cwd() + '/client/public', '');
      optimizedPaths.push(relativePath);
    }
  }
  
  return optimizedPaths;
}
