"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Upload,
  X,
  Sparkles,
  Film,
  Camera,
  User,
  Layers,
  Wind,
  Trash2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Zap,
  CheckCircle2,
  ExternalLink,
  Mars,
  Venus,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotify } from "@/components/feedback/use-notify";
import { TikTokShareButton } from "@/components/dashboard/TikTokShareButton";
import { usePreferences } from "@/lib/context/preferences-context";
import type { MarketplaceTemplate } from "@/lib/types/marketplace";
import type { VideoFlowStepConfig } from "@/lib/types/marketplace";
import type { AvatarConfig } from "@/lib/types/preferences";
import {
  buildAvatarConfigFromTemplate,
  buildBackgroundConfigFromTemplate,
  buildCustomAvatarConfig,
  buildUserModelAvatarConfig,
} from "@/lib/preferences";
import { getTemplatePrimaryImageUrl } from "@/lib/marketplace-template-media";
import { VIDEO_MODELS } from "@/lib/data/plans";
import { TOKEN_COSTS } from "@/lib/data/plans";
import type { VideoModel } from "@/lib/types/billing";
import { buildFinalImageVideoPrompt } from "@/lib/video-prompt";
import {
  getDefaultVideoFlowStep,
  getVideoFlowStepById,
  getVideoFlowSteps,
} from "@/lib/video-flow";
import {
  getAllVideoOptionChoices,
  getDefaultVideoGenerationSettings,
  getMinimumVideoGenerationTokenCost,
  getVideoGenerationTokenCost,
  getVideoOptionChoices,
  hasMultipleVideoOptionChoices,
  updateVideoGenerationSettings,
  type VideoGenerationSettings,
  type VideoOptionKey,
} from "@/lib/video-generation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CardBase {
  id: string;
  x: number;
  y: number;
}

interface ProductCard extends CardBase {
  type: "product";
  imageUrl: string;
  fileName: string;
  file: File;
  projectId?: string;
  projectName?: string;
}

interface GeneratedCard extends CardBase {
  type: "generated";
  imageUrl: string;
  prompt: string;
  sourceIds: string[];
  projectId?: string;
  projectName?: string;
  generatedImageId?: string;
  videoUrl?: string;
  videoFileName?: string;
  videoStorageFileId?: string | null;
  generatedVideos?: GeneratedVideoResult[];
  flowGroupId?: string;
  flowTitle?: string;
  flowStepId?: string;
  flowStepTitle?: string;
  flowShotTypeTemplateId?: string;
  flowMotionStyleTemplateId?: string;
  isLoading?: boolean;
  hasError?: boolean;
}

type VideoCardStatus = "pending" | "ready" | "error";

interface VideoCard extends CardBase {
  type: "video";
  imageUrl?: string;
  sourceGeneratedCardId: string;
  sourceGeneratedImageId?: string;
  projectId?: string;
  projectName?: string;
  title: string;
  stepId?: string;
  stepTitle?: string;
  videoUrl?: string;
  fileName?: string;
  storageFileId?: string | null;
  status: VideoCardStatus;
  errorMessage?: string;
}

type Card = ProductCard | GeneratedCard | VideoCard;

type Side = "left" | "right" | "top" | "bottom";

interface Connection {
  id: string;
  from: string;
  fromSide: Side;
  to: string;
  toSide: Side;
}
interface SelBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface PersistedProductCard extends CardBase {
  type: "product";
  fileName: string;
  file: File;
  projectId?: string;
  projectName?: string;
}

interface PersistedGeneratedCard extends CardBase {
  type: "generated";
  imageUrl: string;
  prompt: string;
  sourceIds: string[];
  projectId?: string;
  projectName?: string;
  generatedImageId?: string;
  videoUrl?: string;
  videoFileName?: string;
  videoStorageFileId?: string | null;
  generatedVideos?: GeneratedVideoResult[];
  flowGroupId?: string;
  flowTitle?: string;
  flowStepId?: string;
  flowStepTitle?: string;
  flowShotTypeTemplateId?: string;
  flowMotionStyleTemplateId?: string;
  isLoading?: boolean;
  hasError?: boolean;
}

interface PersistedVideoCard extends CardBase {
  type: "video";
  imageUrl?: string;
  sourceGeneratedCardId: string;
  sourceGeneratedImageId?: string;
  projectId?: string;
  projectName?: string;
  title: string;
  stepId?: string;
  stepTitle?: string;
  videoUrl?: string;
  fileName?: string;
  storageFileId?: string | null;
  status: VideoCardStatus;
  errorMessage?: string;
}

interface GeneratedVideoResult {
  id: string;
  title: string;
  stepId?: string;
  stepTitle?: string;
  videoUrl: string;
  fileName: string;
  storageFileId?: string | null;
}

interface PersistedStudioState {
  cards: Array<PersistedProductCard | PersistedGeneratedCard | PersistedVideoCard>;
  connections: Connection[];
  selectedIds: string[];
  prompt: string;
  zoom: number;
  pan: { x: number; y: number };
}

interface StudioProjectVideoRecord {
  id: string;
  image_id: string | null;
  url: string | null;
  status: string;
  created_at: string;
}

export interface StudioCanvasProps {
  userId: string;
  cameraTemplates: MarketplaceTemplate[];
  movementTemplates: MarketplaceTemplate[];
  videoFlowTemplates: MarketplaceTemplate[];
  avatarTemplates: MarketplaceTemplate[];
  backgroundTemplates: MarketplaceTemplate[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_W = 196;
const CARD_IMG_H = 320;
const CARD_FOOT_H = 56;
const CARD_H = CARD_IMG_H + CARD_FOOT_H;
/** Space above the top flow beat for the Flow Group header bar (px). Must be ≥ rendered header height or cards overlap the title. */
const FLOW_GROUP_TOP_RESERVE = 76;
/** Extra padding below the bottom edge of beat cards (shadows / footer / rounding extend past CARD_H). */
const FLOW_GROUP_BOTTOM_PAD = 32;
/** Horizontal inset around the flow beat row. */
const FLOW_GROUP_PAD_X = 18;
const PORT_R = 9; // port circle radius
const DRAG_THRESH = 5;
const GAP = 22;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.12;
const CANVAS_W = 6000;
const CANVAS_H = 4000;
const STUDIO_DB_NAME = "genetrify-studio";
const STUDIO_STORE_NAME = "canvas";
const STUDIO_STATE_KEY_PREFIX = "session";

const VIDEO_OPTION_LABELS: Record<VideoOptionKey, string> = {
  duration: "Duration",
  resolution: "Resolution",
  mode: "Variant",
  generateAudio: "Audio",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function getStudioStateKey(userId: string) {
  return `${STUDIO_STATE_KEY_PREFIX}:${userId}`;
}

function boxRect(b: SelBox) {
  return {
    left: Math.min(b.x1, b.x2),
    top: Math.min(b.y1, b.y2),
    right: Math.max(b.x1, b.x2),
    bottom: Math.max(b.y1, b.y2),
  };
}

function cardInBox(c: Card, b: SelBox) {
  const r = boxRect(b);
  return (
    c.x < r.right &&
    c.x + CARD_W > r.left &&
    c.y < r.bottom &&
    c.y + CARD_H > r.top
  );
}

function selBounds(cards: Card[], ids: Set<string>) {
  const sel = cards.filter((c) => ids.has(c.id));
  if (!sel.length) return null;
  return {
    left: Math.min(...sel.map((c) => c.x)),
    top: Math.min(...sel.map((c) => c.y)),
    right: Math.max(...sel.map((c) => c.x + CARD_W)),
    bottom: Math.max(...sel.map((c) => c.y + CARD_H)),
  };
}

function resolveStudioProject(
  productCards: ProductCard[],
  allCards: Card[],
): { projectId?: string; projectName?: string; error?: string } {
  const sourceIds = new Set(productCards.map((card) => card.id));
  const projectEntries = new Map<string, string | undefined>();

  for (const card of productCards) {
    if (card.projectId) {
      projectEntries.set(card.projectId, card.projectName);
    }
  }

  for (const card of allCards) {
    if (
      card.type !== "generated" ||
      !card.projectId ||
      card.sourceIds.length !== productCards.length
    ) {
      continue;
    }
    const matchesAllSources = card.sourceIds.every((sourceId) =>
      sourceIds.has(sourceId),
    );
    if (matchesAllSources) {
      projectEntries.set(card.projectId, card.projectName);
    }
  }

  if (projectEntries.size > 1) {
    return {
      error:
        "Selected cards belong to multiple projects. Generate from one connected product group at a time.",
    };
  }

  const [entry] = [...projectEntries.entries()];
  if (!entry) return {};
  return { projectId: entry[0], projectName: entry[1] };
}

function portPos(c: Card, side: Side) {
  const cx = c.x + CARD_W / 2;
  const cy = c.y + CARD_IMG_H / 2;
  switch (side) {
    case "right":
      return { x: c.x + CARD_W + PORT_R, y: cy };
    case "left":
      return { x: c.x - PORT_R, y: cy };
    case "top":
      return { x: cx, y: c.y - PORT_R };
    case "bottom":
      return { x: cx, y: c.y + CARD_IMG_H + PORT_R };
  }
}

function nearestSide(c: Card, pos: { x: number; y: number }): Side {
  const sides: Side[] = ["left", "right", "top", "bottom"];
  let best: Side = "left";
  let bestDist = Infinity;
  for (const s of sides) {
    const p = portPos(c, s);
    const d = (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function portBezier(
  p1: { x: number; y: number },
  side1: Side,
  p2: { x: number; y: number },
  side2: Side,
) {
  const dist = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
  const t = Math.max(dist * 0.5, 40);
  const dx1 = side1 === "right" ? t : side1 === "left" ? -t : 0;
  const dy1 = side1 === "bottom" ? t : side1 === "top" ? -t : 0;
  const dx2 = side2 === "right" ? t : side2 === "left" ? -t : 0;
  const dy2 = side2 === "bottom" ? t : side2 === "top" ? -t : 0;
  return `M ${p1.x} ${p1.y} C ${p1.x + dx1} ${p1.y + dy1} ${p2.x + dx2} ${p2.y + dy2} ${p2.x} ${p2.y}`;
}

/** Transitively expand a set of card IDs via connections */
function expandGroup(ids: Set<string>, connections: Connection[]): Set<string> {
  const group = new Set(ids);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of connections) {
      if (group.has(c.from) && !group.has(c.to)) {
        group.add(c.to);
        changed = true;
      }
      if (group.has(c.to) && !group.has(c.from)) {
        group.add(c.from);
        changed = true;
      }
    }
  }
  return group;
}

async function* readNDJSON(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line);
    }
  }
  if (buf.trim()) yield JSON.parse(buf);
}

function openStudioDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(STUDIO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STUDIO_STORE_NAME)) {
        db.createObjectStore(STUDIO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open studio db"));
  });
}

async function loadStudioState(storageKey: string) {
  const db = await openStudioDb();
  return new Promise<PersistedStudioState | null>((resolve, reject) => {
    const tx = db.transaction(STUDIO_STORE_NAME, "readonly");
    const store = tx.objectStore(STUDIO_STORE_NAME);
    const request = store.get(storageKey);
    request.onsuccess = () =>
      resolve((request.result as PersistedStudioState | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read studio state"));
  });
}

async function saveStudioState(
  storageKey: string,
  state: PersistedStudioState,
) {
  const db = await openStudioDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STUDIO_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to save studio state"));
    tx.objectStore(STUDIO_STORE_NAME).put(state, storageKey);
  });
}

async function hydrateGeneratedCardVideos(
  cards: Array<PersistedProductCard | PersistedGeneratedCard | PersistedVideoCard>,
): Promise<Array<PersistedProductCard | PersistedGeneratedCard | PersistedVideoCard>> {
  const generatedCards = cards.filter(
    (card): card is PersistedGeneratedCard =>
      card.type === "generated" && !!card.projectId && !!card.generatedImageId,
  );

  if (generatedCards.length === 0) return cards;

  const projectIds = [...new Set(generatedCards.map((card) => card.projectId!))];
  const videosByProject = new Map<string, StudioProjectVideoRecord[]>();

  await Promise.all(
    projectIds.map(async (projectId) => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "GET",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { videos?: StudioProjectVideoRecord[] };
        videosByProject.set(projectId, data.videos ?? []);
      } catch {
        // Keep local state if the project lookup fails.
      }
    }),
  );

  return cards.map((card) => {
    if (
      card.type !== "generated" ||
      !card.projectId ||
      !card.generatedImageId
    ) {
      return card;
    }

    const matchingVideos = (videosByProject.get(card.projectId) ?? [])
      .filter(
        (video) =>
          video.status === "ready" &&
          video.image_id === card.generatedImageId &&
          !!video.url,
      )
      .sort((left, right) => right.created_at.localeCompare(left.created_at));

    if (matchingVideos.length === 0) return card;

    const generatedVideos: GeneratedVideoResult[] = matchingVideos.map(
      (video, index) => ({
        id: video.id,
        title:
          card.flowStepTitle && index === 0
            ? `${card.flowStepTitle} clip`
            : `Clip ${index + 1}`,
        stepId: card.flowStepId,
        stepTitle: card.flowStepTitle,
        videoUrl: video.url!,
        fileName: `genetrify-video-${index + 1}.mp4`,
        storageFileId: null,
      }),
    );

    return {
      ...card,
      videoUrl: generatedVideos[0]?.videoUrl ?? card.videoUrl,
      videoFileName: generatedVideos[0]?.fileName ?? card.videoFileName,
      generatedVideos,
    };
  });
}

async function clearStudioState(storageKey: string) {
  const db = await openStudioDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STUDIO_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to clear studio state"));
    tx.objectStore(STUDIO_STORE_NAME).delete(storageKey);
  });
}

function revokeProductObjectUrls(cards: Card[]) {
  for (const card of cards) {
    if (card.type === "product" && card.imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(card.imageUrl);
    }
  }
}

function buildStudioVideoPrompt(
  basePrompt: string,
  movementTemplate: MarketplaceTemplate | undefined,
  flowStep?: VideoFlowStepConfig | null,
) {
  return buildFinalImageVideoPrompt(basePrompt, movementTemplate, flowStep);
}

// ── StatusChip ────────────────────────────────────────────────────────────────

type TemplateCategory = "avatar" | "background" | "shot_type" | "motion_style" | "video_flow";

function StatusChip({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all select-none cursor-pointer",
        active
          ? "bg-brand-accent/15 border-brand-accent/35 text-brand-accent"
          : "bg-white/[0.04] border-white/[0.08] text-white/55 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/75",
      )}
    >
      <Icon size={11} />
      <span className="max-w-[110px] truncate">{value || "—"}</span>
    </button>
  );
}

// ── TemplatePanel ─────────────────────────────────────────────────────────────

interface UserModel {
  id: string;
  name: string;
  storage_path: string;
  public_url: string;
  gender: string;
}

function TemplatePanel({
  category,
  avatarTemplates,
  backgroundTemplates,
  cameraTemplates,
  movementTemplates,
  videoFlowTemplates,
  onClose,
}: {
  category: TemplateCategory;
  avatarTemplates: MarketplaceTemplate[];
  backgroundTemplates: MarketplaceTemplate[];
  cameraTemplates: MarketplaceTemplate[];
  movementTemplates: MarketplaceTemplate[];
  videoFlowTemplates: MarketplaceTemplate[];
  onClose: () => void;
}) {
  const {
    avatarConfig,
    setAvatarConfig,
    backgroundConfig,
    setBackgroundConfig,
    shotTypeTemplateId: cameraTemplateId,
    setShotTypeTemplateId: setCameraTemplateId,
    motionStyleTemplateId: movementTemplateId,
    setMotionStyleTemplateId: setMovementTemplateId,
    videoFlowTemplateId,
    setVideoFlowTemplateId,
  } = usePreferences();

  const notify = useNotify();
  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [userModels, setUserModels] = useState<UserModel[]>([]);
  const [userModelsLoading, setUserModelsLoading] = useState(category === "avatar");

  useEffect(() => {
    if (category !== "avatar") return;
    fetch("/api/user-models")
      .then((r) => r.json())
      .then((d) => setUserModels(d.models ?? []))
      .catch(() => setUserModels([]))
      .finally(() => setUserModelsLoading(false));
  }, [category]);
  const [avatarGender, setAvatarGender] = useState<"male" | "female">(
    avatarConfig?.gender === "woman" ? "female" : "male",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function savePrefs(body: Record<string, unknown>) {
    startTransition(async () => {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSavingId(null);
    });
  }

  function handleSelectAvatar(template: MarketplaceTemplate) {
    if (isPending) return;
    setSavingId(template.id);
    const config = buildAvatarConfigFromTemplate(template);
    if (!config) return;
    setAvatarConfig(config);
    savePrefs({ avatar_config: config });
    onClose();
  }

  function handleSelectBackground(template: MarketplaceTemplate) {
    if (isPending) return;
    setSavingId(template.id);
    const config = buildBackgroundConfigFromTemplate(template);
    if (!config) return;
    setBackgroundConfig(config);
    savePrefs({ background_config: config });
    onClose();
  }

  function handleSelectCamera(id: string) {
    if (isPending) return;
    setSavingId(id);
    setCameraTemplateId(id);
    savePrefs({
      shot_type_template_id: id,
      motion_style_template_id: movementTemplateId,
    });
    onClose();
  }

  function handleSelectMovement(id: string) {
    if (isPending) return;
    setSavingId(id);
    setMovementTemplateId(id);
    savePrefs({
      shot_type_template_id: cameraTemplateId,
      motion_style_template_id: id,
    });
    onClose();
  }

  function handleSelectVideoFlow(id: string) {
    if (isPending) return;
    setSavingId(id);
    setVideoFlowTemplateId(id);
    savePrefs({
      shot_type_template_id: cameraTemplateId,
      motion_style_template_id: movementTemplateId,
      video_flow_template_id: id,
    });
    onClose();
  }

  async function handleCustomFace(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const ALLOWED_FACE_TYPES = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED_FACE_TYPES.includes(file.type)) {
      notify.error({ title: "Unsupported file type", description: "Please upload a JPG, PNG, or WebP image." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify.error({ title: "File too large", description: "Face image must be under 10MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.split(":")[1].split(";")[0];
      const byteString = atob(b64);
      const arr = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++)
        arr[i] = byteString.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const formData = new FormData();
      formData.append("face", blob, "face.jpg");
      formData.append("onboardingFaceOnly", "true");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.faceUrl) {
        const config = buildCustomAvatarConfig(data.faceUrl, data.facePath);
        setAvatarConfig(config);
        await fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_config: config }),
        });
        onClose();
      } else {
        notify.error({ title: "Upload failed", description: data?.error ?? "Could not upload face image." });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSelectUserModel(model: UserModel) {
    const gender: AvatarConfig["gender"] =
      model.gender === "woman" ? "woman" : "man";
    const config = buildUserModelAvatarConfig(
      model.id,
      model.storage_path,
      gender,
    );
    setAvatarConfig(config);
    startTransition(async () => {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_config: config }),
      });
    });
    onClose();
  }

  const CATEGORY_META: Record<
    TemplateCategory,
    { label: string; icon: React.ElementType }
  > = {
    avatar: { label: "Avatar", icon: User },
    background: { label: "Background", icon: Layers },
    shot_type: { label: "Shot Type", icon: Camera },
    motion_style: { label: "Motion Style", icon: Wind },
    video_flow: { label: "Video Flow", icon: Film },
  };
  const meta = CATEGORY_META[category];

  const visibleAvatars = avatarTemplates.filter((t) =>
    avatarGender === "female"
      ? t.config.gender === "woman"
      : t.config.gender !== "woman",
  );

  const templates: MarketplaceTemplate[] =
    category === "avatar"
      ? visibleAvatars
      : category === "background"
        ? backgroundTemplates
        : category === "shot_type"
          ? cameraTemplates
          : category === "motion_style"
            ? movementTemplates
            : videoFlowTemplates;

  function isSelected(t: MarketplaceTemplate) {
    if (category === "shot_type") return t.id === cameraTemplateId;
    if (category === "motion_style") return t.id === movementTemplateId;
    if (category === "video_flow") return t.id === videoFlowTemplateId;
    if (category === "avatar")
      return avatarConfig?.type === "preset" && avatarConfig.presetId === t.id;
    if (category === "background")
      return (
        backgroundConfig?.type === "preset" &&
        backgroundConfig.presetId === t.id
      );
    return false;
  }

  function handleSelect(t: MarketplaceTemplate) {
    if (category === "avatar") handleSelectAvatar(t);
    if (category === "background") handleSelectBackground(t);
    if (category === "shot_type") handleSelectCamera(t.id);
    if (category === "motion_style") handleSelectMovement(t.id);
    if (category === "video_flow") handleSelectVideoFlow(t.id);
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/30 z-[520]"
        onClick={onClose}
      />

      {/* Panel — desktop: right side panel | mobile: bottom sheet */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 300 }}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-[530] flex flex-col",
          "w-full sm:w-[320px]",
          "bg-[#111119] border-l border-white/[0.07]",
        )}
        style={{ boxShadow: "-24px 0 64px rgba(0,0,0,0.55)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2">
            <meta.icon size={14} className="text-brand-accent" />
            <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
            <span className="text-[10px] text-white/30 font-mono">
              {templates.length} templates
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/templates"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              title="Open full templates page"
            >
              <ExternalLink size={13} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Avatar gender toggle */}
        {category === "avatar" && (
          <div className="px-5 pt-3 pb-1 shrink-0">
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setAvatarGender("male")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                  avatarGender === "male"
                    ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
                    : "text-white/35 hover:text-white/60",
                )}
              >
                <Mars size={11} /> Male
              </button>
              <button
                type="button"
                onClick={() => setAvatarGender("female")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                  avatarGender === "female"
                    ? "bg-brand-accent/20 text-brand-accent border border-brand-accent/30"
                    : "text-white/35 hover:text-white/60",
                )}
              >
                <Venus size={11} /> Female
              </button>
            </div>

            {/* Custom face upload */}
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] py-2.5 text-[11px] text-white/35 transition-colors hover:border-brand-accent/30 hover:text-brand-accent/70">
              <Upload size={11} />
              {avatarConfig?.type === "custom"
                ? "Replace custom face"
                : "Upload custom face"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomFace}
              />
            </label>
          </div>
        )}

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 scrollbar-brand">

          {/* My Faces — user-uploaded models */}
          {category === "avatar" && (userModelsLoading || userModels.length > 0) && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-2">
                My Faces
              </p>
              {userModelsLoading ? (
                <div className="flex items-center gap-2 text-[11px] text-white/25 py-2">
                  <RefreshCw size={11} className="animate-spin" />
                  Loading…
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {userModels.map((model) => {
                    const selected =
                      avatarConfig?.type === "user_model" &&
                      avatarConfig.userModelId === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => handleSelectUserModel(model)}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-150 cursor-pointer",
                          selected
                            ? "border-brand-accent ring-1 ring-brand-accent/40 shadow-md shadow-brand-accent/10"
                            : "border-white/[0.08] hover:border-white/20",
                        )}
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                          {model.public_url ? (
                            <img
                              src={model.public_url}
                              alt={model.name}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <User size={24} className="text-white/10" />
                            </div>
                          )}
                          {selected && (
                            <div className="absolute inset-0 bg-brand-accent/10" />
                          )}
                          <div
                            className={cn(
                              "absolute inset-x-1.5 bottom-1.5 transition-all duration-150",
                              selected
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
                            )}
                          >
                            <div className="flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-bold uppercase tracking-wider bg-brand-accent text-brand-bg">
                              {selected ? (
                                <><CheckCircle2 size={10} /> Active</>
                              ) : (
                                "Use this"
                              )}
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "px-2 py-1.5 border-t text-[10px] font-medium truncate transition-colors",
                            selected
                              ? "border-brand-accent/30 bg-brand-accent/8 text-brand-accent"
                              : "border-white/[0.06] bg-[#15151e] text-white/50",
                          )}
                        >
                          {model.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 mb-1 border-t border-white/[0.06]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 mt-3 mb-2">
                Templates
              </p>
            </div>
          )}

          {templates.length === 0 ? (
            <p className="text-center text-[12px] text-white/25 py-10">
              No templates yet
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {templates.map((t, i) => {
                const selected = isSelected(t);
                const saving = savingId === t.id;
                const templateImageUrl = getTemplatePrimaryImageUrl(t);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-150 cursor-pointer",
                      selected
                        ? "border-brand-accent ring-1 ring-brand-accent/40 shadow-md shadow-brand-accent/10"
                        : "border-white/[0.08] hover:border-white/20",
                    )}
                    >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                      {templateImageUrl ? (
                        <img
                          src={templateImageUrl}
                          alt={t.title}
                          loading={i < 4 ? "eager" : "lazy"}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <meta.icon size={24} className="text-white/10" />
                        </div>
                      )}

                      {t.badge && (
                        <div className="absolute left-1.5 top-1.5 rounded-full bg-brand-accent/90 px-1.5 py-0.5 text-[8px] font-semibold text-brand-bg">
                          {t.badge}
                        </div>
                      )}

                      {selected && (
                        <div className="absolute inset-0 bg-brand-accent/10" />
                      )}

                      <div
                        className={cn(
                          "absolute inset-x-1.5 bottom-1.5 transition-all duration-150",
                          selected
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
                        )}
                      >
                        <div
                          className={cn(
                            "flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-bold uppercase tracking-wider",
                            selected
                              ? "bg-brand-accent text-brand-bg"
                              : "bg-brand-accent text-brand-bg",
                          )}
                        >
                          {saving ? (
                            "..."
                          ) : selected ? (
                            <>
                              <CheckCircle2 size={10} /> Active
                            </>
                          ) : (
                            "Use this"
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "px-2 py-1.5 border-t text-[10px] font-medium truncate transition-colors",
                        selected
                          ? "border-brand-accent/30 bg-brand-accent/8 text-brand-accent"
                          : "border-white/[0.06] bg-[#15151e] text-white/50",
                      )}
                    >
                      {t.title}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

// ── AvatarChip ────────────────────────────────────────────────────────────────

function CardComp({
  card,
  selected,
  isInConnectMode,
  onPtrDown,
  onPortPtrDown,
  onVideoOpen,
  onRegenerateBeat,
  onDelete,
  onPreview,
}: {
  card: Card;
  selected: boolean;
  isInConnectMode: boolean;
  onPtrDown: (e: React.PointerEvent, id: string) => void;
  onPortPtrDown: (e: React.PointerEvent, id: string, side: Side) => void;
  onVideoOpen?: (c: GeneratedCard) => void;
  onRegenerateBeat?: (c: GeneratedCard) => void;
  onDelete: (id: string) => void;
  onPreview?: (url: string, label: string) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      data-card
      style={{
        position: "absolute",
        left: card.x,
        top: card.y,
        width: CARD_W,
        userSelect: "none",
        touchAction: "none",
        zIndex: selected ? 50 : 10,
        cursor: isInConnectMode ? "crosshair" : "grab",
      }}
      onPointerDown={(e) => onPtrDown(e, card.id)}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.82, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "rounded-2xl overflow-visible transition-all duration-150",
          selected
            ? "ring-[1.5px] ring-brand-accent shadow-[0_0_32px_rgba(139,92,246,0.22),0_8px_40px_rgba(0,0,0,0.6)]"
            : "ring-1 ring-white/[0.08] shadow-[0_4px_28px_rgba(0,0,0,0.5)]",
        )}
      >
        {/* Image */}
        <div
          className={cn(
            "relative bg-[#1b1b24] overflow-hidden",
            (card.type === "generated" && !(card as GeneratedCard).prompt) ||
              card.type === "video"
              ? "rounded-2xl"
              : "rounded-t-2xl",
          )}
          style={{ height: CARD_IMG_H }}
        >
          {card.type === "generated" && card.isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="relative w-9 h-9">
                <div className="absolute inset-0 rounded-full border-[1.5px] border-brand-accent/20 animate-ping" />
                <div className="absolute inset-[3px] rounded-full border-[1.5px] border-brand-accent border-t-transparent animate-spin" />
              </div>
              <span className="text-[10px] text-white/30 font-mono tracking-widest">
                GENERATING
              </span>
            </div>
          ) : card.type === "generated" && card.hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <AlertCircle size={18} className="text-red-400/50" />
              <span className="text-[10px] text-white/25 font-mono">
                Generation failed
              </span>
            </div>
          ) : card.type === "video" && card.status === "pending" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="relative w-9 h-9">
                <div className="absolute inset-0 rounded-full border-[1.5px] border-brand-accent/20 animate-ping" />
                <div className="absolute inset-[3px] rounded-full border-[1.5px] border-brand-accent border-t-transparent animate-spin" />
              </div>
              <span className="text-[10px] text-white/30 font-mono tracking-widest">
                RENDERING VIDEO
              </span>
            </div>
          ) : card.type === "video" && card.status === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
              <AlertCircle size={18} className="text-red-400/50" />
              <span className="text-[10px] text-white/25 font-mono">
                Video failed
              </span>
              {card.errorMessage ? (
                <span className="text-[10px] text-red-200/70 line-clamp-3">{card.errorMessage}</span>
              ) : null}
            </div>
          ) : card.type === "video" && card.videoUrl ? (
            <video
              data-no-card-drag
              src={card.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt=""
              className={cn(
                "w-full h-full",
                card.type === "generated" ? "object-contain" : "object-cover",
              )}
              draggable={false}
            />
          ) : null}

          {/* Action overlay — delete only */}
          <div
            className={cn(
              "absolute inset-0 flex items-start justify-end p-2 transition-opacity duration-150 pointer-events-none",
              hover || selected ? "opacity-100" : "opacity-0",
            )}
          >
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onDelete(card.id)}
              className="p-1.5 rounded-lg bg-black/75 border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all pointer-events-auto"
              title="Delete"
            >
              <X size={11} />
            </button>
          </div>

          {/* Type badge */}
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <span
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full font-mono tracking-widest leading-none",
                card.type === "product"
                  ? "bg-black/60 text-white/35 border border-white/10"
                  : card.type === "video"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                    : "bg-brand-accent/15 text-brand-accent border border-brand-accent/25",
              )}
            >
              {card.type === "product" ? "PRODUCT" : card.type === "video" ? "VIDEO" : "AI GEN"}
            </span>
          </div>

          {/* ── Connection ports (product only) ────────────────────────────── */}
          {card.type === "product" &&
            (
              [
                {
                  side: "right" as Side,
                  style: { right: -PORT_R, top: CARD_IMG_H / 2 - PORT_R },
                },
                {
                  side: "left" as Side,
                  style: { left: -PORT_R, top: CARD_IMG_H / 2 - PORT_R },
                },
                {
                  side: "top" as Side,
                  style: { left: CARD_W / 2 - PORT_R, top: -PORT_R },
                },
                {
                  side: "bottom" as Side,
                  style: {
                    left: CARD_W / 2 - PORT_R,
                    top: CARD_IMG_H - PORT_R,
                  },
                },
              ] satisfies { side: Side; style: React.CSSProperties }[]
            ).map(({ side, style }) => (
              <motion.div
                key={side}
                animate={{
                  opacity: hover || selected || isInConnectMode ? 1 : 0,
                  scale: hover || selected || isInConnectMode ? 1 : 0.5,
                }}
                transition={{ duration: 0.15 }}
                data-port
                data-card-id={card.id}
                data-port-side={side}
                style={{
                  position: "absolute",
                  ...style,
                  width: PORT_R * 2,
                  height: PORT_R * 2,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 40% 35%, #a78bfa, #7c3aed)",
                  border: "2px solid #0b0b0f",
                  cursor: "crosshair",
                  zIndex: 200,
                  boxShadow: "0 0 8px rgba(139,92,246,0.6)",
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onPortPtrDown(e, card.id, side);
                }}
                title="Drag to connect"
              />
            ))}
        </div>

        {/* Footer */}
        {(card.type === "product" ||
          card.type === "video" ||
          (card as GeneratedCard).prompt ||
          (card as GeneratedCard).projectName) && (
          <div
            className="bg-[#15151e] px-3 py-2.5 rounded-b-2xl"
            style={{ minHeight: card.type === "product" ? CARD_FOOT_H : undefined }}
          >
            {card.type === "product" ? (
              <p className="text-[11px] text-white/35 truncate font-mono mt-1">
                {card.fileName}
              </p>
            ) : card.type === "video" ? (
              <div className="flex flex-col gap-1">
                <p className="text-[11px] text-emerald-200/90 truncate font-medium">{card.title}</p>
                {card.stepTitle ? (
                  <p className="text-[10px] text-emerald-300/70">{card.stepTitle}</p>
                ) : null}
                {card.projectName ? (
                  <p className="text-[10px] text-white/35 truncate">{card.projectName}</p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {(card as GeneratedCard).projectName && (
                  <a
                    href={`/projects/${(card as GeneratedCard).projectId}`}
                    target="_blank"
                    rel="noreferrer"
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] text-brand-accent/70 hover:text-brand-accent truncate font-medium transition-colors"
                    title="View project"
                  >
                    <FolderOpen size={10} className="shrink-0" />
                    <span className="truncate">{(card as GeneratedCard).projectName}</span>
                  </a>
                )}
                {(card as GeneratedCard).prompt && (
                  <p className="text-[11px] text-white/25 line-clamp-2 font-mono leading-relaxed">
                    {(card as GeneratedCard).prompt}
                  </p>
                )}
                {(card as GeneratedCard).flowStepTitle && (
                  <p className="text-[10px] text-brand-accent/75 font-semibold">
                    {(card as GeneratedCard).flowStepTitle}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Right-side action sidebar — outside overflow-hidden image area */}
      <div
        className={cn(
          "absolute flex flex-col gap-1.5 transition-opacity duration-150",
          hover || selected ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{ top: 8, left: CARD_W + 8 }}
      >
        {card.type === "generated" && !card.isLoading && !card.hasError && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onVideoOpen?.(card as GeneratedCard)}
            className="p-2 rounded-xl bg-[#1b1b2e]/90 border border-white/10 text-white/50 hover:text-white hover:bg-brand-accent/40 hover:border-brand-accent/30 transition-all backdrop-blur-sm"
            title="Create video"
          >
            <Film size={13} />
          </button>
        )}
        {card.type === "video" && card.status === "ready" && card.videoUrl && (
          <a
            onPointerDown={(e) => e.stopPropagation()}
            href={card.videoUrl}
            download={card.fileName ?? `${card.id}.mp4`}
            className="p-2 rounded-xl bg-[#1b1b2e]/90 border border-white/10 text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all backdrop-blur-sm"
            title="Download video"
          >
            <Download size={13} />
          </a>
        )}
        {card.type === "video" && card.storageFileId && card.videoUrl && (
          <div onPointerDown={(e) => e.stopPropagation()}>
            <TikTokShareButton
              storageFileId={card.storageFileId}
              fileName={card.fileName ?? "genetrify-video.mp4"}
              fileUrl={card.videoUrl}
              buttonLabel=""
              className="h-8 w-8"
            />
          </div>
        )}
        {card.type === "generated" && !card.isLoading && (card as GeneratedCard).flowGroupId && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRegenerateBeat?.(card as GeneratedCard)}
            className="p-2 rounded-xl bg-[#1b1b2e]/90 border border-white/10 text-white/50 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-400/20 transition-all backdrop-blur-sm"
            title="Regenerate beat image"
          >
            <RefreshCw size={13} />
          </button>
        )}
        {card.type === "generated" &&
          !card.isLoading &&
          !card.hasError &&
          card.imageUrl && (
            <a
              onPointerDown={(e) => e.stopPropagation()}
              href={card.imageUrl}
              download={`genetrify-${card.id}.png`}
              className="p-2 rounded-xl bg-[#1b1b2e]/90 border border-white/10 text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all backdrop-blur-sm"
              title="Download image"
            >
              <Download size={13} />
            </a>
          )}
        {card.type === "generated" &&
          !card.isLoading &&
          !card.hasError &&
          (card as GeneratedCard).projectId && (
            <a
              onPointerDown={(e) => e.stopPropagation()}
              href={`/projects/${(card as GeneratedCard).projectId}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-[#1b1b2e]/90 border border-white/10 text-white/50 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/20 transition-all backdrop-blur-sm"
              title="View project"
            >
              <ExternalLink size={13} />
            </a>
          )}
        {card.imageUrl &&
          !(card.type === "generated" && (card.isLoading || card.hasError)) && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (!card.imageUrl) return;
                const previewLabel =
                  card.type === "product"
                    ? card.fileName
                    : card.type === "generated"
                      ? card.prompt
                      : card.title;
                onPreview?.(card.imageUrl, previewLabel);
              }}
              className="p-2 rounded-xl bg-[#1b1b2e]/90 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
              title="Preview image"
            >
              <Maximize2 size={13} />
            </button>
          )}
      </div>
    </div>
  );
}

// ── CtxPanel (shared between desktop inline + mobile bottom sheet) ────────────

function CtxPanel({
  selCards,
  selProducts,
  prompt,
  isGenerating,
  errorMessage,
  promptInputRef,
  onPromptChange,
  onGenerate,
  onOpenFlowPicker,
  onDelete,
}: {
  selCards: Card[];
  selProducts: Card[];
  prompt: string;
  isGenerating: boolean;
  errorMessage?: string;
  promptInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
  onOpenFlowPicker: () => void;
  onDelete: () => void;
}) {
  const canGenerate =
    selProducts.length > 0 || selCards.some((c) => c.type === "generated");
  const isRegenerate =
    selProducts.length === 0 && selCards.some((c) => c.type === "generated");
  const canGenerateFlow = selProducts.length > 0;

  return (
    <div className="w-full sm:w-[288px] bg-[#17171f] border border-white/15 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] ring-1 ring-white/[0.06] p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex -space-x-2">
          {selCards.slice(0, 3).map((c, i) => (
            <div
              key={c.id}
              className="w-5 h-5 rounded-full overflow-hidden border-[1.5px] border-[#17171f] bg-white/10"
              style={{ zIndex: 3 - i }}
            >
              {c.imageUrl && (
                <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
        <span className="flex-1 text-[11px] leading-snug text-zinc-200">
          {isRegenerate
            ? "Edit prompt and Go to regenerate"
            : selProducts.length === 0
              ? "Select product cards to generate"
              : selProducts.length === 1
                ? "Generate model for this product"
                : `Generate outfit - ${selProducts.length} connected items`}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete selected"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        <textarea
          ref={promptInputRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onGenerate();
            }
          }}
          placeholder={
            isRegenerate
              ? "Edit prompt to regenerate..."
              : selProducts.length > 1
                ? "Describe the outfit..."
                : "Describe the product..."
          }
          className="w-full min-h-[72px] max-h-40 resize-y overflow-y-auto bg-zinc-900/80 border border-white/15 rounded-xl px-3 py-2 text-xs leading-relaxed text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-brand-accent/55 focus:ring-1 focus:ring-brand-accent/25 transition-colors font-mono [scrollbar-width:thin] [scrollbar-color:rgba(192,132,252,0.75)_rgba(255,255,255,0.08)]"
        />
        <div className="flex w-full gap-2 items-stretch">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
            className={cn(
              "shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all",
              isGenerating || !canGenerate
                ? "bg-white/[0.04] text-white/[0.18] cursor-not-allowed"
                : "bg-brand-accent text-white hover:bg-brand-accent-hover shadow-[0_0_18px_rgba(139,92,246,0.38)]",
            )}
          >
            <Sparkles size={11} />
            {isGenerating ? "..." : "Go"}
          </button>
          {canGenerateFlow && (
            <button
              type="button"
              onClick={onOpenFlowPicker}
              disabled={isGenerating}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all",
                isGenerating
                  ? "border-white/[0.06] bg-white/[0.03] text-white/[0.18] cursor-not-allowed"
                  : "border-brand-accent/45 bg-brand-accent/12 text-white hover:bg-brand-accent/18 hover:border-brand-accent/55",
              )}
            >
              <Film size={11} />
              {isGenerating ? "..." : "Flow"}
            </button>
          )}
        </div>
      </div>
      {errorMessage ? (
        <p className="mt-2 text-[11px] leading-relaxed text-red-300/80">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

// ── StudioCanvas ──────────────────────────────────────────────────────────────

export function StudioCanvas({
  userId,
  cameraTemplates,
  movementTemplates,
  videoFlowTemplates,
  avatarTemplates,
  backgroundTemplates,
}: StudioCanvasProps) {
  const notify = useNotify();
  const {
    avatarConfig,
    backgroundConfig,
    shotTypeTemplateId: cameraTemplateId,
    motionStyleTemplateId: movementTemplateId,
    videoFlowTemplateId,
  } = usePreferences();
  const [activeTemplatePanel, setActiveTemplatePanel] =
    useState<TemplateCategory | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selBox, setSelBox] = useState<SelBox | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [videoCard, setVideoCard] = useState<GeneratedCard | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModel>(
    VIDEO_MODELS[0],
  );
  const [selectedVideoSettings, setSelectedVideoSettings] =
    useState<VideoGenerationSettings>(
      getDefaultVideoGenerationSettings(VIDEO_MODELS[0]),
    );
  const selectedVideoTokenCost = getVideoGenerationTokenCost(
    selectedVideoModel,
    selectedVideoSettings,
  );
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const [videoMovement, setVideoMovement] = useState(movementTemplateId);
  const [videoFlowId, setVideoFlowId] = useState(videoFlowTemplateId);
  const [videoFlowStepId, setVideoFlowStepId] = useState<string>("");
  const [showFlowPickerModal, setShowFlowPickerModal] = useState(false);
  const [videoWizardStep, setVideoWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [videoResults, setVideoResults] = useState<GeneratedVideoResult[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isMouseInCanvas, setIsMouseInCanvas] = useState(false);

  // Connection-draw state
  const [connectingFrom, setConnectingFrom] = useState<{
    id: string;
    side: Side;
  } | null>(null);
  const [pendingEnd, setPendingEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Stable refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const cardsRef = useRef(cards);
  const selectedRef = useRef(selectedIds);
  const connectionsRef = useRef(connections);
  const connectingRef = useRef(connectingFrom);
  const hydratedRef = useRef(false);
  const dragMode = useRef<"card" | "select" | "pan" | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const cardStartPos = useRef<Map<string, { x: number; y: number }>>(new Map());
  const panStart = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const didDrag = useRef(false);
  const storageKeyRef = useRef(getStudioStateKey(userId));
  const previousCardsRef = useRef<Card[]>([]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    selectedRef.current = selectedIds;
  }, [selectedIds]);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);
  useEffect(() => {
    connectingRef.current = connectingFrom;
  }, [connectingFrom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    const storageKey = getStudioStateKey(userId);
    const previousCards = cardsRef.current;

    storageKeyRef.current = storageKey;
    hydratedRef.current = false;
    revokeProductObjectUrls(previousCards);

    setCards([]);
    setConnections([]);
    setSelectedIds(new Set());
    setPrompt("");
    setZoom(1);
    setPan({ x: 0, y: 0 });

    let cancelled = false;

    loadStudioState(storageKey)
      .then(async (saved) => {
        if (cancelled || storageKeyRef.current !== storageKey) return;
        if (!saved) return;
        const hydratedCards = await hydrateGeneratedCardVideos(saved.cards);
        if (cancelled || storageKeyRef.current !== storageKey) return;
        const restoredCards = hydratedCards.map((card) => {
          if (card.type === "product") {
            return {
              ...card,
              imageUrl: URL.createObjectURL(card.file),
            } satisfies ProductCard;
          }
          if (card.type === "generated") {
            return card satisfies GeneratedCard;
          }
          return card satisfies VideoCard;
        });
        setCards(restoredCards);
        setConnections(saved.connections ?? []);
        setSelectedIds(new Set(saved.selectedIds ?? []));
        setPrompt(saved.prompt ?? "");
        setZoom(saved.zoom ?? 1);
        setPan(saved.pan ?? { x: 0, y: 0 });
      })
      .catch(() => {
        clearStudioState(storageKey).catch(() => {});
      })
      .finally(() => {
        if (!cancelled && storageKeyRef.current === storageKey) {
          hydratedRef.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);
  useEffect(() => {
    if (!hydratedRef.current) return;
    const payload: PersistedStudioState = {
      cards: cards.map((card) => {
        if (card.type === "product") {
          return {
            id: card.id,
            type: "product",
            x: card.x,
            y: card.y,
            fileName: card.fileName,
            file: card.file,
            projectId: card.projectId,
            projectName: card.projectName,
          } satisfies PersistedProductCard;
        }
        if (card.type === "generated") {
          return {
            id: card.id,
            type: "generated",
            x: card.x,
            y: card.y,
            imageUrl: card.imageUrl,
            prompt: card.prompt,
            sourceIds: card.sourceIds,
            projectId: card.projectId,
            projectName: card.projectName,
            generatedImageId: card.generatedImageId,
            videoUrl: card.videoUrl,
            videoFileName: card.videoFileName,
            videoStorageFileId: card.videoStorageFileId,
            generatedVideos: card.generatedVideos,
            flowGroupId: card.flowGroupId,
            flowTitle: card.flowTitle,
            flowStepId: card.flowStepId,
            flowStepTitle: card.flowStepTitle,
            flowShotTypeTemplateId: card.flowShotTypeTemplateId,
            flowMotionStyleTemplateId: card.flowMotionStyleTemplateId,
            isLoading: card.isLoading,
            hasError: card.hasError,
          } satisfies PersistedGeneratedCard;
        }
        return {
          id: card.id,
          type: "video",
          imageUrl: card.imageUrl,
          x: card.x,
          y: card.y,
          sourceGeneratedCardId: card.sourceGeneratedCardId,
          sourceGeneratedImageId: card.sourceGeneratedImageId,
          projectId: card.projectId,
          projectName: card.projectName,
          title: card.title,
          stepId: card.stepId,
          stepTitle: card.stepTitle,
          videoUrl: card.videoUrl,
          fileName: card.fileName,
          storageFileId: card.storageFileId,
          status: card.status,
          errorMessage: card.errorMessage,
        } satisfies PersistedVideoCard;
      }),
      connections,
      selectedIds: [...selectedIds],
      prompt,
      zoom,
      pan,
    };
    saveStudioState(storageKeyRef.current, payload).catch(() => {});
  }, [cards, connections, pan, prompt, selectedIds, zoom]);
  useEffect(() => {
    const previousCards = previousCardsRef.current;
    const removedCards = previousCards.filter(
      (prev) =>
        prev.type === "product" &&
        !cards.some((card) => card.id === prev.id && card.type === "product"),
    );
    if (removedCards.length > 0) {
      revokeProductObjectUrls(removedCards);
    }
    previousCardsRef.current = cards;
  }, [cards]);
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if ((e.ctrlKey || e.metaKey) && isMouseInCanvas) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", handleGlobalWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleGlobalWheel);
  }, [isMouseInCanvas]);
  useEffect(() => {
    const el = promptInputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
  }, [prompt, selectedIds]);
  useEffect(() => {
    setGenerateError("");
  }, [prompt, selectedIds]);

  // ── Keyboard: Delete / Backspace removes selected cards ──────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      if (selectedRef.current.size === 0) return;
      e.preventDefault();
      const ids = selectedRef.current;
      setCards((prev) => prev.filter((c) => !ids.has(c.id)));
      setConnections((prev) =>
        prev.filter((cn) => !ids.has(cn.from) && !ids.has(cn.to)),
      );
      setSelectedIds(new Set());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Canvas coordinate helper ─────────────────────────────────────────────────
  const toCanvas = useCallback(
    (cx: number, cy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const r = canvas.getBoundingClientRect();
      return {
        x: (cx - r.left - pan.x) / zoom,
        y: (cy - r.top - pan.y) / zoom,
      };
    },
    [pan.x, pan.y, zoom],
  );

  const zoomTo = useCallback(
    (nextZoom: number, anchor?: { clientX: number; clientY: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const r = canvas.getBoundingClientRect();
      const clampedZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, Number(nextZoom.toFixed(3))),
      );
      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const anchorClientX = anchor?.clientX ?? r.left + r.width / 2;
      const anchorClientY = anchor?.clientY ?? r.top + r.height / 2;
      const worldX = (anchorClientX - r.left - currentPan.x) / currentZoom;
      const worldY = (anchorClientY - r.top - currentPan.y) / currentZoom;

      setZoom(clampedZoom);
      setPan({
        x: anchorClientX - r.left - worldX * clampedZoom,
        y: anchorClientY - r.top - worldY * clampedZoom,
      });
    },
    [],
  );

  // ── Pre-fill prompt when a generated card is selected ────────────────────────
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const hasProduct = cards.some(
      (c) => c.type === "product" && selectedIds.has(c.id),
    );
    if (hasProduct) return;
    const genCard = cards.find(
      (c) => c.type === "generated" && selectedIds.has(c.id),
    ) as GeneratedCard | undefined;
    if (genCard) setPrompt(genCard.prompt);
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global pointer move/up ───────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pos = toCanvas(e.clientX, e.clientY);
      if (!pos) return;

      // Connection-draw mode
      if (connectingRef.current !== null) {
        setPendingEnd(pos);
        return;
      }

      if (!dragMode.current) return;
      const dx = pos.x - dragStart.current.x;
      const dy = pos.y - dragStart.current.y;
      if (!didDrag.current && Math.hypot(dx, dy) > DRAG_THRESH)
        didDrag.current = true;
      if (!didDrag.current) return;

      if (dragMode.current === "select") {
        const box: SelBox = {
          x1: dragStart.current.x,
          y1: dragStart.current.y,
          x2: pos.x,
          y2: pos.y,
        };
        setSelBox(box);
        const ids = new Set<string>();
        cardsRef.current.forEach((c) => {
          if (cardInBox(c, box)) ids.add(c.id);
        });
        setSelectedIds(ids);
      } else if (dragMode.current === "pan") {
        setPan({
          x: panStart.current.x + (e.clientX - dragStart.current.x),
          y: panStart.current.y + (e.clientY - dragStart.current.y),
        });
      } else {
        setCards((prev) =>
          prev.map((c) => {
            const s = cardStartPos.current.get(c.id);
            if (!s) return c;
            return { ...c, x: s.x + dx, y: s.y + dy };
          }),
        );
      }
    };

    const onUp = (e: PointerEvent) => {
      // Finish connection draw
      if (connectingRef.current !== null) {
        const pos = toCanvas(e.clientX, e.clientY);
        if (!pos) {
          setConnectingFrom(null);
          setPendingEnd(null);
          return;
        }
        const cf = connectingRef.current;
        const fromId = cf?.id;
        const fromSide = cf?.side ?? "right";
        const target = cardsRef.current.find(
          (c) =>
            c.type === "product" &&
            c.id !== fromId &&
            pos.x >= c.x &&
            pos.x <= c.x + CARD_W &&
            pos.y >= c.y &&
            pos.y <= c.y + CARD_H,
        );
        if (target && fromId) {
          const dup = connectionsRef.current.some(
            (cn) =>
              (cn.from === fromId && cn.to === target.id) ||
              (cn.from === target.id && cn.to === fromId),
          );
          if (!dup) {
            const toSide = nearestSide(target, pos);
            setConnections((prev) => [
              ...prev,
              { id: uid(), from: fromId, fromSide, to: target.id, toSide },
            ]);
          }
        }
        setConnectingFrom(null);
        setPendingEnd(null);
        return;
      }
      dragMode.current = null;
      setSelBox(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [toCanvas]);

  // ── Pointer handlers ──────────────────────────────────────────────────────────
  const onCanvasPtrDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-card]")) return;
      if (connectingRef.current !== null) {
        setConnectingFrom(null);
        setPendingEnd(null);
        return;
      }
      if (e.shiftKey) {
        setSelectedIds(new Set());
        const pos = toCanvas(e.clientX, e.clientY);
        if (!pos) return;
        dragMode.current = "select";
        dragStart.current = pos;
        setSelBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
      } else {
        setSelectedIds(new Set());
        dragMode.current = "pan";
        dragStart.current = { x: e.clientX, y: e.clientY };
        panStart.current = pan;
      }
      didDrag.current = false;
    },
    [pan, toCanvas],
  );

  const onCardPtrDown = useCallback(
    (e: React.PointerEvent, cardId: string) => {
      e.stopPropagation();
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "video,button,a,input,textarea,select,[data-no-card-drag]",
        )
      ) {
        return;
      }
      if (connectingRef.current !== null) return;
      const pos = toCanvas(e.clientX, e.clientY);
      if (!pos) return;
      dragMode.current = "card";
      dragStart.current = pos;
      didDrag.current = false;

      const isSelected = selectedRef.current.has(cardId);
      if (e.shiftKey) {
        setSelectedIds((prev) => {
          const n = new Set(prev);
          if (n.has(cardId)) n.delete(cardId);
          else n.add(cardId);
          return n;
        });
      } else if (!isSelected) {
        // Auto-expand to connected group for product cards
        const card = cardsRef.current.find((c) => c.id === cardId);
        if (card?.type === "product") {
          setSelectedIds(
            expandGroup(new Set([cardId]), connectionsRef.current),
          );
        } else {
          setSelectedIds(new Set([cardId]));
        }
      }

      const idsToMove =
        isSelected && !e.shiftKey ? [...selectedRef.current] : [cardId];
      const snap = new Map<string, { x: number; y: number }>();
      cardsRef.current.forEach((c) => {
        if (idsToMove.includes(c.id)) snap.set(c.id, { x: c.x, y: c.y });
      });
      cardStartPos.current = snap;
    },
    [toCanvas],
  );

  const onFlowGroupPtrDown = useCallback(
    (e: React.PointerEvent, groupId: string) => {
      e.stopPropagation();
      if (connectingRef.current !== null) return;
      const pos = toCanvas(e.clientX, e.clientY);
      if (!pos) return;

      const groupCards = cardsRef.current.filter(
        (card): card is GeneratedCard =>
          card.type === "generated" && card.flowGroupId === groupId,
      );
      if (groupCards.length === 0) return;

      const groupIds = new Set(groupCards.map((card) => card.id));
      setSelectedIds(groupIds);

      dragMode.current = "card";
      dragStart.current = pos;
      didDrag.current = false;
      cardStartPos.current = new Map(
        groupCards.map((card) => [card.id, { x: card.x, y: card.y }]),
      );
    },
    [toCanvas],
  );

  const onPortPtrDown = useCallback(
    (e: React.PointerEvent, cardId: string, side: Side) => {
      e.stopPropagation();
      const pos = toCanvas(e.clientX, e.clientY);
      if (!pos) return;
      setConnectingFrom({ id: cardId, side });
      setPendingEnd(pos);
    },
    [toCanvas],
  );

  // ── File handling ─────────────────────────────────────────────────────────────
  const addFiles = useCallback(
    async (files: File[], dropX?: number, dropY?: number) => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      if (!imgs.length) return;
      const existing = cardsRef.current.filter(
        (c) => c.type === "product",
      ).length;
      const toAdd = imgs;
      if (!toAdd.length) return;

      // Place near viewport center when no explicit drop position given
      const r = canvasRef.current?.getBoundingClientRect();
      const vpCx = r
        ? (r.width / 2 - panRef.current.x) / zoomRef.current
        : CANVAS_W / 2;
      const vpCy = r
        ? (r.height / 2 - panRef.current.y) / zoomRef.current
        : CANVAS_H / 2;
      const totalW = toAdd.length * CARD_W + (toAdd.length - 1) * GAP;
      const baseX = dropX ?? vpCx - totalW / 2;
      const baseY = dropY ?? vpCy - CARD_H / 2;

      const nextCards = toAdd.map((file, i) => ({
        id: uid(),
        type: "product" as const,
        x: baseX + i * (CARD_W + GAP),
        y: baseY,
        imageUrl: URL.createObjectURL(file),
        fileName: file.name,
        file,
      }));

      setCards((prev) => [...prev, ...nextCards]);
    },
    [],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!canvasRef.current?.contains(e.relatedTarget as Node))
      setIsDragOver(false);
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const r = canvasRef.current?.getBoundingClientRect();
      const x = r
        ? (e.clientX - r.left - pan.x) / zoom - CARD_W / 2
        : CANVAS_W / 2;
      const y = r
        ? (e.clientY - r.top - pan.y) / zoom - CARD_H / 2
        : CANVAS_H / 2;
      addFiles(Array.from(e.dataTransfer.files), x, y);
    },
    [addFiles, pan.x, pan.y, zoom],
  );

  const onCanvasWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const intensity = e.deltaMode === 1 ? 0.08 : 0.0025;
      const scale = Math.exp(-e.deltaY * intensity);
      zoomTo(zoomRef.current * scale, {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    },
    [zoomTo],
  );

  // ── Generate ──────────────────────────────────────────────────────────────────
  const uploadStudioProducts = useCallback(async (
    productCards: ProductCard[],
    existingProjectId?: string,
  ) => {
    const fd = new FormData();
    fd.append("usePreferences", "true");
    if (existingProjectId) {
      fd.append("projectId", existingProjectId);
    }
    productCards.forEach((c) => fd.append("products", c.file));

    const upRes = await fetch("/api/upload", { method: "POST", body: fd });
    if (!upRes.ok) {
      const error = await upRes.json().catch(() => null);
      throw new Error(error?.error ?? "Upload failed");
    }

    return await upRes.json() as { projectId: string; projectName?: string };
  }, []);

  const generateStudioImage = useCallback(async ({
    projectId,
    productDescription,
    shotTypeId,
  }: {
    projectId: string;
    productDescription: string;
    shotTypeId: string;
  }) => {
    const genRes = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        productDescription,
        cameraTemplateId: shotTypeId,
      }),
    });
    if (!genRes.ok) {
      const error = await genRes.json().catch(() => null);
      throw new Error(error?.error ?? "Generate failed");
    }

    let imageUrl = "";
    let generatedImageId: string | undefined;
    for await (const evt of readNDJSON(genRes)) {
      if (
        evt.type === "image" &&
        (evt as { image?: { id?: string; url?: string } }).image?.url
      ) {
        imageUrl = (evt as { image: { url: string } }).image.url;
        generatedImageId = (evt as { image: { id?: string } }).image.id;
      }
    }

    return { imageUrl, generatedImageId };
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerateError("");

    // Expand selection to include connected group
    const expanded = expandGroup(selectedRef.current, connectionsRef.current);
    let productCards = cardsRef.current.filter(
      (c) => expanded.has(c.id) && c.type === "product",
    ) as ProductCard[];

    // If no products selected, check if a generated card is selected — regenerate from its sources
    if (!productCards.length) {
      const genCard = cardsRef.current.find(
        (c) => c.type === "generated" && selectedRef.current.has(c.id),
      ) as GeneratedCard | undefined;
      if (genCard) {
        productCards = cardsRef.current.filter(
          (c) => c.type === "product" && genCard.sourceIds.includes(c.id),
        ) as ProductCard[];
      }
    }

    if (!productCards.length) return;
    const normalizedPrompt = prompt.trim();
    const resolvedProject = resolveStudioProject(productCards, cardsRef.current);
    if (resolvedProject.error) {
      setGenerateError(resolvedProject.error);
      return;
    }

    const bounds = selBounds(cardsRef.current, selectedRef.current);
    const tempId = uid();
    const sourceIds = productCards.map((c) => c.id);
    setCards((prev) => [
      ...prev,
      {
        id: tempId,
        type: "generated",
        x: bounds ? bounds.right + GAP : 60,
        y: bounds ? bounds.top : 80,
        imageUrl: "",
        prompt: normalizedPrompt,
        sourceIds,
        projectId: resolvedProject.projectId,
        projectName: resolvedProject.projectName,
        isLoading: true,
      } satisfies GeneratedCard,
    ]);
    setIsGenerating(true);

    try {
      const { projectId, projectName } = await uploadStudioProducts(
        productCards,
        resolvedProject.projectId,
      );
      const { imageUrl, generatedImageId } = await generateStudioImage({
        projectId,
        productDescription: normalizedPrompt,
        shotTypeId: cameraTemplateId,
      });
      setCards((prev) =>
        prev.map((c) =>
          c.type === "product" && sourceIds.includes(c.id)
            ? {
                ...c,
                projectId,
                projectName,
              }
            : c.id === tempId
            ? {
                ...c,
                imageUrl,
                projectId,
                projectName,
                generatedImageId,
                isLoading: false,
                hasError: !imageUrl,
              }
            : c,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generation failed";
      setGenerateError(message);
      notify.error({ title: "Generation failed", description: message });
      setCards((prev) =>
        prev.map((c) =>
          c.id === tempId ? { ...c, isLoading: false, hasError: true } : c,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, cameraTemplateId, generateStudioImage, notify, uploadStudioProducts]);

  const handleGenerateFlow = useCallback(async () => {
    setGenerateError("");

    const expanded = expandGroup(selectedRef.current, connectionsRef.current);
    const productCards = cardsRef.current.filter(
      (c) => expanded.has(c.id) && c.type === "product",
    ) as ProductCard[];

    if (!productCards.length) return;
    const flowTemplate =
      videoFlowTemplates.find((template) => template.id === videoFlowId) ?? null;
    const flowSteps = getVideoFlowSteps(flowTemplate);

    if (!flowTemplate || flowSteps.length === 0) {
      setGenerateError("Select a video flow first.");
      return;
    }

    const normalizedPrompt = prompt.trim();
    const resolvedProject = resolveStudioProject(productCards, cardsRef.current);
    if (resolvedProject.error) {
      setGenerateError(resolvedProject.error);
      return;
    }

    const bounds = selBounds(cardsRef.current, selectedRef.current);
    const flowGroupId = uid();
    const baseX = bounds ? bounds.right + GAP + 24 : 120;
    const baseY = bounds ? bounds.top : 80;
    const sourceIds = productCards.map((c) => c.id);

    const tempCards = flowSteps.map((step, index) => ({
      id: `${flowGroupId}-${step.id}`,
      type: "generated" as const,
      x: baseX + index * (CARD_W + GAP),
      y: baseY + 36,
      imageUrl: "",
      prompt: normalizedPrompt,
      sourceIds,
      projectId: resolvedProject.projectId,
      projectName: resolvedProject.projectName,
      flowGroupId,
      flowTitle: flowTemplate.title,
      flowStepId: step.id,
      flowStepTitle: step.title,
      flowShotTypeTemplateId: step.shotTypeTemplateId,
      flowMotionStyleTemplateId: step.motionStyleTemplateId,
      isLoading: true,
    } satisfies GeneratedCard));

    setCards((prev) => [...prev, ...tempCards]);
    setSelectedIds(new Set(tempCards.map((card) => card.id)));
    setIsGenerating(true);

    try {
      const { projectId, projectName } = await uploadStudioProducts(
        productCards,
        resolvedProject.projectId,
      );

      setCards((prev) =>
        prev.map((c) =>
          c.type === "product" && sourceIds.includes(c.id)
            ? { ...c, projectId, projectName }
            : c.type === "generated" && c.flowGroupId === flowGroupId
              ? { ...c, projectId, projectName }
              : c,
        ),
      );

      for (const step of flowSteps) {
        const shotTypeId = step.shotTypeTemplateId ?? cameraTemplateId;
        const { imageUrl, generatedImageId } = await generateStudioImage({
          projectId,
          productDescription: normalizedPrompt,
          shotTypeId,
        });

        setCards((prev) =>
          prev.map((c) =>
            c.type === "generated" && c.flowGroupId === flowGroupId && c.flowStepId === step.id
              ? {
                  ...c,
                  imageUrl,
                  projectId,
                  projectName,
                  generatedImageId,
                  isLoading: false,
                  hasError: !imageUrl,
                }
              : c,
          ),
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Flow generation failed";
      setGenerateError(message);
      notify.error({ title: "Flow generation failed", description: message });
      setCards((prev) =>
        prev.map((c) =>
          c.type === "generated" && c.flowGroupId === flowGroupId
            ? { ...c, isLoading: false, hasError: true }
            : c,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    cameraTemplateId,
    generateStudioImage,
    notify,
    prompt,
    uploadStudioProducts,
    videoFlowId,
    videoFlowTemplates,
  ]);

  const regenerateFlowBeat = useCallback(async (card: GeneratedCard) => {
    if (!card.flowStepId || !card.projectId) return;
    setGenerateError("");
    setIsGenerating(true);
    setCards((prev) =>
      prev.map((item) =>
        item.type === "generated" && item.id === card.id
          ? { ...item, isLoading: true, hasError: false }
          : item,
      ),
    );

    try {
      const shotTypeId = card.flowShotTypeTemplateId ?? cameraTemplateId;
      const { imageUrl, generatedImageId } = await generateStudioImage({
        projectId: card.projectId,
        productDescription: card.prompt,
        shotTypeId,
      });

      setCards((prev) =>
        prev.map((item) =>
          item.type === "generated" && item.id === card.id
            ? {
                ...item,
                imageUrl,
                generatedImageId,
                isLoading: false,
                hasError: !imageUrl,
              }
            : item,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Beat regeneration failed";
      setGenerateError(message);
      notify.error({ title: "Beat regeneration failed", description: message });
    } finally {
      setIsGenerating(false);
    }
  }, [cameraTemplateId, generateStudioImage, notify]);

  // ── Card ops ──────────────────────────────────────────────────────────────────
  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setConnections((prev) =>
      prev.filter((cn) => cn.from !== id && cn.to !== id),
    );
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }, []);

  const deleteSelected = useCallback(() => {
    const ids = selectedRef.current;
    if (ids.size === 0) return;
    setCards((prev) => prev.filter((c) => !ids.has(c.id)));
    setConnections((prev) =>
      prev.filter((cn) => !ids.has(cn.from) && !ids.has(cn.to)),
    );
    setSelectedIds(new Set());
  }, []);

  const clearCanvas = useCallback(() => {
    revokeProductObjectUrls(cardsRef.current);
    setCards([]);
    setConnections([]);
    setSelectedIds(new Set());
    setPrompt("");
    setVideoCard(null);
    setVideoError("");
    setVideoResults([]);
    clearStudioState(storageKeyRef.current).catch(() => {});
  }, []);


  // ── Fit-to-content ────────────────────────────────────────────────────────────
  const fitToContent = useCallback(() => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    if (cardsRef.current.length === 0) {
      // No cards — go to world center
      zoomTo(1);
      return;
    }
    const allBounds = {
      left: Math.min(...cardsRef.current.map((c) => c.x)),
      top: Math.min(...cardsRef.current.map((c) => c.y)),
      right: Math.max(...cardsRef.current.map((c) => c.x + CARD_W)),
      bottom: Math.max(...cardsRef.current.map((c) => c.y + CARD_H)),
    };
    const pad = 60;
    const contentW = allBounds.right - allBounds.left + pad * 2;
    const contentH = allBounds.bottom - allBounds.top + pad * 2;
    const fittedZoom = Math.min(
      r.width / contentW,
      r.height / contentH,
      MAX_ZOOM,
    );
    const z = Math.max(MIN_ZOOM, fittedZoom);
    setZoom(z);
    setPan({
      x: r.width / 2 - ((allBounds.left + allBounds.right) / 2) * z,
      y: r.height / 2 - ((allBounds.top + allBounds.bottom) / 2) * z,
    });
  }, [zoomTo]);

  // ── Derived state ─────────────────────────────────────────────────────────────
  const selCards = cards.filter((c) => selectedIds.has(c.id));
  const selProducts = selCards.filter((c) => c.type === "product");
  const bounds = selBounds(cards, selectedIds);
  const showPanel = selectedIds.size > 0 && !!bounds;
  const panelCx = bounds ? (bounds.left + bounds.right) / 2 : 0;
  const panelY = bounds ? bounds.bottom + 18 : 0;
  const avatarLabel = avatarConfig
    ? `${avatarConfig.gender === "woman" ? "Female" : "Male"} - ${avatarConfig.style ?? "casual"}`
    : "Choose avatar";
  const backgroundLabel = backgroundConfig?.roomAesthetic
    ? backgroundConfig.roomAesthetic.charAt(0).toUpperCase() +
      backgroundConfig.roomAesthetic.slice(1)
    : "Choose BG";
  const cameraLabel =
    cameraTemplates.find((t) => t.id === cameraTemplateId)?.title ??
    "Choose shot type";
  const movementLabel =
    movementTemplates.find((t) => t.id === movementTemplateId)?.title ??
    "Choose motion style";
  const selectedVideoMotionLabel = videoMovement
    ? movementTemplates.find((t) => t.id === videoMovement)?.title ?? "Selected motion"
    : "None (prompt only)";
  const selectedVideoFlow =
    videoFlowTemplates.find((template) => template.id === videoFlowId) ?? null;
  const selectedVideoFlowSteps = getVideoFlowSteps(selectedVideoFlow);
  const selectedVideoFlowStep =
    getVideoFlowStepById(selectedVideoFlow, videoFlowStepId) ??
    getDefaultVideoFlowStep(selectedVideoFlow);
  const flowOptions = videoFlowTemplates.map((template) => {
    const beatCount = Math.max(1, getVideoFlowSteps(template).length);
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      beatCount,
      imageCost: TOKEN_COSTS.image_gen * beatCount,
      videoCost: selectedVideoTokenCost * beatCount,
    };
  });
  const selectedFlowOption =
    flowOptions.find((option) => option.id === videoFlowId) ?? flowOptions[0] ?? null;

  const flowGroups = Array.from(
    cards.reduce((groups, card) => {
      if (card.type !== "generated" || !card.flowGroupId) return groups;
      const existing = groups.get(card.flowGroupId) ?? [];
      existing.push(card);
      groups.set(card.flowGroupId, existing);
      return groups;
    }, new Map<string, GeneratedCard[]>()),
  ).map(([groupId, groupCards]) => {
    const left = Math.min(...groupCards.map((card) => card.x)) - FLOW_GROUP_PAD_X;
    const top = Math.min(...groupCards.map((card) => card.y)) - FLOW_GROUP_TOP_RESERVE;
    const right = Math.max(...groupCards.map((card) => card.x + CARD_W)) + FLOW_GROUP_PAD_X;
    const bottom =
      Math.max(...groupCards.map((card) => card.y + CARD_H)) + FLOW_GROUP_BOTTOM_PAD;
    return {
      groupId,
      cards: groupCards,
      title: groupCards[0]?.flowTitle ?? "Flow",
      left,
      top,
      width: right - left,
      height: bottom - top,
      isReady: groupCards.every((card) => !card.isLoading && !card.hasError && Boolean(card.imageUrl)),
    };
  });

  useEffect(() => {
    setVideoMovement(movementTemplateId);
  }, [movementTemplateId]);

  useEffect(() => {
    setVideoFlowId(videoFlowTemplateId);
  }, [videoFlowTemplateId]);

  useEffect(() => {
    const defaultStep = getDefaultVideoFlowStep(selectedVideoFlow);
    setVideoFlowStepId(defaultStep?.id ?? "");
  }, [selectedVideoFlow]);

  const getVideoCardId = useCallback(
    (sourceCardId: string, stepId?: string) =>
      `video-${sourceCardId}-${stepId ?? "single"}`,
    [],
  );

  const upsertVideoCard = useCallback((videoCard: VideoCard) => {
    setCards((prev) => {
      const existingIndex = prev.findIndex((card) => card.id === videoCard.id);
      if (existingIndex === -1) return [...prev, videoCard];
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...videoCard } as VideoCard;
      return next;
    });
    setConnections((prev) => {
      const connectionId = `${videoCard.sourceGeneratedCardId}->${videoCard.id}`;
      if (prev.some((conn) => conn.id === connectionId)) return prev;
      return [
        ...prev,
        {
          id: connectionId,
          from: videoCard.sourceGeneratedCardId,
          fromSide: "right",
          to: videoCard.id,
          toSide: "left",
        },
      ];
    });
  }, []);

  const exportSingleVideoClip = useCallback(async ({
    targetCard,
    motionPrompt,
    title,
    stepId,
    stepTitle,
    stepOrder = 0,
  }: {
    targetCard: GeneratedCard;
    motionPrompt: string;
    title: string;
    stepId?: string;
    stepTitle?: string;
    stepOrder?: number;
  }): Promise<GeneratedVideoResult> => {
    if (!targetCard.projectId || !targetCard.generatedImageId || !targetCard.imageUrl) {
      throw new Error(
        "This generated image is missing export metadata. Regenerate it before creating a video.",
      );
    }

    const videoCardId = getVideoCardId(targetCard.id, stepId);
    upsertVideoCard({
      id: videoCardId,
      type: "video",
      imageUrl: targetCard.imageUrl,
      x: targetCard.x + CARD_W + GAP,
      y: targetCard.y + stepOrder * 42,
      sourceGeneratedCardId: targetCard.id,
      sourceGeneratedImageId: targetCard.generatedImageId,
      projectId: targetCard.projectId,
      projectName: targetCard.projectName,
      title,
      stepId,
      stepTitle,
      status: "pending",
    });

    try {
      const exportRes = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: targetCard.projectId,
          imageIds: [targetCard.generatedImageId],
          imageUrls: [targetCard.imageUrl],
          motionPrompt,
          videoModelId: selectedVideoModel.id,
          ...selectedVideoSettings,
        }),
      });

      if (!exportRes.ok) {
        const error = await exportRes.json().catch(() => null);
        if (exportRes.status === 402) {
          throw new Error(error?.error ?? "Insufficient tokens. Please top up and try again.");
        }
        throw new Error(error?.error ?? "Video generation failed");
      }

      let createdVideo: {
        videoUrl: string;
        filename: string;
        storageFileId?: string | null;
      } | null = null;

      for await (const event of readNDJSON(exportRes)) {
        if (event.type === "video") {
          createdVideo = event.video as {
            videoUrl: string;
            filename: string;
            storageFileId?: string | null;
          };
          upsertVideoCard({
            id: videoCardId,
            type: "video",
            imageUrl: targetCard.imageUrl,
            x: targetCard.x + CARD_W + GAP,
            y: targetCard.y + stepOrder * 42,
            sourceGeneratedCardId: targetCard.id,
            sourceGeneratedImageId: targetCard.generatedImageId,
            projectId: targetCard.projectId,
            projectName: targetCard.projectName,
            title,
            stepId,
            stepTitle,
            status: "ready",
            videoUrl: createdVideo.videoUrl,
            fileName: createdVideo.filename,
            storageFileId: createdVideo.storageFileId ?? null,
          });
        } else if (event.type === "video_error") {
          const message =
            typeof event.error === "string"
              ? event.error
              : "Video generation failed";
          throw new Error(message);
        }
      }

      if (!createdVideo) {
        throw new Error("Video generation did not return a result");
      }

      return {
        id: `${stepId ?? "clip"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        stepId,
        stepTitle,
        videoUrl: createdVideo.videoUrl,
        fileName: createdVideo.filename,
        storageFileId: createdVideo.storageFileId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Video generation failed";
      upsertVideoCard({
        id: videoCardId,
        type: "video",
        imageUrl: targetCard.imageUrl,
        x: targetCard.x + CARD_W + GAP,
        y: targetCard.y + stepOrder * 42,
        sourceGeneratedCardId: targetCard.id,
        sourceGeneratedImageId: targetCard.generatedImageId,
        projectId: targetCard.projectId,
        projectName: targetCard.projectName,
        title,
        stepId,
        stepTitle,
        status: "error",
        errorMessage: message,
      });
      throw error;
    }
  }, [
    getVideoCardId,
    selectedVideoModel.id,
    selectedVideoSettings,
    upsertVideoCard,
  ]);

  const createFlowVideos = useCallback(async (groupId: string) => {
    const groupCards = cardsRef.current.filter(
      (card): card is GeneratedCard =>
        card.type === "generated" && card.flowGroupId === groupId,
    );
    if (!groupCards.length) return;

    const incomplete = groupCards.some(
      (card) => !card.generatedImageId || !card.imageUrl || card.isLoading || card.hasError,
    );
    if (incomplete) {
      setGenerateError("Finish or regenerate all beat images before creating flow videos.");
      return;
    }

    setIsCreatingVideo(true);
    setVideoError("");
    setVideoResults([]);

    try {
      const sortedCards = [...groupCards].sort((left, right) => left.x - right.x);
      const clips: GeneratedVideoResult[] = [];

      for (const [index, card] of sortedCards.entries()) {
        const movementTemplate = movementTemplates.find(
          (template) => template.id === card.flowMotionStyleTemplateId,
        ) ?? movementTemplates.find((template) => template.id === videoMovement);

        const flowStep: VideoFlowStepConfig | null = card.flowStepId
          ? {
              id: card.flowStepId,
              title: card.flowStepTitle ?? "Beat",
              promptFragment: selectedVideoFlowSteps.find((step) => step.id === card.flowStepId)?.promptFragment,
              beatGoal: selectedVideoFlowSteps.find((step) => step.id === card.flowStepId)?.beatGoal,
            }
          : null;

        const clip = await exportSingleVideoClip({
          targetCard: card,
          motionPrompt: buildStudioVideoPrompt(card.prompt, movementTemplate, flowStep),
          title: `${card.flowTitle ?? "Flow"} · ${card.flowStepTitle ?? "Beat"}`,
          stepId: card.flowStepId,
          stepTitle: card.flowStepTitle,
          stepOrder: index,
        });
        clips.push(clip);
        setVideoResults([...clips]);
      }

      setCards((prev) =>
        prev.map((card) =>
          card.type === "generated" && card.flowGroupId === groupId
            ? {
                ...card,
                generatedVideos: clips.filter((clip) => clip.stepId === card.flowStepId),
                videoUrl: clips.find((clip) => clip.stepId === card.flowStepId)?.videoUrl ?? card.videoUrl,
                videoFileName: clips.find((clip) => clip.stepId === card.flowStepId)?.fileName ?? card.videoFileName,
                videoStorageFileId: clips.find((clip) => clip.stepId === card.flowStepId)?.storageFileId ?? card.videoStorageFileId,
              }
            : card,
        ),
      );

      // Open the video modal: `videoResults` only render inside `{videoCard && (...)}`, so batch
      // flow export must set a card or the three clips never appear in the UI.
      const firstBeat = sortedCards[0];
      setVideoCard(firstBeat);
      setVideoWizardStep(1);
      setVideoPrompt(firstBeat.prompt);
      if (firstBeat.flowMotionStyleTemplateId) {
        setVideoMovement(firstBeat.flowMotionStyleTemplateId);
      }
      setVideoFlowStepId(firstBeat.flowStepId ?? "");
      setVideoResults(clips);

      notify.success({
        title: "Flow videos ready",
        description: "All reviewed beats have been exported to video.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Flow video export failed";
      setVideoError(message);
      notify.error({ title: "Flow video export failed", description: message });
    } finally {
      setIsCreatingVideo(false);
    }
  }, [
    exportSingleVideoClip,
    movementTemplates,
    notify,
    selectedVideoFlowSteps,
    videoMovement,
  ]);

  const handleCreateVideo = useCallback(async () => {
    if (
      !videoCard?.projectId ||
      !videoCard.generatedImageId ||
      !videoCard.imageUrl
    ) {
      setVideoError(
        "This generated image is missing export metadata. Regenerate it before creating a video.",
      );
      return;
    }

    setIsCreatingVideo(true);
    setVideoError("");
    setVideoResults([]);

    try {
      const clips: GeneratedVideoResult[] = [];
      const movementTemplate = videoMovement
        ? movementTemplates.find((template) => template.id === videoMovement)
        : undefined;
      const lockedStep =
        videoCard.flowStepId || videoCard.flowStepTitle
          ? {
              id: videoCard.flowStepId ?? "locked-step",
              title: videoCard.flowStepTitle ?? "Locked beat",
            }
          : null;
      const motionPrompt = buildStudioVideoPrompt(
        videoPrompt || videoCard.prompt,
        movementTemplate,
        lockedStep,
      );
      const clip = await exportSingleVideoClip({
        targetCard: videoCard,
        motionPrompt,
        title: videoCard.flowStepTitle ?? "Single clip",
        stepId: videoCard.flowStepId,
        stepTitle: videoCard.flowStepTitle,
        stepOrder: 0,
      });
      clips.push(clip);
      setVideoResults([clip]);

      notify.success({
        title: clips.length > 1 ? "Flow ready" : "Video ready",
        description:
          clips.length > 1
            ? "Your flow clips are ready for preview and download."
            : "Your generated video is ready for preview and download.",
      });
      setCards((prev) =>
        prev.map((card) =>
          card.type === "generated" && card.id === videoCard.id
            ? {
                ...card,
                videoUrl: clips[0]?.videoUrl ?? card.videoUrl,
                videoFileName: clips[0]?.fileName ?? card.videoFileName,
                videoStorageFileId: clips[0]?.storageFileId ?? card.videoStorageFileId,
                generatedVideos: clips,
              }
            : card,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Video generation failed";
      setVideoError(message);
      notify.error({ title: "Video generation failed", description: message });
    } finally {
      setIsCreatingVideo(false);
    }
  }, [
    movementTemplates,
    notify,
    exportSingleVideoClip,
    videoCard,
    videoMovement,
    videoPrompt,
  ]);

  // ── SVG connection paths ──────────────────────────────────────────────────────
  function handleVideoOptionChange(
    key: VideoOptionKey,
    value: string | number | boolean,
  ) {
    setSelectedVideoSettings((current) =>
      updateVideoGenerationSettings(selectedVideoModel, current, key, value as never),
    );
  }

  function applyVideoFlowStep(stepId: string) {
    const step = getVideoFlowStepById(selectedVideoFlow, stepId);
    if (!step) return;

    setVideoFlowStepId(step.id);

    if (step.motionStyleTemplateId) {
      setVideoMovement(step.motionStyleTemplateId);
    }

    if (typeof step.durationSec === "number") {
      const durationSec = step.durationSec;
      setSelectedVideoSettings((current) =>
        updateVideoGenerationSettings(
          selectedVideoModel,
          current,
          "duration",
          durationSec,
        ),
      );
    }
  }

  function handleSelectVideoFlow(flowId: string) {
    setVideoFlowId(flowId);
    const flow = videoFlowTemplates.find((template) => template.id === flowId) ?? null;
    const defaultStep = getDefaultVideoFlowStep(flow);

    if (defaultStep) {
      setVideoFlowStepId(defaultStep.id);
      if (defaultStep.motionStyleTemplateId) {
        setVideoMovement(defaultStep.motionStyleTemplateId);
      }
      if (typeof defaultStep.durationSec === "number") {
        const durationSec = defaultStep.durationSec;
        setSelectedVideoSettings((current) =>
          updateVideoGenerationSettings(
            selectedVideoModel,
            current,
            "duration",
            durationSec,
          ),
        );
      }
    }
  }

  const renderConnections = () => {
    return connections.map((conn) => {
      const from = cards.find((c) => c.id === conn.from);
      const to = cards.find((c) => c.id === conn.to);
      if (!from || !to) return null;

      const fromSide: Side = conn.fromSide ?? "right";
      const toSide: Side = conn.toSide ?? "left";
      const p1 = portPos(from, fromSide);
      const p2 = portPos(to, toSide);
      const d = portBezier(p1, fromSide, p2, toSide);

      return (
        <g key={conn.id}>
          {/* Wide invisible hit area */}
          <path
            d={d}
            stroke="transparent"
            strokeWidth="14"
            fill="none"
            style={{ pointerEvents: "stroke", cursor: "pointer" }}
            onClick={() =>
              setConnections((prev) => prev.filter((c) => c.id !== conn.id))
            }
          />
          {/* Visible path */}
          <path
            d={d}
            stroke="rgba(139,92,246,0.5)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="5 3"
          />
          {/* End arrowhead dot */}
          <circle cx={p2.x} cy={p2.y} r="3" fill="rgba(139,92,246,0.6)" />
          {/* Start dot */}
          <circle cx={p1.x} cy={p1.y} r="3" fill="rgba(139,92,246,0.6)" />
        </g>
      );
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex-1 flex flex-col overflow-hidden min-h-0 pt-14 lg:pt-0"
      style={{ background: "#0b0b0f", fontFamily: "var(--font-sans)" }}
    >
      {/* ── Canvas ────────────────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundColor: "#090611",
          backgroundImage: [
            "linear-gradient(rgba(139,92,246,0.14) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(139,92,246,0.14) 1px, transparent 1px)",
            "radial-gradient(circle at 20% 0%, rgba(124,58,237,0.18), transparent 34%)",
            "radial-gradient(circle at 80% 15%, rgba(168,85,247,0.12), transparent 28%)",
            "linear-gradient(180deg, rgba(17,13,29,0.92), rgba(9,6,17,0.98))",
          ].join(", "),
          backgroundSize: `${36 * zoom}px ${36 * zoom}px, ${36 * zoom}px ${36 * zoom}px, 100% 100%, 100% 100%, 100% 100%`,
          backgroundPosition: `${pan.x % (36 * zoom)}px ${pan.y % (36 * zoom)}px, ${pan.x % (36 * zoom)}px ${pan.y % (36 * zoom)}px, 0 0, 0 0, 0 0`,
          touchAction: "none",
          cursor: connectingFrom
            ? "crosshair"
            : dragMode.current === "pan"
              ? "grabbing"
              : "grab",
        }}
        onPointerDown={onCanvasPtrDown}
        onWheel={onCanvasWheel}
        onMouseEnter={() => setIsMouseInCanvas(true)}
        onMouseLeave={() => setIsMouseInCanvas(false)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.06),transparent_55%)]" />
        {/* Top-left controls */}
        <div className="absolute left-3 top-3 z-120 flex flex-col gap-2 items-start">
          {/* Upload + Clear + desktop chips row */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-[#120f1d]/85 px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-medium bg-brand-accent/10 border border-brand-accent/25 text-brand-accent hover:bg-brand-accent/20 transition-all"
            >
              <Upload size={11} />
              <span className="hidden sm:inline">Upload</span>
            </button>
            {cards.length > 0 && (
              <button
                onClick={clearCanvas}
                className="flex items-center h-7 px-2.5 rounded-lg text-[11px] border bg-white/4 border-white/8 text-white/35 hover:text-white/70 hover:bg-white/8 transition-all"
                title="Clear canvas"
              >
                <Trash2 size={11} />
              </button>
            )}
            {/* Settings chips — desktop only */}
            <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l border-white/8">
              <button
                type="button"
                onClick={() => setActiveTemplatePanel((p) => (p === "avatar" ? null : "avatar"))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all select-none cursor-pointer",
                  activeTemplatePanel === "avatar"
                    ? "bg-brand-accent/15 border-brand-accent/35 text-brand-accent"
                    : "bg-white/4 border-white/8 text-white/55 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/75",
                )}
              >
                <User size={11} />
                <span>Avatar</span>
                <RefreshCw size={9} className="opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplatePanel((p) => (p === "background" ? null : "background"))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all select-none cursor-pointer",
                  activeTemplatePanel === "background"
                    ? "bg-brand-accent/15 border-brand-accent/35 text-brand-accent"
                    : "bg-white/4 border-white/8 text-white/55 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/75",
                )}
              >
                <Layers size={11} />
                <span>Background</span>
                <RefreshCw size={9} className="opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplatePanel((p) => (p === "shot_type" ? null : "shot_type"))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all select-none cursor-pointer",
                  activeTemplatePanel === "shot_type"
                    ? "bg-brand-accent/15 border-brand-accent/35 text-brand-accent"
                    : "bg-white/4 border-white/8 text-white/55 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/75",
                )}
              >
                <Camera size={11} />
                <span>Shot</span>
                <RefreshCw size={9} className="opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplatePanel((p) => (p === "motion_style" ? null : "motion_style"))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all select-none cursor-pointer",
                  activeTemplatePanel === "motion_style"
                    ? "bg-brand-accent/15 border-brand-accent/35 text-brand-accent"
                    : "bg-white/4 border-white/8 text-white/55 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/75",
                )}
              >
                <Wind size={11} />
                <span>Motion</span>
                <RefreshCw size={9} className="opacity-60" />
              </button>
            </div>
          </div>
          {/* Hint — desktop only */}
          <div className="hidden sm:block pointer-events-none rounded-xl border border-white/8 bg-[#120f1d]/85 px-3 py-2 text-[11px] text-white/45 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            Shift + drag selects. Ctrl/Cmd + wheel zooms (when mouse is over canvas).
          </div>
        </div>

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 z-[120] flex items-center gap-1 sm:gap-1.5 rounded-xl border border-white/[0.08] bg-[#120f1d]/85 px-1.5 sm:px-2 py-1.5 sm:py-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <button
            type="button"
            onClick={() => zoomTo(zoomRef.current - ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            onClick={() => zoomTo(1)}
            className="hidden sm:block min-w-[3rem] rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={fitToContent}
            className="hidden sm:block rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
            title="Fit content to view"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => zoomTo(zoomRef.current + ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
        </div>
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: CANVAS_W,
            height: CANVAS_H,
          }}
        >
          {/* Drop highlight */}
          <AnimatePresence>
            {isDragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
                className="absolute inset-3 rounded-2xl border-2 border-dashed border-brand-accent/40 bg-brand-accent/[0.04] pointer-events-none z-50 flex items-center justify-center"
              >
                <div className="text-center">
                  <Upload
                    className="mx-auto mb-2 text-brand-accent/45"
                    size={26}
                  />
                  <p className="text-sm font-medium text-brand-accent/45">
                    Drop product images
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          <AnimatePresence>
            {cards.length === 0 && !isDragOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center">
                  <button
                    className="pointer-events-auto w-16 h-16 rounded-2xl border border-dashed border-white/[0.1] flex items-center justify-center mx-auto mb-4 hover:border-brand-accent/35 hover:bg-brand-accent/[0.04] transition-all"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={22} className="text-white/18" />
                  </button>
                  <p className="text-sm text-white/22 mb-1 font-medium">
                    Drop product images or click to upload
                  </p>
                  <p className="text-xs text-white/12">
                    Up to 5 products - drag port handles to connect cards
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── SVG connections overlay ─────────────────────────────────────────── */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              width: "100%",
              height: "100%",
              overflow: "visible",
              zIndex: 5,
            }}
          >
            {/* Established connections */}
            {renderConnections()}

            {/* Pending connection while dragging from port */}
            {connectingFrom &&
              pendingEnd &&
              (() => {
                const from = cards.find((c) => c.id === connectingFrom.id);
                if (!from) return null;
                const p1 = portPos(from, connectingFrom.side);
                return (
                  <path
                    d={portBezier(
                      p1,
                      connectingFrom.side,
                      pendingEnd,
                      nearestSide(from, pendingEnd),
                    )}
                    stroke="rgba(139,92,246,0.35)"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="4 3"
                  />
                );
              })()}
          </svg>

          {/* Cards */}
          {flowGroups.map((group) => (
            <div
              key={group.groupId}
              data-flow-chrome
              className="absolute rounded-[28px] border border-brand-accent/20 bg-brand-accent/[0.04] shadow-[0_16px_48px_rgba(0,0,0,0.35)] cursor-grab"
              style={{
                left: group.left,
                top: group.top,
                width: group.width,
                height: group.height,
                /* Above SVG connections (z-5), below cards (z-10) — was z-1 so chrome sat under wires and felt unclickable */
                zIndex: 6,
              }}
              onPointerDown={(e) => onFlowGroupPtrDown(e, group.groupId)}
            >
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-brand-accent/15 bg-[#120f1d] rounded-t-[28px]"
                style={{ minHeight: FLOW_GROUP_TOP_RESERVE }}
              >
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-brand-accent/70">Flow Group</p>
                  <p className="text-sm font-semibold text-white">{group.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40">
                    {group.cards.length} beats
                  </span>
                  <button
                    type="button"
                    disabled={!group.isReady || isCreatingVideo}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => createFlowVideos(group.groupId)}
                    className={cn(
                      "rounded-xl px-3 py-2 text-[11px] font-semibold transition-all",
                      !group.isReady || isCreatingVideo
                        ? "bg-white/[0.04] text-white/[0.2] cursor-not-allowed"
                        : "bg-brand-accent text-white hover:bg-brand-accent-hover shadow-[0_0_18px_rgba(139,92,246,0.32)]",
                    )}
                  >
                    {isCreatingVideo ? "Creating..." : `Create Flow Videos · ${group.cards.length * selectedVideoTokenCost}`}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {cards.map((card) => (
            <CardComp
              key={card.id}
              card={card}
              selected={selectedIds.has(card.id)}
              isInConnectMode={!!connectingFrom}
              onPtrDown={onCardPtrDown}
              onPortPtrDown={onPortPtrDown}
              onVideoOpen={
                card.type === "generated"
                  ? (c) => {
                      const generatedCard = c as GeneratedCard;
                      const defaultFlow =
                        videoFlowTemplates.find((template) => template.id === videoFlowTemplateId) ?? null;
                      const defaultFlowStep = getDefaultVideoFlowStep(defaultFlow);
                      setVideoCard(generatedCard);
                      setVideoPrompt(generatedCard.prompt);
                      setVideoMovement(movementTemplateId);
                      setVideoFlowId(defaultFlow?.id ?? "");
                      setVideoFlowStepId(defaultFlowStep?.id ?? "");
                      setVideoWizardStep(1);
                      setVideoError("");
                      setVideoResults(
                        generatedCard.generatedVideos && generatedCard.generatedVideos.length > 0
                          ? generatedCard.generatedVideos
                          : generatedCard.videoUrl
                            ? [{
                                id: `legacy-${generatedCard.id}`,
                                title: "Latest clip",
                                videoUrl: generatedCard.videoUrl,
                                fileName:
                                  generatedCard.videoFileName ??
                                  "genetrify-video.mp4",
                                storageFileId:
                                  generatedCard.videoStorageFileId ?? null,
                              }]
                            : [],
                      );
                    }
                  : undefined
              }
              onRegenerateBeat={regenerateFlowBeat}
              onDelete={deleteCard}
              onPreview={(url, label) => setPreviewImage({ url, label })}
            />
          ))}

          {/* Rubber-band */}
          {selBox && (
            <div
              className="absolute pointer-events-none rounded-lg border border-brand-accent/50"
              style={{
                left: Math.min(selBox.x1, selBox.x2),
                top: Math.min(selBox.y1, selBox.y2),
                width: Math.abs(selBox.x2 - selBox.x1),
                height: Math.abs(selBox.y2 - selBox.y1),
                background: "rgba(139,92,246,0.05)",
              }}
            />
          )}

          {/* ── Contextual panel ──────────────────────────────────────────────── */}
          {/* ── Contextual panel — desktop (follows selection in canvas space) ── */}
          <AnimatePresence>
            {showPanel && (
              <motion.div
                key="ctx-panel-desktop"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="hidden sm:block"
                style={{
                  position: "absolute",
                  left: panelCx,
                  top: panelY,
                  transform: "translateX(-50%)",
                  zIndex: 200,
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <CtxPanel
                  selCards={selCards}
                  selProducts={selProducts}
                  prompt={prompt}
                  isGenerating={isGenerating}
                  errorMessage={generateError}
                  promptInputRef={promptInputRef}
                  onPromptChange={setPrompt}
                  onGenerate={handleGenerate}
                  onOpenFlowPicker={() => setShowFlowPickerModal(true)}
                  onDelete={deleteSelected}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Settings toolbar — mobile floating pill ───────────────────────────── */}
      <AnimatePresence>
        {!showPanel && (
          <motion.div
            key="settings-pill"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="sm:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-200 flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl border border-white/10 bg-[#12121b]/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
          >
            {(
              [
                { icon: User,   cat: "avatar"     as TemplateCategory, name: "Avatar"   },
                { icon: Layers, cat: "background" as TemplateCategory, name: "BG"       },
                { icon: Camera, cat: "shot_type"     as TemplateCategory, name: "Shot"   },
                { icon: Wind,   cat: "motion_style"  as TemplateCategory, name: "Motion" },
              ] as { icon: React.ElementType; cat: TemplateCategory; name: string }[]
            ).map(({ icon: Icon, cat, name }) => {
              const isActive = activeTemplatePanel === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    setActiveTemplatePanel((p) => (p === cat ? null : cat))
                  }
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all",
                    isActive
                      ? "bg-brand-accent/20 text-brand-accent"
                      : "text-white/45 hover:text-white/70 hover:bg-white/6",
                  )}
                >
                  <Icon size={16} />
                  <span className="text-[9px] font-medium leading-none">{name}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contextual panel — mobile (fixed bottom sheet) ───────────────────── */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            key="ctx-panel-mobile"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="sm:hidden absolute bottom-4 left-3 right-3 z-200"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <CtxPanel
              selCards={selCards}
              selProducts={selProducts}
              prompt={prompt}
              isGenerating={isGenerating}
              errorMessage={generateError}
              onPromptChange={setPrompt}
              onGenerate={handleGenerate}
              onOpenFlowPicker={() => setShowFlowPickerModal(true)}
              onDelete={deleteSelected}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFlowPickerModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[420]"
              onClick={() => setShowFlowPickerModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[430] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-xl rounded-3xl overflow-hidden border border-white/[0.08] bg-[#111119]"
                style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Choose Flow</h3>
                    <p className="text-[11px] text-white/30 mt-0.5">
                      Choose the flow preset before generating the beat images.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFlowPickerModal(false)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
                  {flowOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectVideoFlow(option.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                        videoFlowId === option.id
                          ? "border-brand-accent/40 bg-brand-accent/12"
                          : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.14]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn(
                          "text-sm font-semibold",
                          videoFlowId === option.id ? "text-brand-accent" : "text-white/75",
                        )}>
                          {option.title}
                        </span>
                        <span className="text-[10px] text-white/30">{option.beatCount} beats</span>
                      </div>
                      {option.description && (
                        <p className="mt-1 text-[11px] leading-relaxed text-white/38">
                          {option.description}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-white/30 tabular-nums">
                        {option.imageCost + option.videoCost} total tokens
                      </p>
                    </button>
                  ))}
                </div>

                <div className="px-5 pt-3 pb-5 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-white/28 font-mono">Selected</span>
                    <div className="text-right">
                      <p className="text-[11px] text-white/60 font-medium">
                        {selectedFlowOption?.title ?? "No flow selected"}
                      </p>
                      {selectedFlowOption && (
                        <p className="text-[10px] text-white/28 tabular-nums">
                          {selectedFlowOption.imageCost + selectedFlowOption.videoCost} total tokens
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFlowPickerModal(false);
                      handleGenerateFlow();
                    }}
                    disabled={isGenerating || !selectedFlowOption}
                    className={cn(
                      "w-full rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                      isGenerating || !selectedFlowOption
                        ? "bg-white/[0.04] text-white/[0.18] cursor-not-allowed"
                        : "bg-brand-accent text-white hover:bg-brand-accent-hover shadow-[0_0_18px_rgba(139,92,246,0.38)]",
                    )}
                  >
                    Generate Flow Images
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Template panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeTemplatePanel && (
          <TemplatePanel
            key={activeTemplatePanel}
            category={activeTemplatePanel}
            avatarTemplates={avatarTemplates}
            backgroundTemplates={backgroundTemplates}
            cameraTemplates={cameraTemplates}
            movementTemplates={movementTemplates}
            videoFlowTemplates={videoFlowTemplates}
            onClose={() => setActiveTemplatePanel(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Video creation wizard (right dock) ───────────────────────────────── */}
      <AnimatePresence>
        {videoCard && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[480] bg-black/60 backdrop-blur-sm"
              onClick={() => setVideoCard(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-[560px] max-w-[92vw] max-h-[calc(100vh-4rem)] rounded-2xl border border-white/[0.08] bg-[#111119] shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div>
                <p className="text-sm font-semibold text-white">Video Creation</p>
                <p className="text-[11px] text-white/35">Step {videoWizardStep} of 4</p>
              </div>
              <button
                onClick={() => setVideoCard(null)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 py-2 border-b border-white/[0.06] grid grid-cols-4 gap-1">
              {[
                { id: 1, label: "Source" },
                { id: 2, label: "Motion" },
                { id: 3, label: "Model" },
                { id: 4, label: "Generate" },
              ].map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setVideoWizardStep(step.id as 1 | 2 | 3 | 4)}
                  className={cn(
                    "rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all",
                    videoWizardStep === step.id
                      ? "bg-brand-accent/18 text-brand-accent"
                      : "bg-white/[0.03] text-white/40 hover:text-white/65",
                  )}
                >
                  {step.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
              <div className="sm:w-[220px] shrink-0 border-b sm:border-b-0 sm:border-r border-white/[0.06] p-3 sm:p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Preview</p>
                <div className="mx-auto w-full max-w-[180px] aspect-[9/16] rounded-xl overflow-hidden border border-white/10 bg-black">
                  {videoResults[0]?.videoUrl ? (
                    <video
                      src={videoResults[0].videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={videoCard.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 text-[11px] text-white/45 text-center">
                  {videoResults[0]?.videoUrl
                    ? "Generated preview"
                    : videoCard.flowStepTitle
                      ? `Current beat: ${videoCard.flowStepTitle}`
                      : "Single image clip mode"}
                </p>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-brand">
              {videoWizardStep === 1 && (
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Source</p>
                  <p className="text-[11px] text-white/45">
                    Confirm your source on the left preview panel, then continue to set motion and model.
                  </p>
                </div>
              )}

              {videoWizardStep === 2 && (
                <>
                  <div>
                    <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-1.5">Prompt</p>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      rows={3}
                      placeholder="Describe the motion or scene..."
                      className="w-full resize-none text-[11px] text-white/70 font-mono bg-white/[0.04] border border-white/[0.08] focus:border-brand-accent/40 focus:bg-white/[0.06] rounded-lg px-3 py-2 leading-relaxed outline-none transition-all placeholder:text-white/20"
                    />
                  </div>

                  {videoCard.flowStepTitle ? (
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                      <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-1">Locked Beat</p>
                      <p className="text-[11px] text-white/65">{videoCard.flowStepTitle}</p>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest">Motion Style</p>
                    <div className="flex items-center gap-2">
                      <StatusChip
                        icon={Wind}
                        label="Motion"
                        value={selectedVideoMotionLabel}
                        active={activeTemplatePanel === "motion_style"}
                        onClick={() =>
                          setActiveTemplatePanel((p) =>
                            p === "motion_style" ? null : "motion_style",
                          )
                        }
                      />
                      {videoMovement ? (
                        <button
                          type="button"
                          onClick={() => setVideoMovement("")}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/[0.08] text-white/45 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                        >
                          Deselect
                        </button>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-white/30">
                      Use the motion slide panel to pick a motion, or deselect to rely on prompt-only motion.
                    </p>
                  </div>
                </>
              )}

              {videoWizardStep === 3 && (
                <>
                  <div>
                    <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-2">Model</p>
                    <div className="flex flex-col gap-1.5">
                      {VIDEO_MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedVideoModel(m);
                            setSelectedVideoSettings(getDefaultVideoGenerationSettings(m));
                          }}
                          className={cn(
                            "px-3 py-2 rounded-lg text-left transition-all border",
                            selectedVideoModel.id === m.id
                              ? "bg-brand-accent/12 border-brand-accent/35"
                              : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06] hover:border-white/[0.12]",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("text-[11px] font-medium", selectedVideoModel.id === m.id ? "text-brand-accent" : "text-white/55")}>
                              {m.name}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] text-white/30 font-mono">
                              <Zap size={9} className="text-yellow-500/60" />from {getMinimumVideoGenerationTokenCost(m)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(["duration", "resolution", "mode", "generateAudio"] as VideoOptionKey[])
                    .filter((key) => hasMultipleVideoOptionChoices(selectedVideoModel, key))
                    .map((key) => {
                      const allChoices = getAllVideoOptionChoices(selectedVideoModel, key);
                      const availableChoices = new Set(
                        getVideoOptionChoices(selectedVideoModel, selectedVideoSettings, key).map((choice) => choice.value),
                      );
                      return (
                        <div key={key}>
                          <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-2">
                            {VIDEO_OPTION_LABELS[key]}
                          </p>
                          <div className="flex gap-1.5 flex-wrap">
                            {allChoices.map((choice) => {
                              const isSelected = selectedVideoSettings[key] === choice.value;
                              const isAvailable = availableChoices.has(choice.value);
                              return (
                                <button
                                  key={`${key}-${String(choice.value)}`}
                                  type="button"
                                  disabled={!isAvailable}
                                  onClick={() => handleVideoOptionChange(key, choice.value)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-all",
                                    isSelected
                                      ? "bg-brand-accent/12 border-brand-accent/35 text-brand-accent font-semibold"
                                      : isAvailable
                                        ? "bg-white/[0.03] border-white/[0.07] text-white/38 hover:bg-white/[0.06] hover:text-white/65"
                                        : "bg-white/[0.01] border-white/[0.05] text-white/18 cursor-not-allowed",
                                  )}
                                >
                                  {choice.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </>
              )}

              {videoWizardStep === 4 && (
                <div className="space-y-3">
                  {videoError ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                      {videoError}
                    </div>
                  ) : null}

                  {videoResults.length > 0 ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 space-y-2">
                      <p className="text-[11px] font-medium text-emerald-200">
                        {videoResults.length > 1 ? "Flow clips ready" : "Video ready"}
                      </p>
                      <div className="space-y-3">
                        {videoResults.map((result, index) => (
                          <div key={result.id} className="space-y-2">
                            <p className="text-[10px] text-emerald-50/90">{index + 1}. {result.title}</p>
                            <div className="rounded-lg overflow-hidden border border-white/10 bg-black">
                              <video src={result.videoUrl} controls playsInline className="w-full max-h-40 object-contain" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/40">
                      Start generation to render clip cards directly on the canvas.
                    </p>
                  )}
                </div>
              )}
                </div>

                <div className="px-4 py-3 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/28 font-mono">Cost</span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-white/60 font-mono">
                  <Zap size={10} className="text-yellow-400/70" />
                  {selectedVideoTokenCost} tokens
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={videoWizardStep === 1}
                  onClick={() => setVideoWizardStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev))}
                  className="h-9 px-3 rounded-lg border border-white/[0.1] text-xs text-white/55 hover:text-white hover:bg-white/[0.06] disabled:opacity-30"
                >
                  Back
                </button>
                {videoWizardStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setVideoWizardStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev))}
                    className="flex-1 h-9 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white/85"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleCreateVideo}
                    disabled={isCreatingVideo || !videoCard}
                    className={cn(
                      "flex-1 h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold transition-all",
                      isCreatingVideo
                        ? "bg-white/[0.05] text-white/22 cursor-not-allowed"
                        : "bg-gradient-to-r from-brand-accent to-violet-400 text-white hover:opacity-90",
                    )}
                  >
                    {isCreatingVideo ? "Creating..." : "Create Video"}
                  </button>
                )}
              </div>
                </div>
              </div>
            </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Image preview lightbox ────────────────────────────────────────────── */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-3xl w-full rounded-2xl overflow-hidden border border-white/[0.1] shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage.url}
                alt={previewImage.label}
                className="w-full max-h-[80vh] object-contain bg-[#0e0c1a]"
                draggable={false}
              />
              <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-[11px] text-white/50 font-mono truncate max-w-[80%]">
                  {previewImage.label}
                </p>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg bg-white/[0.08] border border-white/10 text-white/50 hover:text-white hover:bg-white/[0.14] transition-all"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
      />
    </div>
  );
}
