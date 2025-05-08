// 需要安装 sharp 包: npm install sharp
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, '../src/public/icon.svg');
const outputDir = path.join(__dirname, '../src/public');

// 定义需要生成的图标尺寸
const sizes = [128];

async function generateIcons() {
  try {
    // 读取SVG文件
    const svgBuffer = fs.readFileSync(svgPath);

    // 为每个尺寸生成PNG
    for (const size of sizes) {
      // 只生成icon-格式的图标
      const iconOutputPath = path.join(outputDir, `icon-${size}.png`);

      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(iconOutputPath);

      console.log(`Generated ${iconOutputPath}`);
    }

    // 复制一个名为icon.svg的文件
    fs.copyFileSync(svgPath, path.join(outputDir, 'icon.svg'));
    console.log(`Copied SVG to ${path.join(outputDir, 'icon.svg')}`);

    console.log('Icon generation complete!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();