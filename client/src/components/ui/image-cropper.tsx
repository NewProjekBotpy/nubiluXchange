import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RotateCw, ZoomIn, ZoomOut, Crop, X } from "lucide-react";

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedImage: string) => void;
  imageFile: File | null;
  aspectRatio?: number; // width/height, e.g., 1 for square, 4 for banner
  title: string;
}

export default function ImageCropper({ 
  isOpen, 
  onClose, 
  onCrop, 
  imageFile, 
  aspectRatio = 1, 
  title 
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // Load image when file changes
  useEffect(() => {
    if (imageFile && isOpen) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsImageLoaded(false);
      
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile, isOpen]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    drawCanvas();
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !isImageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on aspect ratio
    const canvasSize = 300;
    const canvasWidth = aspectRatio >= 1 ? canvasSize : canvasSize * aspectRatio;
    const canvasHeight = aspectRatio >= 1 ? canvasSize / aspectRatio : canvasSize;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Apply transformations
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(position.x, position.y);

    // Draw image centered
    const imageAspect = image.naturalWidth / image.naturalHeight;
    let drawWidth, drawHeight;
    
    if (imageAspect > aspectRatio) {
      drawHeight = canvasHeight / scale;
      drawWidth = drawHeight * imageAspect;
    } else {
      drawWidth = canvasWidth / scale;
      drawHeight = drawWidth / imageAspect;
    }

    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    
    ctx.restore();
  }, [scale, rotation, position, aspectRatio, isImageLoaded]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create final crop canvas
    const outputSize = aspectRatio >= 1 ? 800 : 400;
    const outputWidth = aspectRatio >= 1 ? outputSize : outputSize * aspectRatio;
    const outputHeight = aspectRatio >= 1 ? outputSize / aspectRatio : outputSize;
    
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputWidth;
    outputCanvas.height = outputHeight;
    
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    // Draw the cropped area to output canvas
    outputCtx.drawImage(
      canvas,
      0, 0, canvas.width, canvas.height,
      0, 0, outputWidth, outputHeight
    );

    // Convert to data URL with compression
    const croppedImage = outputCanvas.toDataURL('image/jpeg', 0.8);
    onCrop(croppedImage);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="bg-nxe-card border-nxe-surface/30 max-w-md w-full p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-white text-lg flex items-center justify-between">
            {title}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0 text-nxe-text hover:text-white"
              data-testid="button-close-cropper"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Canvas Area */}
          <div className="flex justify-center">
            <div className="relative border-2 border-nxe-border rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="block cursor-move"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                data-testid="canvas-crop-area"
              />
              {!isImageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-nxe-surface/50">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nxe-primary"></div>
                </div>
              )}
            </div>
          </div>

          {/* Hidden image for loading */}
          <img
            ref={imageRef}
            src={imageUrl}
            onLoad={handleImageLoad}
            className="hidden"
            alt="Source"
          />

          {/* Controls */}
          <div className="space-y-3">
            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-nxe-text">Zoom</label>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    className="h-8 w-8 p-0 text-nxe-text hover:text-white"
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setScale(Math.min(3, scale + 0.1))}
                    className="h-8 w-8 p-0 text-nxe-text hover:text-white"
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[scale]}
                onValueChange={(value) => setScale(value[0])}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
                data-testid="slider-zoom"
              />
            </div>

            {/* Rotation Control */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-nxe-text">Rotasi</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-8 w-8 p-0 text-nxe-text hover:text-white"
                data-testid="button-rotate"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 bg-transparent border-nxe-border text-nxe-text hover:bg-nxe-surface hover:text-white"
              data-testid="button-cancel-crop"
            >
              Batal
            </Button>
            <Button
              onClick={handleCrop}
              disabled={!isImageLoaded}
              className="flex-1 bg-nxe-primary hover:bg-nxe-primary/90 text-white"
              data-testid="button-confirm-crop"
            >
              <Crop className="h-4 w-4 mr-2" />
              Potong
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}