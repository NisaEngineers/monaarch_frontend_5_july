"use client";

import { useState, useRef, useEffect } from "react";

const API_BASE = "https://urchin-app-m3gtz.ondigitalocean.app/"; // CHANGE THIS to your deployed API URL

export default function VocalRemoverClient() {
  const [uploaded, setUploaded] = useState(false);
  const [removingVocals, setRemovingVocals] = useState(false);
  const [originalAudioURL, setOriginalAudioURL] = useState<string | null>(null);
  const [vocalAudioURL, setVocalAudioURL] = useState<string | null>(null);
  const [instrumentalAudioURL, setInstrumentalAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [polling, setPolling] = useState(false);

  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const vocalAudioRef = useRef<HTMLAudioElement | null>(null);
  const instrumentalAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle file upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setOriginalAudioURL(URL.createObjectURL(file));
      setUploaded(true);
      setError(null);
      // Clear old outputs
      setVocalAudioURL(null);
      setInstrumentalAudioURL(null);
    }
  };

  // Check if output files exist by HEAD requests
  const checkOutputsReady = async (vocalPath: string, instrumentalPath: string) => {
    try {
      const vocalUrl = `${API_BASE}/download/${encodeURIComponent(vocalPath)}`;
      const instrumentalUrl = `${API_BASE}/download/${encodeURIComponent(instrumentalPath)}`;

      const [vocalRes, instrumentalRes] = await Promise.all([
        fetch(vocalUrl, { method: "HEAD" }),
        fetch(instrumentalUrl, { method: "HEAD" }),
      ]);

      return vocalRes.ok && instrumentalRes.ok
        ? { vocalUrl, instrumentalUrl }
        : null;
    } catch {
      return null;
    }
  };

  // Polling function to check if processing finished
  useEffect(() => {
    if (!removingVocals || !uploadedFile) return;

    let interval: NodeJS.Timer;

    const startPolling = async () => {
      // Construct expected output folder + files
      const baseName = uploadedFile.name.replace(/\.[^/.]+$/, ""); // filename without extension
      const vocalRelPath = `vocal_remover/${baseName}/vocals.wav`;
      const instrumentalRelPath = `vocal_remover/${baseName}/accompaniment.wav`;

      interval = setInterval(async () => {
        const ready = await checkOutputsReady(vocalRelPath, instrumentalRelPath);
        if (ready) {
          setVocalAudioURL(ready.vocalUrl);
          setInstrumentalAudioURL(ready.instrumentalUrl);
          setRemovingVocals(false);
          setPolling(false);
          clearInterval(interval);
        }
      }, 5000);
    };

    setPolling(true);
    startPolling();

    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [removingVocals, uploadedFile]);

  // Handle vocal removal POST request
  const handleRemoveVocals = async () => {
    if (!uploadedFile) return;

    setRemovingVocals(true);
    setError(null);
    setVocalAudioURL(null);
    setInstrumentalAudioURL(null);

    try {
      const formData = new FormData();
      formData.append("audio_file", uploadedFile);

      const res = await fetch(`${API_BASE}/process-audio/`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Vocal removal failed");
      }

      // The backend processes in background, so we start polling for output files
      // Polling handled by useEffect above

    } catch (err) {
      setRemovingVocals(false);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-black text-white p-6">
      <h1 className="text-4xl font-bold mb-4 text-green-400">Voice Remover</h1>
      <p className="mb-6 max-w-lg">
        Upload an audio file to remove vocals and get instrumental tracks.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-700 rounded">{error}</div>
      )}

      {!uploaded ? (
        <input
          type="file"
          accept="audio/*"
          onChange={handleUpload}
          className="mb-6"
        />
      ) : (
        <div>
          <div className="mb-4">
            <strong>Uploaded file:</strong> {uploadedFile?.name}
          </div>
          {!removingVocals && (
            <button
              onClick={handleRemoveVocals}
              className="px-6 py-3 bg-green-600 rounded hover:bg-green-700"
            >
              Remove Vocals
            </button>
          )}
          {(removingVocals || polling) && (
            <div className="mt-4 text-yellow-300 font-semibold">
              Processing... This can take some time. Please wait.
            </div>
          )}
        </div>
      )}

      {/* Audio Players */}
      {originalAudioURL && (
        <div className="mt-10">
          <h2 className="text-2xl mb-2">Original Audio</h2>
          <audio controls src={originalAudioURL} ref={originalAudioRef} />
          <a
            href={originalAudioURL}
            download="original_audio"
            className="block mt-2 underline text-green-300"
          >
            Download Original
          </a>
        </div>
      )}

      {vocalAudioURL && (
        <div className="mt-10">
          <h2 className="text-2xl mb-2">Vocal Audio</h2>
          <audio controls src={vocalAudioURL} ref={vocalAudioRef} />
          <a
            href={vocalAudioURL}
            download="vocals.wav"
            className="block mt-2 underline text-green-300"
          >
            Download Vocals
          </a>
        </div>
      )}

      {instrumentalAudioURL && (
        <div className="mt-10 mb-20">
          <h2 className="text-2xl mb-2">Instrumental Audio</h2>
          <audio controls src={instrumentalAudioURL} ref={instrumentalAudioRef} />
          <a
            href={instrumentalAudioURL}
            download="accompaniment.wav"
            className="block mt-2 underline text-green-300"
          >
            Download Instrumental
          </a>
        </div>
      )}
    </section>
  );
}
