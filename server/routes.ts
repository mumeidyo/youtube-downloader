import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { downloadRequestSchema, formatOptions, InsertDownloadHistory, VideoInfo } from "@shared/schema";
import { fetchVideoInfo, downloadVideo, getFormatLabel } from "./ytdlp";
import { join } from "path";
import { createReadStream, stat, existsSync } from "fs";
import { promisify } from "util";
import { WebSocketServer } from 'ws';

const statAsync = promisify(stat);

export async function registerRoutes(app: Express): Promise<Server> {
  // API route for getting format options
  app.get("/api/formats", (_req: Request, res: Response) => {
    res.json(formatOptions);
  });

  // API route for fetching video info
  app.get("/api/info", async (req: Request, res: Response) => {
    const url = req.query.url as string;
    
    if (!url) {
      return res.status(400).json({ message: "URL is required" });
    }

    try {
      const videoInfo = await fetchVideoInfo({ url });
      res.json(videoInfo);
    } catch (error) {
      console.error("Error fetching video info:", error);
      res.status(500).json({ 
        message: "Failed to fetch video information",
        error: (error as Error).message
      });
    }
  });

  // API route for downloading videos
  app.post("/api/download", async (req: Request, res: Response) => {
    try {
      const validatedData = downloadRequestSchema.parse(req.body);
      const { url, format } = validatedData;
      
      // Get video info before downloading
      const videoInfo = await fetchVideoInfo({ url });
      const formatLabel = getFormatLabel(format);
      
      // Progress and state are handled via WebSocket, send initial response
      res.json({ 
        message: "Download started",
        videoInfo,
        formatLabel
      });
    } catch (error) {
      console.error("Error starting download:", error);
      res.status(400).json({ 
        message: "Invalid download request",
        error: (error as Error).message 
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server on a separate path to avoid conflicts with Vite
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws' 
  });
  
  wss.on('connection', (ws: any) => {
    ws.on('message', async (message: string) => {
      try {
        const { action, data } = JSON.parse(message);
        
        if (action === 'download') {
          const { url, format } = downloadRequestSchema.parse(data);
          
          try {
            // Start the download
            console.log(`Fetching video info for URL: ${url}`);
            let videoInfo: VideoInfo;
            
            try {
              videoInfo = await fetchVideoInfo({ url });
              console.log(`Successfully fetched video info for: ${videoInfo.title}`);
              
              // Send initial info
              ws.send(JSON.stringify({
                type: 'video_info',
                videoInfo
              }));
            } catch (infoError) {
              console.error("Error fetching video info:", infoError);
              ws.send(JSON.stringify({
                type: 'error',
                message: `Failed to fetch video information: ${(infoError as Error).message}`,
                step: 'video_info'
              }));
              return; // Exit early if we couldn't get video info
            }
            
            // Start downloading with progress callback
            console.log(`Starting download with format: ${format}`);
            let downloadResult: { filePath: string, fileName: string };
            
            try {
              downloadResult = await downloadVideo({
                url,
                format,
                onProgress: (progress) => {
                  ws.send(JSON.stringify({
                    type: 'progress',
                    progress
                  }));
                }
              });
              console.log(`Download completed: ${downloadResult.fileName}`);
            } catch (downloadError) {
              console.error("Error downloading video:", downloadError);
              ws.send(JSON.stringify({
                type: 'error',
                message: `Download failed: ${(downloadError as Error).message}`,
                step: 'download'
              }));
              return; // Exit early if download failed
            }
            
            // Get format label for storing in history
            const formatLabel = getFormatLabel(format);
            
            // Add to download history
            const historyEntry: InsertDownloadHistory = {
              url,
              title: videoInfo.title,
              thumbnail: videoInfo.thumbnail || null,
              format,
              formatLabel,
              duration: videoInfo.duration?.toString() || null,
              fileSize: null,  // Could get this from file stat
              fileName: downloadResult.fileName,
              downloadPath: downloadResult.filePath,
            };
            
            try {
              await storage.addToDownloadHistory(historyEntry);
              console.log(`Added to download history: ${videoInfo.title}`);
            } catch (historyError) {
              console.error("Error adding to history:", historyError);
              // Continue even if history update fails
            }
            
            // Send success message
            ws.send(JSON.stringify({
              type: 'complete',
              fileName: downloadResult.fileName,
              downloadPath: downloadResult.filePath
            }));
            
          } catch (error) {
            console.error("Unexpected download error:", error);
            ws.send(JSON.stringify({
              type: 'error',
              message: `An unexpected error occurred: ${(error as Error).message}`,
              step: 'unknown'
            }));
          }
        } else if (action === 'clearHistory') {
          await storage.clearDownloadHistory();
          ws.send(JSON.stringify({
            type: 'history_cleared'
          }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({
          type: 'error',
          message: (error as Error).message
        }));
      }
    });
  });

  // API route for getting download history
  app.get("/api/history", async (_req: Request, res: Response) => {
    try {
      const history = await storage.getDownloadHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ 
        message: "Failed to fetch download history",
        error: (error as Error).message
      });
    }
  });

  // API route for clearing download history
  app.delete("/api/history", async (_req: Request, res: Response) => {
    try {
      await storage.clearDownloadHistory();
      res.json({ message: "Download history cleared" });
    } catch (error) {
      console.error("Error clearing history:", error);
      res.status(500).json({ 
        message: "Failed to clear download history",
        error: (error as Error).message
      });
    }
  });

  // API route for file downloads
  app.get("/api/files/:fileName", async (req: Request, res: Response) => {
    try {
      const fileName = req.params.fileName;
      const downloadDir = join(process.cwd(), "temp-downloads");
      const filePath = join(downloadDir, fileName);
      
      console.log(`File download requested: ${fileName}`);
      console.log(`Full path: ${filePath}`);
      
      // Check if download directory exists
      if (!existsSync(downloadDir)) {
        console.error(`Download directory does not exist: ${downloadDir}`);
        return res.status(500).json({ 
          message: "Download directory does not exist",
          path: downloadDir
        });
      }
      
      // Check if file exists
      if (!existsSync(filePath)) {
        console.error(`File does not exist: ${filePath}`);
        return res.status(404).json({ 
          message: "File not found",
          path: filePath
        });
      }
      
      try {
        // Check if we can access the file
        const fileStat = await statAsync(filePath);
        console.log(`File size: ${fileStat.size} bytes`);
        
        // Set headers
        res.setHeader('Content-Length', fileStat.size);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);
        
        // Stream the file
        const fileStream = createReadStream(filePath);
        
        fileStream.on('error', (streamError) => {
          console.error(`Error streaming file: ${streamError.message}`);
          // Only send error if headers haven't been sent
          if (!res.headersSent) {
            res.status(500).json({ 
              message: "Error streaming file",
              error: streamError.message
            });
          } else {
            // If headers were already sent, just end the response
            res.end();
          }
        });
        
        fileStream.pipe(res);
      } catch (statError) {
        console.error(`Error accessing file stats: ${statError}`);
        return res.status(500).json({ 
          message: "File exists but cannot be accessed",
          error: (statError as Error).message
        });
      }
    } catch (error) {
      console.error("Unexpected error in file download route:", error);
      res.status(500).json({ 
        message: "Unexpected error processing file download",
        error: (error as Error).message
      });
    }
  });
  
  return httpServer;
}
