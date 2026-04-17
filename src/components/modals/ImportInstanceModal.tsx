import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function ImportInstanceModal({
  isOpen,
  onClose,
  onImport,
  playSfx,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: { name: string; desc: string; url: string }) => void;
  playSfx: (sound: string) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDesc("");
      setUrl("");
      setError("");
      setFocusIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === "INPUT";
      if (e.key === "Escape") {
        playSfx("close_click.wav");
        onClose();
      } else if (e.key === "ArrowDown" || (e.key === "Tab" && !isInput)) {
        e.preventDefault();
        setFocusIndex((prev) => (prev + 1) % 5);
      } else if (e.key === "ArrowUp") {
        if (!isInput) e.preventDefault();
        setFocusIndex((prev) => (prev - 1 + 5) % 5);
      } else if (e.key === "Enter") {
        if (focusIndex === 3) {
          handleImport();
        } else if (focusIndex === 4) {
          playSfx("close_click.wav");
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, focusIndex, name, desc, url]);

  if (!isOpen) return null;

  const handleImport = () => {
    if (!name) {
      setError("Name is required");
      return;
    }
    setError("");
    playSfx("save_click.wav");
    onImport({ name, desc: desc || "Imported instance", url });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] flex items-center justify-center outline-none border-none"
    >
      <div
        className="relative w-[450px] p-8 flex flex-col items-center shadow-2xl"
        style={{
          backgroundImage: "url('/images/frame_background.png')",
          backgroundSize: "100% 100%",
          imageRendering: "pixelated",
        }}
      >
        <h2 className="text-[#FFFF55] text-2xl mc-text-shadow mb-6 border-b-2 border-[#373737] pb-2 w-full text-center uppercase font-bold tracking-widest">
          Import Instance
        </h2>

        <div className="flex flex-col gap-5 w-full">
          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm mc-text-shadow uppercase tracking-widest ml-1">
              Instance Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocusIndex(0)}
              placeholder="e.g. My LCE Build"
              className={`w-full h-12 px-4 bg-black/40 border-2 text-white text-lg transition-colors outline-none font-['Mojangles'] ${focusIndex === 0 ? "border-[#FFFF55]" : "border-[#373737]"}`}
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm mc-text-shadow uppercase tracking-widest ml-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onFocus={() => setFocusIndex(1)}
              placeholder="A brief description..."
              className={`w-full h-12 px-4 bg-black/40 border-2 text-white text-lg transition-colors outline-none font-['Mojangles'] ${focusIndex === 1 ? "border-[#FFFF55]" : "border-[#373737]"}`}
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm mc-text-shadow uppercase tracking-widest ml-1">
              Download URL (Optional)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setFocusIndex(2)}
              placeholder="https://example.com/update.zip"
              className={`w-full h-12 px-4 bg-black/40 border-2 text-white text-lg transition-colors outline-none font-['Mojangles'] ${focusIndex === 2 ? "border-[#FFFF55]" : "border-[#373737]"}`}
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          {error && (
            <div className="text-red-500 text-center mc-text-shadow uppercase text-xs tracking-widest mt-1">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 mt-8 w-full items-center">
          <button
            onMouseEnter={() => setFocusIndex(3)}
            onMouseLeave={() => setFocusIndex(-1)}
            onClick={handleImport}
            className={`w-full h-12 flex items-center justify-center text-xl mc-text-shadow transition-all outline-none border-none bg-transparent ${focusIndex === 3 ? "text-[#FFFF55]" : "text-white"}`}
            style={{
              backgroundImage: focusIndex === 3 ? "url('/images/button_highlighted.png')" : "url('/images/Button_Background.png')",
              backgroundSize: "100% 100%",
              imageRendering: "pixelated",
            }}
          >
            Select Instance Folder
          </button>

          <div className="flex gap-4 w-full">
            <button
              onMouseEnter={() => setFocusIndex(4)}
              onMouseLeave={() => setFocusIndex(-1)}
              onClick={() => {
                playSfx("close_click.wav");
                onClose();
              }}
              className={`flex-1 h-12 flex items-center justify-center text-xl mc-text-shadow transition-all outline-none border-none bg-transparent ${focusIndex === 4 ? "text-[#FFFF55]" : "text-white"}`}
              style={{
                backgroundImage: focusIndex === 4 ? "url('/images/button_highlighted.png')" : "url('/images/Button_Background.png')",
                backgroundSize: "100% 100%",
                imageRendering: "pixelated",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
