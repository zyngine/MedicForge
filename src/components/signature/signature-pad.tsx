"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui";
import { Trash2, Check, Undo } from "lucide-react";

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel?: () => void;
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
  initialValue?: string;
  label?: string;
  required?: boolean;
}

interface Point {
  x: number;
  y: number;
}

export function SignaturePad({
  onSave,
  onCancel,
  width = 400,
  height = 200,
  penColor = "#000000",
  backgroundColor = "#ffffff",
  initialValue,
  label = "Signature",
  required = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const lastPointRef = useRef<Point | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Load initial value if provided
    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = initialValue;
    }

    // Set drawing styles
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [width, height, penColor, backgroundColor, initialValue]);

  // Get point from event
  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // Save current state for undo
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, imageData]);
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    lastPointRef.current = point;
    setIsDrawing(true);
    saveState();
  }, [getPoint, saveState]);

  // Draw
  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !lastPointRef.current) return;

    const point = getPoint(e);

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
    setHasSignature(true);
  }, [isDrawing, getPoint]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  // Clear canvas
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setHistory([]);
  }, [backgroundColor]);

  // Undo last stroke
  const undo = useCallback(() => {
    if (history.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const previousState = history[history.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setHistory((prev) => prev.slice(0, -1));

    // Check if canvas is empty
    if (history.length <= 1) {
      setHasSignature(false);
    }
  }, [history]);

  // Save signature as base64
  const save = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signature = canvas.toDataURL("image/png");
    onSave(signature);
  }, [onSave]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={history.length === 0}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={!hasSignature}
            title="Clear"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="touch-none cursor-crosshair w-full"
          style={{ maxWidth: width, height: "auto", aspectRatio: `${width}/${height}` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          Sign above using your mouse or finger
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={save}
          disabled={!hasSignature && required}
        >
          <Check className="h-4 w-4 mr-2" />
          Accept Signature
        </Button>
      </div>
    </div>
  );
}

// Display-only signature component
interface SignatureDisplayProps {
  signature: string;
  label?: string;
  signedBy?: string;
  signedAt?: string;
  className?: string;
}

export function SignatureDisplay({
  signature,
  label = "Signature",
  signedBy,
  signedAt,
  className = "",
}: SignatureDisplayProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-muted-foreground">{label}</label>
      <div className="border rounded-lg overflow-hidden bg-white">
        <img
          src={signature}
          alt="Signature"
          className="w-full max-w-[300px] h-auto"
        />
        {(signedBy || signedAt) && (
          <div className="px-3 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
            {signedBy && <span>Signed by: {signedBy}</span>}
            {signedBy && signedAt && <span className="mx-2">•</span>}
            {signedAt && <span>{new Date(signedAt).toLocaleString()}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// Preceptor signature with verification
interface PreceptorSignatureProps {
  onComplete: (data: {
    signature: string;
    name: string;
    credentials: string;
    signedAt: string;
  }) => void;
  onCancel?: () => void;
  preceptorName?: string;
  preceptorCredentials?: string;
}

export function PreceptorSignature({
  onComplete,
  onCancel,
  preceptorName: initialName = "",
  preceptorCredentials: initialCredentials = "",
}: PreceptorSignatureProps) {
  const [name, setName] = useState(initialName);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [_signature, setSignature] = useState<string | null>(null);
  const [step, setStep] = useState<"info" | "sign">("info");

  const handleSignatureSave = (sig: string) => {
    setSignature(sig);
    onComplete({
      signature: sig,
      name,
      credentials,
      signedAt: new Date().toISOString(),
    });
  };

  if (step === "info") {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold">Preceptor Information</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Preceptor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Credentials <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder="e.g., EMT-P, RN, MD"
              required
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={() => setStep("sign")}
            disabled={!name.trim() || !credentials.trim()}
          >
            Continue to Signature
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <span className="text-muted-foreground">Signing as:</span>{" "}
        <strong>{name}</strong> ({credentials})
      </div>
      <SignaturePad
        onSave={handleSignatureSave}
        onCancel={() => setStep("info")}
        label="Preceptor Signature"
        required
      />
      <p className="text-xs text-muted-foreground">
        By signing, I verify that the information provided is accurate and complete
        to the best of my knowledge.
      </p>
    </div>
  );
}
