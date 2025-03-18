import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progress: number;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const roundedProgress = Math.round(progress);
  
  return (
    <Card className="bg-white rounded-lg shadow-md mb-6">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Download Progress</h2>
        <div className="mb-4">
          <Progress value={roundedProgress} className="h-4 bg-gray-200" />
          <div className="flex justify-between mt-1 text-sm text-gray-600">
            <span>Downloading...</span>
            <span>{roundedProgress}%</span>
          </div>
        </div>
        <p className="text-sm text-gray-700">
          Processing video... Please don't close this page.
        </p>
      </CardContent>
    </Card>
  );
}
