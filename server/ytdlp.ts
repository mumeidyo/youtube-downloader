import { spawn, execSync } from "child_process";
import { createWriteStream, unlink, mkdirSync, existsSync, chmodSync, accessSync, constants } from "fs";
import { join, basename } from "path";
import { VideoInfo, formatOptions } from "@shared/schema";

// Create and configure temp directory for downloads if it doesn't exist
const downloadDir = join(process.cwd(), "temp-downloads");
if (!existsSync(downloadDir)) {
  try {
    // Create directory with full permissions
    mkdirSync(downloadDir, { recursive: true, mode: 0o777 });
    console.log(`Created download directory: ${downloadDir}`);
    
    // Ensure directory has write permissions
    chmodSync(downloadDir, 0o777);
    console.log(`Set permissions on download directory to 0777`);
  } catch (error) {
    console.error(`Failed to create or set permissions on download directory: ${error}`);
  }
} else {
  console.log(`Download directory exists: ${downloadDir}`);
  
  // Check if directory is writable
  try {
    accessSync(downloadDir, constants.W_OK);
    console.log(`Download directory is writable`);
  } catch (error) {
    console.error(`Download directory is not writable: ${error}`);
    try {
      // Try to set permissions if we have access
      chmodSync(downloadDir, 0o777);
      console.log(`Set permissions on existing download directory to 0777`);
    } catch (chmodError) {
      console.error(`Failed to set permissions on existing directory: ${chmodError}`);
    }
  }
}

// Use local yt-dlp binary or find it in the PATH for cloud environments
let YT_DLP_PATH = "yt-dlp"; // Default to PATH lookup

// Check if local binary exists
const localBinaryPath = join(process.cwd(), "bin", "yt-dlp");
if (existsSync(localBinaryPath)) {
  YT_DLP_PATH = localBinaryPath;
  console.log(`Using local yt-dlp binary: ${YT_DLP_PATH}`);
  
  // Ensure executable permissions on the binary
  try {
    chmodSync(YT_DLP_PATH, 0o755);
    console.log(`Set executable permissions on yt-dlp binary`);
  } catch (error) {
    console.error(`Failed to set executable permissions on yt-dlp binary: ${error}`);
  }
} else {
  console.log("Local yt-dlp binary not found, using system PATH");
}

// Verify yt-dlp is available
try {
  const version = execSync(`${YT_DLP_PATH} --version`).toString().trim();
  console.log(`yt-dlp version: ${version}`);
} catch (error) {
  console.error(`Failed to get yt-dlp version: ${error}`);
  // Don't exit, as we might recover in a different environment
}

interface FetchVideoInfoOptions {
  url: string;
}

interface DownloadVideoOptions {
  url: string;
  format: string;
  onProgress?: (progress: number) => void;
}

export async function fetchVideoInfo({ url }: FetchVideoInfoOptions): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    // Use yt-dlp to get video info in JSON format
    const ytdlp = spawn(YT_DLP_PATH, [
      "--dump-json",
      "--no-playlist",
      url
    ]);

    let stdout = "";
    let stderr = "";

    ytdlp.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ytdlp.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ytdlp.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
      }

      try {
        const info = JSON.parse(stdout);
        const videoInfo: VideoInfo = {
          id: info.id,
          title: info.title,
          description: info.description || "",
          thumbnail: info.thumbnail,
          duration: info.duration,
          channel: info.uploader,
          formats: info.formats ? info.formats.map((f: any) => ({
            format_id: f.format_id,
            ext: f.ext,
            resolution: f.resolution,
            filesize: f.filesize,
            format_note: f.format_note
          })) : [],
        };
        resolve(videoInfo);
      } catch (error) {
        reject(new Error(`Failed to parse video info: ${error}`));
      }
    });
  });
}

export async function downloadVideo({ 
  url, 
  format, 
  onProgress 
}: DownloadVideoOptions): Promise<{ filePath: string, fileName: string }> {
  return new Promise((resolve, reject) => {
    // Create a unique filename based on timestamp
    const timestamp = Date.now();
    const outputTemplate = join(downloadDir, `%(title)s-${timestamp}.%(ext)s`);
    
    // Prepare arguments
    let args = [
      "-f", format,
      "-o", outputTemplate,
      "--no-playlist",
      "--newline"
    ];
    
    // If MP3 format is selected, add extract audio arguments
    if (format.includes("bestaudio[ext=mp3]")) {
      args.push("--extract-audio");
      args.push("--audio-format");
      args.push("mp3");
    }
    
    // Add URL at the end
    args.push(url);
    
    // Execute yt-dlp to download the video
    const ytdlp = spawn(YT_DLP_PATH, args);

    let filePath = "";
    let fileName = "";
    let stderr = "";

    ytdlp.stdout.on("data", (data) => {
      const output = data.toString();
      console.log("yt-dlp output:", output);
      
      // Try to parse download progress
      const progressMatch = output.match(/(\d+\.\d+)%/);
      if (progressMatch && onProgress) {
        const progress = parseFloat(progressMatch[1]);
        onProgress(progress);
      }
      
      // Look for the output filename
      const destinationMatch = output.match(/Destination: (.+)/);
      if (destinationMatch) {
        filePath = destinationMatch[1];
        fileName = basename(filePath);
      }
      
      // Check for MP3 conversion (extract audio)
      const extractAudioMatch = output.match(/\[ExtractAudio\] Destination: (.+)/);
      if (extractAudioMatch) {
        filePath = extractAudioMatch[1];
        fileName = basename(filePath);
        console.log("Extracted audio file path:", filePath);
      }
      
      // Check for completed file
      if (output.includes("[download] 100%")) {
        // Make sure we have the file path
        if (!filePath && output.includes("has already been downloaded")) {
          const existingFileMatch = output.match(/\[download\] (.+) has already been downloaded/);
          if (existingFileMatch) {
            filePath = existingFileMatch[1];
            fileName = basename(filePath);
          }
        }
      }
    });

    ytdlp.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ytdlp.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
      }

      if (!filePath) {
        return reject(new Error("Could not determine the downloaded file path"));
      }

      resolve({ filePath, fileName });
    });
  });
}

export function cleanupFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    unlink(filePath, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export function getFormatLabel(formatValue: string): string {
  const format = formatOptions.find(f => f.value === formatValue);
  return format ? format.label : formatValue;
}
