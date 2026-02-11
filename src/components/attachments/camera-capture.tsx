"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button, Card } from "@/components/ui";
import { Camera, X, RotateCcw, Check, Upload, Image, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { useStorageQuota } from "@/lib/hooks/use-storage-quota";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (imageUrl: string) => void;
  onCancel?: () => void;
  maxImages?: number;
  storageFolder?: string;
  documentId?: string;
}

export function CameraCapture({
  onCapture,
  onCancel,
  maxImages = 5,
  storageFolder = "attachments",
  documentId,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const { profile } = useUser();
  const supabase = createClient();

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Failed to access camera:", err);
      toast.error("Failed to access camera. Please check permissions.");
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Switch camera
  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, [stopCamera]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Capture image
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  // Retake photo
  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // Upload and save
  const saveImage = useCallback(async () => {
    if (!capturedImage || !profile?.tenant_id) return;

    setIsLoading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Generate filename
      const timestamp = Date.now();
      const filename = `${profile.tenant_id}/${storageFolder}/${documentId || "general"}/${timestamp}.jpg`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filename, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("attachments")
        .getPublicUrl(filename);

      toast.success("Image saved");
      onCapture(publicUrl);
    } catch (err) {
      console.error("Failed to save image:", err);
      toast.error("Failed to save image");
    } finally {
      setIsLoading(false);
    }
  }, [capturedImage, profile?.tenant_id, storageFolder, documentId, supabase, onCapture]);

  return (
    <Card className="p-4 max-w-lg mx-auto">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex justify-center gap-3">
        {!capturedImage ? (
          <>
            <Button variant="outline" onClick={switchCamera}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Switch
            </Button>
            <Button onClick={captureImage}>
              <Camera className="h-4 w-4 mr-2" />
              Capture
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="outline" onClick={retake}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button onClick={saveImage} disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Use Photo
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

// Image upload component
interface ImageUploadProps {
  onUpload: (imageUrl: string) => void;
  maxSize?: number; // MB
  accept?: string;
  storageFolder?: string;
  documentId?: string;
}

export function ImageUpload({
  onUpload,
  maxSize = 10,
  accept = "image/*",
  storageFolder = "attachments",
  documentId,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useUser();
  const supabase = createClient();
  const { canUpload } = useStorageQuota();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.tenant_id) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSize}MB.`);
      return;
    }

    // Check storage quota
    const quotaCheck = await canUpload(file.size);
    if (!quotaCheck.allowed) {
      toast.error(quotaCheck.message || "Storage quota exceeded");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      // Generate filename
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${profile.tenant_id}/${storageFolder}/${documentId || "general"}/${timestamp}.${ext}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("attachments")
        .getPublicUrl(filename);

      toast.success("Image uploaded");
      onUpload(publicUrl);
    } catch (err) {
      console.error("Failed to upload image:", err);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, [profile?.tenant_id, maxSize, storageFolder, documentId, supabase, onUpload, canUpload]);

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full"
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
        ) : (
          <Upload className="h-4 w-4 mr-2" />
        )}
        Upload Image
      </Button>
      {preview && (
        <div className="mt-3 relative">
          <img src={preview} alt="Preview" className="rounded-lg max-h-48 mx-auto" />
        </div>
      )}
    </div>
  );
}

// Attachment gallery component
interface AttachmentGalleryProps {
  attachments: string[];
  onRemove?: (index: number) => void;
  editable?: boolean;
}

export function AttachmentGallery({
  attachments,
  onRemove,
  editable = false,
}: AttachmentGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (attachments.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No attachments</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {attachments.map((url, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group"
            onClick={() => setSelectedImage(url)}
          >
            <img src={url} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover" />
            {editable && onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}

// Combined capture/upload component
interface ImageAttachmentProps {
  attachments: string[];
  onChange: (attachments: string[]) => void;
  maxImages?: number;
  storageFolder?: string;
  documentId?: string;
  allowCamera?: boolean;
  allowUpload?: boolean;
}

export function ImageAttachment({
  attachments,
  onChange,
  maxImages = 5,
  storageFolder = "attachments",
  documentId,
  allowCamera = true,
  allowUpload = true,
}: ImageAttachmentProps) {
  const [showCamera, setShowCamera] = useState(false);

  const handleCapture = useCallback((url: string) => {
    if (attachments.length < maxImages) {
      onChange([...attachments, url]);
    }
    setShowCamera(false);
  }, [attachments, maxImages, onChange]);

  const handleUpload = useCallback((url: string) => {
    if (attachments.length < maxImages) {
      onChange([...attachments, url]);
    }
  }, [attachments, maxImages, onChange]);

  const handleRemove = useCallback((index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    onChange(newAttachments);
  }, [attachments, onChange]);

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onCancel={() => setShowCamera(false)}
        maxImages={maxImages}
        storageFolder={storageFolder}
        documentId={documentId}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AttachmentGallery
        attachments={attachments}
        onRemove={handleRemove}
        editable
      />

      {attachments.length < maxImages && (
        <div className="flex gap-3">
          {allowCamera && (
            <Button
              variant="outline"
              onClick={() => setShowCamera(true)}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
          )}
          {allowUpload && (
            <div className="flex-1">
              <ImageUpload
                onUpload={handleUpload}
                storageFolder={storageFolder}
                documentId={documentId}
              />
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {attachments.length}/{maxImages} images attached
      </p>
    </div>
  );
}
