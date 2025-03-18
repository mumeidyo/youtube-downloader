import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import DownloadForm from "@/components/DownloadForm";
import VideoPreview from "@/components/VideoPreview";
import ProgressIndicator from "@/components/ProgressIndicator";
import ErrorMessage from "@/components/ErrorMessage";
import SuccessMessage from "@/components/SuccessMessage";
import HistorySection from "@/components/HistorySection";
import Footer from "@/components/Footer";
import { formatOptions, VideoInfo, DownloadHistory } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [downloadedFileName, setDownloadedFileName] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  
  // Fetch format options
  const { data: formats = formatOptions } = useQuery<{ value: string; label: string; }[]>({
    queryKey: ["/api/formats"],
  });
  
  // Fetch download history
  const { 
    data: downloadHistory = [], 
    refetch: refetchHistory 
  } = useQuery<DownloadHistory[]>({
    queryKey: ["/api/history"],
  });
  
  // Connect to WebSocket
  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch(message.type) {
        case 'video_info':
          setVideoInfo(message.videoInfo);
          break;
        case 'progress':
          setDownloadProgress(message.progress);
          break;
        case 'complete':
          setIsProcessing(false);
          setSuccessMessage("Video downloaded successfully!");
          setDownloadedFileName(message.fileName);
          setErrorMessage("");
          refetchHistory();
          break;
        case 'error':
          setIsProcessing(false);
          setErrorMessage(message.message);
          setSuccessMessage("");
          break;
        case 'history_cleared':
          refetchHistory();
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the server. Please try again.",
        variant: "destructive"
      });
    };
    
    wsRef.current = ws;
    
    // Cleanup on component unmount
    return () => {
      ws.close();
    };
  }, [toast, refetchHistory]);
  
  // Function to fetch video info when URL changes
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (url && url.trim() !== "") {
        try {
          const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
          if (response.ok) {
            const data = await response.json();
            setVideoInfo(data);
            setErrorMessage("");
          } else {
            const error = await response.json();
            setVideoInfo(null);
            if (error.message) {
              setErrorMessage(error.message);
            }
          }
        } catch (error) {
          console.error("Error fetching video info:", error);
          setVideoInfo(null);
        }
      } else {
        setVideoInfo(null);
      }
    }, 500);
    
    return () => clearTimeout(debounceTimer);
  }, [url]);
  
  // Handle download submission
  const handleDownload = () => {
    if (!url) {
      setErrorMessage("Please enter a video URL");
      return;
    }
    
    if (!selectedFormat) {
      setErrorMessage("Please select a video format");
      return;
    }
    
    // Reset states
    setErrorMessage("");
    setSuccessMessage("");
    setDownloadProgress(0);
    setIsProcessing(true);
    
    // Send download request via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'download',
        data: {
          url,
          format: selectedFormat
        }
      }));
    } else {
      setErrorMessage("WebSocket connection not available. Please refresh the page.");
      setIsProcessing(false);
    }
  };
  
  // Handle clearing history
  const handleClearHistory = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'clearHistory'
      }));
      toast({
        title: "Success",
        description: "Download history cleared"
      });
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Web Video Downloader</h1>
          <p className="text-gray-600">Download videos from YouTube and other platforms</p>
        </header>
        
        <DownloadForm 
          url={url}
          setUrl={setUrl}
          selectedFormat={selectedFormat}
          setSelectedFormat={setSelectedFormat}
          formats={formats as { value: string; label: string; }[]}
          onDownload={handleDownload}
        />
        
        {videoInfo && !isProcessing && !successMessage && (
          <VideoPreview videoInfo={videoInfo} />
        )}
        
        {isProcessing && (
          <ProgressIndicator progress={downloadProgress} />
        )}
        
        {errorMessage && !isProcessing && (
          <ErrorMessage message={errorMessage} />
        )}
        
        {successMessage && !isProcessing && (
          <SuccessMessage 
            message={successMessage} 
            fileName={downloadedFileName} 
          />
        )}
        
        <HistorySection 
          downloadHistory={downloadHistory} 
          onClearHistory={handleClearHistory}
        />
        
        <Footer />
      </div>
    </div>
  );
}
