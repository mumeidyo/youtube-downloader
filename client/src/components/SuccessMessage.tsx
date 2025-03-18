import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessMessageProps {
  message: string;
  fileName: string;
}

export default function SuccessMessage({ message, fileName }: SuccessMessageProps) {
  if (!message) return null;
  
  const handleFileDownload = () => {
    // Create a link to the file download endpoint
    const downloadUrl = `/api/files/${encodeURIComponent(fileName)}`;
    window.location.href = downloadUrl;
  };
  
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <Check className="h-5 w-5 text-green-500" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">Success</h3>
          <div className="mt-2 text-sm text-green-700">
            <p>{message}</p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <Button 
                onClick={handleFileDownload}
                className="bg-green-100 px-4 py-2 rounded-md text-sm font-medium text-green-800 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Download File
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
