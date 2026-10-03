import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Link2,
  Image as ImageIcon,
  QrCode,
  Layers,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  X,
  FileCode2,
  Info,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { decodeQrFromDataUrl } from '../utils/qrDecoder';
import { analyzeUrlStructure } from '../utils/urlAnalyzer';
import { URLStructuralAnalysis } from '../types/investigation';

export interface InvestigationInputPayload {
  messageText: string;
  urlText: string;
  screenshotBase64?: {
    mimeType: string;
    data: string;
    previewUrl: string;
    fileName: string;
  };
  qrScreenshotBase64?: {
    mimeType: string;
    data: string;
    previewUrl: string;
    fileName: string;
  };
  qrDecodedText?: string;
}

interface HomeInputViewProps {
  onStartInvestigation: (payload: InvestigationInputPayload) => void;
  isLoading: boolean;
  initialTab?: TabType;
  onReturnToDashboard?: () => void;
}

type TabType = 'message' | 'url' | 'screenshot' | 'qr' | 'combined';

export const HomeInputView: React.FC<HomeInputViewProps> = ({
  onStartInvestigation,
  isLoading,
  initialTab = 'message',
  onReturnToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Input states
  const [messageInput, setMessageInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [screenshotData, setScreenshotData] = useState<{
    mimeType: string;
    data: string;
    previewUrl: string;
    fileName: string;
  } | null>(null);

  const [qrScreenshotData, setQrScreenshotData] = useState<{
    mimeType: string;
    data: string;
    previewUrl: string;
    fileName: string;
  } | null>(null);

  const [qrDecodedValue, setQrDecodedValue] = useState<string>('');
  const [qrDecodingStatus, setQrDecodingStatus] = useState<string>('');
  const [qrDecodeError, setQrDecodeError] = useState<string>('');

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // File input refs
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Quick live structural breakdown of URL when typed
  const [liveUrlAnalysis, setLiveUrlAnalysis] = useState<URLStructuralAnalysis | null>(null);

  useEffect(() => {
    if (urlInput.trim()) {
      setLiveUrlAnalysis(analyzeUrlStructure(urlInput.trim()));
    } else {
      setLiveUrlAnalysis(null);
    }
  }, [urlInput]);

  // Handle image files
  const handleScreenshotFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64Data = dataUrl.split(',')[1];
      setScreenshotData({
        mimeType: file.type,
        data: base64Data,
        previewUrl: dataUrl,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleQrFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image containing a QR code.');
      return;
    }
    setQrDecodingStatus('Processing QR matrix locally via Canvas...');
    setQrDecodeError('');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const base64Data = dataUrl.split(',')[1];
      setQrScreenshotData({
        mimeType: file.type,
        data: base64Data,
        previewUrl: dataUrl,
        fileName: file.name,
      });

      // Genuine client-side QR decode
      const result = await decodeQrFromDataUrl(dataUrl);
      if (result.success && result.data) {
        setQrDecodedValue(result.data);
        setQrDecodingStatus('QR matrix decoded successfully.');
        setQrDecodeError('');
        // If it's a URL, also populate the URL field automatically if empty
        if (/^https?:\/\//i.test(result.data) && !urlInput) {
          setUrlInput(result.data);
        }
      } else {
        setQrDecodingStatus('');
        setQrDecodeError(result.error || 'No readable QR matrix detected in this image.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (activeTab === 'qr') {
        handleQrFile(file);
      } else {
        handleScreenshotFile(file);
        if (activeTab !== 'combined') {
          setActiveTab('screenshot');
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };



  // Check if at least one input is provided
  const hasValidInput = Boolean(
    messageInput.trim() ||
    urlInput.trim() ||
    screenshotData ||
    qrScreenshotData ||
    qrDecodedValue.trim()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValidInput || isLoading) return;

    onStartInvestigation({
      messageText: messageInput.trim(),
      urlText: urlInput.trim(),
      screenshotBase64: screenshotData || undefined,
      qrScreenshotBase64: qrScreenshotData || undefined,
      qrDecodedText: qrDecodedValue.trim() || undefined,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-950/40 text-blue-300 text-xs font-medium mb-4">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          <span>Objective Security Evidence Engine</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          TRACE<span className="text-blue-500">ZERO</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-300 font-normal">
          Understand what you're about to trust.
        </p>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl mx-auto">
          Grounded multimodal forensic analysis. Zero fabricated reputation scores, zero synthetic blacklists, and zero hallucinated domain age.
        </p>
      </div>

      {/* Main Analysis Input Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-2 pt-2 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('message')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium rounded-t-xl transition-all border-b-2 ${
              activeTab === 'message'
                ? 'border-blue-500 bg-slate-900 text-white shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>Message</span>
            {messageInput.trim() && (
              <span className="w-2 h-2 rounded-full bg-blue-400 ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium rounded-t-xl transition-all border-b-2 ${
              activeTab === 'url'
                ? 'border-blue-500 bg-slate-900 text-white shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Link2 className="w-4 h-4 text-emerald-400" />
            <span>URL</span>
            {urlInput.trim() && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('screenshot')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium rounded-t-xl transition-all border-b-2 ${
              activeTab === 'screenshot'
                ? 'border-blue-500 bg-slate-900 text-white shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>Screenshot</span>
            {screenshotData && (
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium rounded-t-xl transition-all border-b-2 ${
              activeTab === 'qr'
                ? 'border-blue-500 bg-slate-900 text-white shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <QrCode className="w-4 h-4 text-purple-400" />
            <span>QR Screenshot</span>
            {(qrScreenshotData || qrDecodedValue) && (
              <span className="w-2 h-2 rounded-full bg-purple-400 ml-1" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('combined')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium rounded-t-xl transition-all border-b-2 ml-auto ${
              activeTab === 'combined'
                ? 'border-blue-500 bg-slate-900 text-white shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Combined Mode</span>
          </button>
        </div>

        {/* Tab Contents */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* TAB 1: MESSAGE */}
          {activeTab === 'message' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Suspicious Message / Email / Chat Text
                </label>
                <span className="text-[11px] text-slate-400">
                  {messageInput.length} characters
                </span>
              </div>
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Paste the suspicious text here (e.g., an SMS claiming your account is locked, an unexpected invoice notice, or an IT security notification)..."
                rows={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm leading-relaxed resize-y font-mono"
              />
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Tip: You can include any links directly within the message text or under the URL tab.</span>
                {messageInput && (
                  <button
                    type="button"
                    onClick={() => setMessageInput('')}
                    className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                  >
                    Clear text
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: URL */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-2">
                  Suspicious Target URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://secure-login.example-portal.com/auth..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-mono pr-10"
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => setUrlInput('')}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Real-time local structural inspection preview */}
              {liveUrlAnalysis && liveUrlAnalysis.isValidUrl && (
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 text-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                      Instant Local RFC Structure Inspection:
                    </span>
                    <span className="text-[10px] text-slate-400">Zero network queries</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-400 block">Protocol</span>
                      <span className={`font-mono font-medium ${liveUrlAnalysis.protocol === 'http:' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {liveUrlAnalysis.protocol || 'None'}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-400 block">Hostname</span>
                      <span className="font-mono font-medium text-slate-200 truncate block">
                        {liveUrlAnalysis.hostname}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-400 block">Subdomain Depth</span>
                      <span className="font-mono font-medium text-slate-200">
                        {liveUrlAnalysis.subdomainDepth} level{liveUrlAnalysis.subdomainDepth !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-400 block">IP Hostname</span>
                      <span className={`font-mono font-medium ${liveUrlAnalysis.isIpAddress ? 'text-red-400' : 'text-slate-300'}`}>
                        {liveUrlAnalysis.isIpAddress ? 'YES (Bare IP)' : 'NO (Domain)'}
                      </span>
                    </div>
                  </div>

                  {liveUrlAnalysis.structuralFlags.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {liveUrlAnalysis.structuralFlags.map((flag, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-950/20 border border-amber-800/30 px-2.5 py-1 rounded">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong>{flag.name}:</strong> {flag.details}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCREENSHOT */}
          {activeTab === 'screenshot' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                Suspicious Interface or Message Screenshot
              </label>

              {!screenshotData ? (
                <div
                  onClick={() => screenshotInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/50 rounded-2xl p-8 text-center cursor-pointer transition-colors group"
                >
                  <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-medium text-slate-300">
                    Click to select or drag and drop a screenshot here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports PNG, JPG, or WebP. Analyzed locally with OCR text extraction.
                  </p>
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleScreenshotFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-36 h-28 rounded-lg overflow-hidden border border-slate-800 bg-black shrink-0 relative">
                    <img
                      src={screenshotData.previewUrl}
                      alt="Uploaded screenshot"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-sm font-semibold text-slate-200 truncate">
                        {screenshotData.fileName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Screenshot ready for multimodal text extraction, UI element verification, and visual impersonation audit.
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        Replace image
                      </button>
                      <button
                        type="button"
                        onClick={() => setScreenshotData(null)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleScreenshotFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QR SCREENSHOT */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
                QR Code Image / Screenshot
              </label>

              {!qrScreenshotData && !qrDecodedValue ? (
                <div
                  onClick={() => qrInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/50 rounded-2xl p-8 text-center cursor-pointer transition-colors group"
                >
                  <QrCode className="w-10 h-10 text-slate-500 group-hover:text-purple-400 mx-auto mb-3 transition-colors" />
                  <p className="text-sm font-medium text-slate-300">
                    Upload an image containing a QR code
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Decoded immediately in browser using local matrix analysis. Never sent to third-party scan engines.
                  </p>
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleQrFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center gap-4">
                    {qrScreenshotData ? (
                      <div className="w-28 h-28 rounded-lg overflow-hidden border border-slate-800 bg-black shrink-0">
                        <img
                          src={qrScreenshotData.previewUrl}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-28 h-28 rounded-lg border border-purple-500/30 bg-purple-950/20 flex items-center justify-center shrink-0">
                        <QrCode className="w-12 h-12 text-purple-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-200">
                          {qrScreenshotData ? qrScreenshotData.fileName : 'QR Payload Ingested'}
                        </span>
                      </div>

                      {qrDecodingStatus && (
                        <p className="text-xs text-emerald-400 font-mono mb-2">
                          ✓ {qrDecodingStatus}
                        </p>
                      )}

                      {qrDecodeError && (
                        <p className="text-xs text-amber-400 font-mono mb-2">
                          ⚠ {qrDecodeError}
                        </p>
                      )}

                      {qrDecodedValue ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 mt-1 font-mono text-xs text-slate-200 break-all select-all">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-sans font-semibold mb-0.5">
                            Decoded QR Content:
                          </span>
                          {qrDecodedValue}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <label className="text-[11px] text-slate-400 block mb-1">
                            Or enter the decoded payload manually if known:
                          </label>
                          <input
                            type="text"
                            value={qrDecodedValue}
                            onChange={(e) => setQrDecodedValue(e.target.value)}
                            placeholder="https://example.com/qr-link"
                            className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 font-mono"
                          />
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => qrInputRef.current?.click()}
                          className="text-xs text-purple-400 hover:underline"
                        >
                          Upload another QR
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQrScreenshotData(null);
                            setQrDecodedValue('');
                            setQrDecodingStatus('');
                            setQrDecodeError('');
                          }}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Clear QR
                        </button>
                      </div>
                      <input
                        ref={qrInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleQrFile(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COMBINED MULTI-INPUT MODE */}
          {activeTab === 'combined' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  Multimodal Investigation Bundle
                </h3>
                <p className="text-xs text-slate-400">
                  Analyze complex incidents where you received an SMS or email containing a link, accompanied by a screenshot or QR code.
                </p>
              </div>

              <div className="space-y-4">
                {/* 1. Message */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                    1. Accompanying Message or Context
                  </label>
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Enter message text, SMS body, or email subject/body..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 2. Target URL */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1">
                    2. Target URL
                  </label>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://destination-url.com/verify..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 3. Image attachments row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Screenshot item */}
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
                    <span className="text-xs font-semibold text-slate-300 block mb-2">
                      3. UI / Message Screenshot
                    </span>
                    {screenshotData ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={screenshotData.previewUrl}
                          alt="Thumbnail"
                          className="w-12 h-12 object-cover rounded border border-slate-800"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-200 truncate">{screenshotData.fileName}</p>
                          <button
                            type="button"
                            onClick={() => setScreenshotData(null)}
                            className="text-[11px] text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        className="w-full py-2.5 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Attach Screenshot</span>
                      </button>
                    )}
                  </div>

                  {/* QR screenshot item */}
                  <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
                    <span className="text-xs font-semibold text-slate-300 block mb-2">
                      4. QR Code Matrix
                    </span>
                    {qrScreenshotData || qrDecodedValue ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded border border-purple-500/40 bg-purple-950/30 flex items-center justify-center shrink-0">
                          <QrCode className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono text-slate-200 truncate">
                            {qrDecodedValue || 'QR Attached'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setQrScreenshotData(null);
                              setQrDecodedValue('');
                            }}
                            className="text-[11px] text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => qrInputRef.current?.click()}
                        className="w-full py-2.5 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Attach QR Code</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Secondary Drag and Drop Target Area */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mt-6 border-2 border-dashed rounded-xl p-4 text-center transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-950/20 text-blue-300'
                : 'border-slate-800/80 bg-slate-950/30 text-slate-500 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs">
              <UploadCloud className="w-4 h-4 text-slate-400" />
              <span>
                {isDragging
                  ? 'Drop image file here to attach to investigation...'
                  : 'Drag & drop any screenshot or QR image anywhere onto this panel'}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>
                {hasValidInput
                  ? 'Ready for investigation'
                  : 'Provide at least one input above to proceed'}
              </span>
            </div>

            <button
              type="submit"
              disabled={!hasValidInput || isLoading}
              className={`w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                hasValidInput && !isLoading
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 cursor-pointer hover:shadow-blue-900/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <span>Investigate</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Safety & Grounding Principles Banner */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            100% Grounded In Provided Data
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every conclusion is traced to visible text, URL structure, or visual screenshot tokens. No invented facts.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Zero External Threat DB Fallacy
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            No simulated VirusTotal counts, no fabricated domain age, and no synthetic reputation scores.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Deterministic Evidence Weighting
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Risk scores (0–100) are computed mathematically from detected signals, not random LLM guesses.
          </p>
        </div>
      </div>
    </div>
  );
};
