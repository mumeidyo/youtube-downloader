import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadRequestSchema } from "@shared/schema";
import { Download } from "lucide-react";

const formSchema = downloadRequestSchema.extend({});

interface DownloadFormProps {
  url: string;
  setUrl: (url: string) => void;
  selectedFormat: string;
  setSelectedFormat: (format: string) => void;
  formats: { value: string; label: string }[];
  onDownload: () => void;
}

export default function DownloadForm({
  url,
  setUrl,
  selectedFormat,
  setSelectedFormat,
  formats,
  onDownload
}: DownloadFormProps) {
  const [urlError, setUrlError] = useState("");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: url,
      format: selectedFormat
    }
  });
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    
    // Simple URL validation for visual feedback
    if (value && !value.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)\/.*$/)) {
      setUrlError("Please enter a valid video URL");
    } else {
      setUrlError("");
    }
    
    form.setValue("url", value);
  };
  
  const handleFormatChange = (value: string) => {
    setSelectedFormat(value);
    form.setValue("format", value);
  };
  
  const handleSubmit = form.handleSubmit(() => {
    onDownload();
  });
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Video URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="block w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={url}
                      onChange={handleUrlChange}
                    />
                  </FormControl>
                  {urlError && <p className="mt-1 text-sm text-red-600">{urlError}</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-6">
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Format</FormLabel>
                  <Select
                    value={selectedFormat}
                    onValueChange={handleFormatChange}
                  >
                    <FormControl>
                      <SelectTrigger className="block w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {formats.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm transition-colors duration-200"
            >
              <Download className="h-5 w-5 mr-2" />
              Download
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
