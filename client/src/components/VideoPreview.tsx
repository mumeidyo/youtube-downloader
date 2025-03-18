import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { VideoInfo } from "@shared/schema";
import { formatDuration } from "@/utils/formatHelpers";

interface VideoPreviewProps {
  videoInfo: VideoInfo;
}

export default function VideoPreview({ videoInfo }: VideoPreviewProps) {
  if (!videoInfo) return null;

  return (
    <Card className="bg-white rounded-lg shadow-md p-1 mb-6">
      <CardContent className="p-5">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Video Information</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-1/3 flex-shrink-0">
            {videoInfo.thumbnail && (
              <img
                src={videoInfo.thumbnail}
                alt="Video thumbnail"
                className="w-full h-auto rounded-md"
              />
            )}
          </div>
          <div className="md:w-2/3">
            <h3 className="text-lg font-medium text-gray-800 mb-1">{videoInfo.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{videoInfo.channel}</p>
            <div className="flex items-center text-sm text-gray-500 mb-3">
              <Clock className="h-4 w-4 mr-1" />
              <span>{formatDuration(videoInfo.duration || 0)}</span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-3">{videoInfo.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
