import { useState, useEffect, useCallback, useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TauriService } from "../services/TauriService";

const appWindow = getCurrentWindow();

const BASE_EDITIONS = [
  {
    id: "revelations_edition",
    name: "LCE Revelations",
    desc: "Legacy Console Edition Revelations. Bundled with a fully-implemented hardcore mode, performance/stability optimizations, and uncapped FPS via a VSync toggle. Security-hardened with token-based encryption.",
    url: "https://github.com/itsRevela/LCE-Revelations/releases/download/Nightly/LCE-Revelations-Client-Win64.zip",
    titleImage: "/images/minecraft_title_revelations.png",
    credits: {
      developer: "itsRevela",
      platform: "github",
      url: "https://github.com/itsRevela"
    }
  },
];

const PARTNERSHIP_SERVERS: { name: string; ip: string; port: number }[] = [];

interface GameManagerProps {
  profile: string;
  setProfile: (id: string) => void;
  customEditions: any[];
  setCustomEditions: (editions: any[]) => void;
  keepLauncherOpen: boolean;
}

export function useGameManager({ profile, setProfile, customEditions, setCustomEditions, keepLauncherOpen }: GameManagerProps) {
  const [installs, setInstalls] = useState<string[]>([]);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isRunnerDownloading, setIsRunnerDownloading] = useState(false);
  const [runnerDownloadProgress, setRunnerDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<Record<string, boolean>>({});

  const editions = useMemo(() => [...BASE_EDITIONS, ...customEditions], [customEditions]);

  const checkInstalls = useCallback(async () => {
    const results = await Promise.all(
      editions.map(async (e) => {
        const isInstalled = await TauriService.checkGameInstalled(e.id);
        return isInstalled ? e.id : null;
      }),
    );
    const installed = results.filter((id): id is string => id !== null);
    setInstalls(installed);

    // Check for game updates on installed editions with URLs
    for (const id of installed) {
      const edition = editions.find(e => e.id === id);
      if (!edition?.url) continue;
      try {
        const hasUpdate = await TauriService.checkForGameUpdate(id, edition.url);
        setUpdateAvailable(prev => ({ ...prev, [id]: hasUpdate }));
      } catch {
        setUpdateAvailable(prev => ({ ...prev, [id]: false }));
      }
    }
  }, [editions]);

  useEffect(() => {
    checkInstalls();
    const unlistenDownload = TauriService.onDownloadProgress((p) => setDownloadProgress(p));
    const unlistenRunner = TauriService.onRunnerDownloadProgress((p) => setRunnerDownloadProgress(p));
    return () => {
      unlistenDownload.then((u) => u());
      unlistenRunner.then((u) => u());
    };
  }, [customEditions, checkInstalls]);

  const downloadRunner = useCallback(async (name: string, url: string) => {
    if (isRunnerDownloading) return;
    setIsRunnerDownloading(true);
    setRunnerDownloadProgress(0);
    setError(null);
    try {
      await TauriService.downloadRunner(name, url);
      setRunnerDownloadProgress(null);
    } catch (e: any) {
      console.error(e);
      setError(typeof e === 'string' ? e : e.message || "Failed to download runner");
    } finally {
      setIsRunnerDownloading(false);
    }
  }, [isRunnerDownloading]);

  const toggleInstall = useCallback(async (id: string) => {
    if (downloadingId) return;
    const edition = editions.find((e) => e.id === id);
    if (!edition) return;
    setError(null);
    try {
      setDownloadingId(id);
      setDownloadProgress(0);
      await TauriService.downloadAndInstall(edition.url, id);
      await TauriService.syncDlc(id);
      await checkInstalls();
      setProfile(id);
      setDownloadProgress(null);
      setDownloadingId(null);
    } catch (e: any) {
      console.error(e);
      setError(typeof e === 'string' ? e : e.message || "Failed to install version");
      setDownloadProgress(null);
      setDownloadingId(null);
    }
  }, [downloadingId, editions, checkInstalls, setProfile]);

  const handleUninstall = useCallback(async (id: string) => {
    await TauriService.deleteInstance(id);
    await checkInstalls();
  }, [checkInstalls]);

  const handleLaunch = useCallback(async () => {
    if (isGameRunning) return;
    setError(null);
    setIsGameRunning(true);
    try {
      if (!keepLauncherOpen) {
        await appWindow.hide();
      }
      await TauriService.launchGame(profile, PARTNERSHIP_SERVERS);
    } catch (e: any) {
      console.error(e);
      setError(typeof e === 'string' ? e : e.message || "Failed to launch game");
    } finally {
      setIsGameRunning(false);
      await appWindow.show();
      await appWindow.unminimize();
      await appWindow.setFocus();
    }
  }, [isGameRunning, profile, keepLauncherOpen]);

  const stopGame = useCallback(async () => {
    try {
      await TauriService.stopGame(profile);
      setIsGameRunning(false);
    } catch (e) {
      console.error(e);
    }
  }, [profile]);

  const addCustomEdition = useCallback((edition: { name: string; desc: string; url: string }) => {
    const id = `custom_${Date.now()}`;
    const newEdition = { ...edition, id, titleImage: "/images/MenuTitle.png" };
    setCustomEditions([...customEditions, newEdition]);
    return id;
  }, [customEditions, setCustomEditions]);

  const importInstance = useCallback(async (edition: { name: string; desc: string; url: string }) => {
    const id = `instance_${Date.now()}`;
    try {
      await TauriService.importInstanceFolder(id, edition.url || "");
      const newEdition = { ...edition, id, titleImage: "/images/MenuTitle.png" };
      setCustomEditions([...customEditions, newEdition]);
      await checkInstalls();
      setProfile(id);
      return id;
    } catch (e: any) {
      if (e === "CANCELED" || (typeof e === 'string' && e.includes("CANCELED"))) return null;
      setError(typeof e === 'string' ? e : e.message || "Failed to import instance");
      return null;
    }
  }, [customEditions, setCustomEditions, checkInstalls, setProfile]);

  const deleteCustomEdition = useCallback((id: string) => {
    setCustomEditions(customEditions.filter((e) => e.id !== id));
    TauriService.deleteInstance(id).catch(console.error);
    if (profile === id) {
      setProfile(BASE_EDITIONS[0].id);
    }
  }, [customEditions, setCustomEditions, profile, setProfile]);

  const updateCustomEdition = useCallback((id: string, updated: { name: string; desc: string; url: string }) => {
    setCustomEditions(customEditions.map((e) => e.id === id ? { ...e, ...updated } : e));
  }, [customEditions, setCustomEditions]);

  const setTitleImage = useCallback(async (id: string) => {
    try {
      const dataUrl = await TauriService.setInstanceTitleImage(id);
      setCustomEditions(customEditions.map((e) =>
        e.id === id ? { ...e, titleImage: dataUrl } : e
      ));
    } catch {
      // canceled or failed
    }
  }, [customEditions, setCustomEditions]);

  // Load custom title images on startup
  useEffect(() => {
    const loadTitleImages = async () => {
      for (const edition of customEditions) {
        try {
          const dataUrl = await TauriService.getInstanceTitleImage(edition.id);
          if (edition.titleImage !== dataUrl) {
            setCustomEditions(customEditions.map((e: any) =>
              e.id === edition.id ? { ...e, titleImage: dataUrl } : e
            ));
          }
        } catch {
          // no custom title image
        }
      }
    };
    loadTitleImages();
  }, []);

  return {
    installs,
    isGameRunning,
    downloadProgress,
    downloadingId,
    isRunnerDownloading,
    runnerDownloadProgress,
    error,
    setError,
    editions,
    toggleInstall,
    handleUninstall,
    handleLaunch,
    stopGame,
    addCustomEdition,
    deleteCustomEdition,
    updateCustomEdition,
    downloadRunner,
    checkInstalls,
    updateAvailable,
    importInstance,
    setTitleImage,
  };
}
