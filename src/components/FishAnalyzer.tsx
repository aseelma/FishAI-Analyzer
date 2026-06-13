import React, { useState, useRef, useEffect } from 'react';
import { Upload, Link as LinkIcon, Fish, Scale, Ruler, AlertCircle, Loader2, X, ChevronRight, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { analyzeFishImage, FishAnalysisResult } from '@/src/lib/gemini';
import { cn } from '@/lib/utils';

export default function FishAnalyzer() {
  const [image, setImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FishAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setResult(null);
      setError(null);
      setAspectRatio(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;
    try {
      // Basic validation
      new URL(imageUrl);
      setImage(imageUrl);
      setResult(null);
      setError(null);
      setAspectRatio(null);
    } catch (err) {
      setError('Invalid URL. Please provide a valid image link.');
    }
  };

  const startAnalysis = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      let base64Data = '';
      let mimeType = 'image/jpeg';

      if (image.startsWith('data:')) {
        const parts = image.split(',');
        mimeType = parts[0].split(':')[1].split(';')[0];
        base64Data = parts[1];
      } else {
        // Fetch image through proxy to avoid CORS issues
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(image)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Failed to fetch image through proxy');
        
        const blob = await response.blob();
        mimeType = blob.type;
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(blob);
        });
      }

      const analysis = await analyzeFishImage(base64Data, mimeType, image.startsWith('data:') ? undefined : image);
      setResult(analysis);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('JSON')) {
        setError('Analysis interrupted. Please try clicking "Start AI Analysis" again.');
      } else {
        setError('Failed to analyze image. Please try again with a different image.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageUrl('');
    setResult(null);
    setError(null);
    setAspectRatio(null);
  };

  const swapSpecies = (fishIndex: number, alternativeIndex: number) => {
    if (!result) return;
    
    const newResult = { ...result };
    const newFishList = [...newResult.fish];
    const fish = { ...newFishList[fishIndex] };
    
    if (!fish.possible_species) return;
    
    const alternative = fish.possible_species[alternativeIndex];
    const oldPrimary = { name: fish.species, confidence: fish.confidence };
    
    fish.species = alternative.name;
    fish.confidence = alternative.confidence;
    fish.possible_species[alternativeIndex] = oldPrimary;
    
    newFishList[fishIndex] = fish;
    newResult.fish = newFishList;
    setResult(newResult);
  };

  const fishList = React.useMemo(() => {
    return result?.fish || [];
  }, [result]);

  return (
    <div className="max-w-7xl mx-auto min-h-screen lg:h-screen flex flex-col p-3 md:p-6 lg:overflow-hidden">
      <header className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-blue-600 rounded-lg md:rounded-xl shadow-lg shadow-blue-600/20">
            <Fish className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-none">FishAI Analyzer</h1>
            <p className="text-[10px] md:text-xs text-slate-500 font-medium mt-1">Professional Marine Intelligence</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {image && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={reset}
              className="rounded-lg md:rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 gap-1.5 md:gap-2 h-8 md:h-10"
            >
              <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden xs:inline">Reset</span>
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 lg:min-h-0">
        {/* Left Column: Input & Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4 md:gap-6 lg:min-h-0">
          <Card className="border-none shadow-xl shadow-blue-500/5 bg-white/80 backdrop-blur-sm overflow-hidden flex flex-col lg:min-h-0 shrink-0 lg:shrink">
            <CardContent className="p-0 flex flex-col lg:min-h-0">
              {!image ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "min-h-[300px] lg:flex-1 flex flex-col items-center justify-center space-y-4 p-8 md:p-12 transition-all duration-300 cursor-pointer",
                    dragActive ? "bg-blue-50" : "hover:bg-slate-50/50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                  <div className="p-5 md:p-6 bg-blue-50 rounded-full">
                    <Upload className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-base md:text-lg font-semibold text-slate-900">Upload your catch</p>
                    <p className="text-xs md:text-sm text-slate-500">Drag and drop or click to browse</p>
                  </div>
                </div>
              ) : (
                <div className="relative bg-slate-900 flex items-center justify-center overflow-hidden min-h-[350px] lg:flex-1">
                  <div 
                    className="relative"
                    style={{ 
                      aspectRatio: aspectRatio ? `${aspectRatio}` : 'auto',
                      maxHeight: '100%',
                      maxWidth: '100%'
                    }}
                  >
                    <img
                      ref={imageRef}
                      src={image.startsWith('data:') ? image : `/api/proxy-image?url=${encodeURIComponent(image)}`}
                      alt="Preview"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setAspectRatio(img.naturalWidth / img.naturalHeight);
                      }}
                      className="block w-full h-full object-contain max-h-[60vh] lg:max-h-[calc(100vh-280px)]"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </CardContent>
            
            <div className="p-3 md:p-4 bg-white border-t border-slate-100 shrink-0">
              {!result ? (
                <div className="space-y-3 md:space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />
                      <Input
                        placeholder="Paste image URL..."
                        className="pl-9 md:pl-10 rounded-lg md:rounded-xl border-slate-200 focus:ring-blue-500 h-9 md:h-10 text-sm"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                      />
                    </div>
                    <Button type="button" variant="secondary" className="rounded-lg md:rounded-xl px-4 md:px-6 h-9 md:h-10 text-sm" onClick={handleUrlSubmit}>
                      Load
                    </Button>
                  </div>
                  <Button
                    className="w-full h-10 md:h-12 rounded-lg md:rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-600/20 text-sm md:text-base"
                    disabled={!image || isAnalyzing}
                    onClick={startAnalysis}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Start AI Analysis'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar">
                    <div className="flex flex-col shrink-0">
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Count</span>
                      <span className="text-lg md:text-xl font-bold text-slate-900">{result.total_count} Fish</span>
                    </div>
                    <div className="w-px h-8 md:h-10 bg-slate-100 shrink-0" />
                    <div className="flex flex-col shrink-0">
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Weight</span>
                      <span className="text-lg md:text-xl font-bold text-slate-900">{result.total_weight_kg.toFixed(2)} kg</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={reset} className="rounded-lg md:rounded-xl border-slate-200 h-8 md:h-10 shrink-0">
                    New
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-5 flex flex-col pb-10 lg:pb-0 lg:min-h-0 shrink-0 lg:shrink">
          {!result ? (
            <div
              className="min-h-[200px] lg:flex-1 flex flex-col items-center justify-center text-center p-6 md:p-8 border-2 border-dashed border-slate-200 rounded-2xl md:rounded-3xl bg-slate-50/50"
            >
              <div className="p-4 md:p-6 bg-white rounded-full shadow-sm mb-3 md:mb-4">
                <Maximize2 className="w-8 h-8 md:w-10 md:h-10 text-slate-300" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-slate-900">Analysis Results</h3>
              <p className="text-slate-500 text-xs md:text-sm max-w-xs">
                Detailed species data and measurements will appear here after analysis.
              </p>
            </div>
          ) : (
            <div
              className="flex flex-col lg:flex-1 lg:min-h-0 shrink-0 lg:shrink"
            >
              <Card className="border-none shadow-xl shadow-blue-500/5 bg-white overflow-hidden flex flex-col lg:flex-1 lg:min-h-0 shrink-0 lg:shrink">
                  <CardHeader className="shrink-0 pb-3 md:pb-4 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base md:text-lg">Detected Species</CardTitle>
                      <Badge className="bg-blue-50 text-blue-600 border-none text-[10px] md:text-xs">
                        {result.fish.length} Items
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                      {fishList.map((f, i) => (
                        <div
                          key={i}
                          className="p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 bg-white hover:border-blue-200 transition-all shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-2 md:mb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-slate-900 text-white text-[9px] md:text-[10px] font-bold rounded-md md:rounded-lg">
                                    {i + 1}
                                  </span>
                                  {f.count > 1 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[8px] font-bold px-1 rounded-full border border-white">
                                      x{f.count}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <h4 className="text-sm md:text-lg font-bold text-slate-900 leading-tight">
                                    {f.species.length > 50 ? f.species.substring(0, 50) + '...' : f.species}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] md:text-[10px] text-blue-600 font-semibold italic uppercase tracking-wider">{f.family}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wider">{f.group}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1 bg-slate-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                                  <Ruler className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" /> ~{f.estimated_length_cm.toFixed(2)}cm
                                </span>
                                <span className="flex items-center gap-1 bg-slate-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md">
                                  <Scale className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" /> ~{f.estimated_weight_kg.toFixed(2)}kg
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className={cn(
                                "text-[10px] md:text-sm font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg inline-block",
                                f.confidence > 0.8 ? "bg-emerald-50 text-emerald-600" : 
                                f.confidence > 0.5 ? "bg-amber-50 text-amber-600" : 
                                "bg-red-50 text-red-600"
                              )}>
                                {(f.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>

                          {f.possible_species && f.possible_species.length > 0 && (
                            <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-slate-50 flex flex-wrap gap-1 md:gap-1.5 items-center">
                               <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase mr-1">Maybe also (click to swap):</span>
                              {f.possible_species
                                .filter(ps => 
                                  ps?.name &&
                                  ps.name.length < 50 && 
                                  !ps.name.includes('{') && 
                                  !ps.name.includes('[') &&
                                  !ps.name.toLowerCase().includes('instruction') &&
                                  !ps.name.toLowerCase().includes('list') &&
                                  !ps.name.toLowerCase().includes('confidence') &&
                                  !ps.name.toLowerCase().includes('value') &&
                                  !ps.name.toLowerCase().includes('number')
                                )
                                .map((ps, j) => (
                                <Badge 
                                  key={j} 
                                  variant="secondary" 
                                  className="text-[8px] md:text-[10px] font-medium bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 cursor-pointer border-none px-1.5 md:px-2 py-0 flex items-center gap-1 transition-colors"
                                  onClick={() => swapSpecies(i, j)}
                                >
                                  {ps.name}
                                  {ps.confidence && (
                                    <span className="text-[7px] md:text-[8px] opacity-60 font-bold">
                                      {(ps.confidence * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
