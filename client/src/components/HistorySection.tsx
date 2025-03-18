import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { DownloadHistory } from "@shared/schema";
import { formatDuration, formatFileSize } from "@/utils/formatHelpers";

interface HistorySectionProps {
  downloadHistory: DownloadHistory[];
  onClearHistory: () => void;
}

export default function HistorySection({ 
  downloadHistory,
  onClearHistory
}: HistorySectionProps) {
  // Create a direct download link
  const handleDownload = (fileName: string) => {
    const downloadUrl = `/api/files/${encodeURIComponent(fileName)}`;
    window.location.href = downloadUrl;
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-md mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Downloads</h2>
          {downloadHistory.length > 0 && (
            <Button 
              variant="ghost"
              className="text-sm text-gray-600 hover:text-primary-600"
              onClick={onClearHistory}
            >
              Clear History
            </Button>
          )}
        </div>
        
        {downloadHistory.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            <p>No download history yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {downloadHistory.map((item) => (
              <li key={item.id} className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden">
                    {item.thumbnail ? (
                      <img 
                        src={item.thumbnail} 
                        alt={`${item.title} thumbnail`} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {item.formatLabel} • {formatDuration(parseInt(item.duration || "0"))}
                      {item.fileSize && ` • ${formatFileSize(item.fileSize)}`}
                    </p>
                  </div>
                  <div className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700">
                    <Button 
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(item.fileName)}
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
