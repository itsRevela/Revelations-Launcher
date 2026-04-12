import { useState, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export function useSkinSync() {
  const [skinUrl, setSkinUrl] = useLocalStorage("lce-skin", "/images/Default.png");
  const [skinBase64, setSkinBase64] = useState<string | null>(null);
  const [skinModel, setSkinModel] = useLocalStorage<string>("lce-skin-model", "steve");

  useEffect(() => {
    const syncSkin = async () => {
      if (!skinUrl) return;
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // Always 64x32 for PCK (LCE crashes on 64x64)
          const cvs = document.createElement("canvas");
          cvs.width = 64;
          cvs.height = 32;
          const ctx = cvs.getContext("2d");
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            if (img.naturalHeight > 32) {
              ctx.drawImage(img, 0, 0, 64, 32, 0, 0, 64, 32);
            } else {
              ctx.drawImage(img, 0, 0);
            }
            setSkinBase64(cvs.toDataURL("image/png"));
          }
        };
        img.src = skinUrl;
      } catch (e) {
        console.error("Skin conversion failed:", e);
      }
    };
    syncSkin();
  }, [skinUrl]);

  return {
    skinUrl,
    setSkinUrl,
    skinBase64,
    skinModel,
    setSkinModel,
  };
}
