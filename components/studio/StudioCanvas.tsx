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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreferences } from "@/lib/context/preferences-context";
import type { MarketplaceTemplate } from "@/lib/types/marketplace";
import type { AvatarConfig, BackgroundConfig } from "@/lib/types/preferences";
import { VIDEO_MODELS } from "@/lib/data/plans";
import type { VideoModel } from "@/lib/types/billing";

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
}

interface GeneratedCard extends CardBase {
  type: "generated";
  imageUrl: string;
  prompt: string;
  sourceIds: string[];
  projectId?: string;
  generatedImageId?: string;
  videoUrl?: string;
  videoFileName?: string;
  videoStorageFileId?: string | null;
  isLoading?: boolean;
  hasError?: boolean;
}

type Card = ProductCard | GeneratedCard;

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
}

interface PersistedGeneratedCard extends CardBase {
  type: "generated";
  imageUrl: string;
  prompt: string;
  sourceIds: string[];
  projectId?: string;
  generatedImageId?: string;
  videoUrl?: string;
  videoFileName?: string;
  videoStorageFileId?: string | null;
  isLoading?: boolean;
  hasError?: boolean;
}

interface PersistedStudioState {
  cards: Array<PersistedProductCard | PersistedGeneratedCard>;
  connections: Connection[];
  selectedIds: string[];
  prompt: string;
  zoom: number;
  pan: { x: number; y: number };
}

export interface StudioCanvasProps {
  userId: string;
  cameraTemplates: MarketplaceTemplate[];
  movementTemplates: MarketplaceTemplate[];
  avatarTemplates: MarketplaceTemplate[];
  backgroundTemplates: MarketplaceTemplate[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_W = 196;
const CARD_IMG_H = 320;
const CARD_FOOT_H = 56;
const CARD_H = CARD_IMG_H + CARD_FOOT_H;
const PORT_R = 9; // port circle radius
const DRAG_THRESH = 5;
const MAX_PRODUCTS = 5;
const GAP = 22;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.12;
const CANVAS_W = 6000;
const CANVAS_H = 4000;
const STUDIO_DB_NAME = "genetrify-studio";
const STUDIO_STORE_NAME = "canvas";
const STUDIO_STATE_KEY_PREFIX = "session";

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
  avatarConfig: AvatarConfig | null,
  backgroundConfig: BackgroundConfig | null,
) {
  const cleanedPrompt = basePrompt.trim();
  const motionFragment =
    typeof movementTemplate?.config.promptFragment === "string"
      ? movementTemplate.config.promptFragment.trim()
      : "";
  const gender = avatarConfig?.gender === "woman" ? "woman" : "man";
  const roomAesthetic = backgroundConfig?.roomAesthetic || "studio";

  return [
    cleanedPrompt,
    `Subject: ${gender} in a ${roomAesthetic} space.`,
    motionFragment,
    "Keep the framing vertical 9:16, keep motion natural, and preserve the outfit details.",
  ]
    .filter(Boolean)
    .join(" ");
}

// ── StatusChip ────────────────────────────────────────────────────────────────

type TemplateCategory = "avatar" | "background" | "camera" | "movement";

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

function TemplatePanel({
  category,
  avatarTemplates,
  backgroundTemplates,
  cameraTemplates,
  movementTemplates,
  onClose,
}: {
  category: TemplateCategory;
  avatarTemplates: MarketplaceTemplate[];
  backgroundTemplates: MarketplaceTemplate[];
  cameraTemplates: MarketplaceTemplate[];
  movementTemplates: MarketplaceTemplate[];
  onClose: () => void;
}) {
  const {
    avatarConfig,
    setAvatarConfig,
    backgroundConfig,
    setBackgroundConfig,
    cameraTemplateId,
    setCameraTemplateId,
    movementTemplateId,
    setMovementTemplateId,
  } = usePreferences();

  const [isPending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
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
    const config: AvatarConfig = {
      type: "preset",
      presetId: template.id,
      gender: template.config.gender === "woman" ? "woman" : "man",
      style: ["streetwear", "luxury", "minimal"].includes(
        template.config.style as string,
      )
        ? (template.config.style as AvatarConfig["style"])
        : "casual",
    };
    setAvatarConfig(config);
    savePrefs({ avatar_config: config });
    onClose();
  }

  function handleSelectBackground(template: MarketplaceTemplate) {
    if (isPending) return;
    setSavingId(template.id);
    const config: BackgroundConfig = {
      type: "preset",
      presetId: template.id,
      roomAesthetic: String(template.config.roomAesthetic ?? ""),
      roomColors: String(template.config.roomColors ?? ""),
      roomElements: String(template.config.roomElements ?? ""),
      thumbnailUrl: template.thumbnail_url ?? undefined,
    };
    setBackgroundConfig(config);
    savePrefs({ background_config: config });
    onClose();
  }

  function handleSelectCamera(id: string) {
    if (isPending) return;
    setSavingId(id);
    setCameraTemplateId(id);
    savePrefs({
      camera_template_id: id,
      movement_template_id: movementTemplateId,
    });
    onClose();
  }

  function handleSelectMovement(id: string) {
    if (isPending) return;
    setSavingId(id);
    setMovementTemplateId(id);
    savePrefs({
      camera_template_id: cameraTemplateId,
      movement_template_id: id,
    });
    onClose();
  }

  async function handleCustomFace(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
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
        const config: AvatarConfig = {
          type: "custom",
          gender: "man",
          style: "casual",
          faceUrl: data.faceUrl,
          facePath: data.facePath,
        };
        setAvatarConfig(config);
        await fetch("/api/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_config: config }),
        });
        onClose();
      }
    };
    reader.readAsDataURL(file);
  }

  const CATEGORY_META: Record<
    TemplateCategory,
    { label: string; icon: React.ElementType }
  > = {
    avatar: { label: "Avatar", icon: User },
    background: { label: "Background", icon: Layers },
    camera: { label: "Camera", icon: Camera },
    movement: { label: "Movement", icon: Wind },
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
        : category === "camera"
          ? cameraTemplates
          : movementTemplates;

  function isSelected(t: MarketplaceTemplate) {
    if (category === "camera") return t.id === cameraTemplateId;
    if (category === "movement") return t.id === movementTemplateId;
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
    if (category === "camera") handleSelectCamera(t.id);
    if (category === "movement") handleSelectMovement(t.id);
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-black/30 z-[300]"
        onClick={onClose}
      />

      {/* Panel — desktop: right side panel | mobile: bottom sheet */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 300 }}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-[400] flex flex-col",
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
          {templates.length === 0 ? (
            <p className="text-center text-[12px] text-white/25 py-10">
              No templates yet
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {templates.map((t, i) => {
                const selected = isSelected(t);
                const saving = savingId === t.id;
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
                      {t.thumbnail_url ? (
                        <>
                          <img
                            src={t.thumbnail_url}
                            alt={t.title}
                            loading={i < 4 ? "eager" : "lazy"}
                            className={cn(
                              "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
                              t.preview_url ? "group-hover:opacity-0" : "",
                            )}
                          />
                          {t.preview_url && (
                            <img
                              src={t.preview_url}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            />
                          )}
                        </>
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
  onDelete,
  onPreview,
}: {
  card: Card;
  selected: boolean;
  isInConnectMode: boolean;
  onPtrDown: (e: React.PointerEvent, id: string) => void;
  onPortPtrDown: (e: React.PointerEvent, id: string, side: Side) => void;
  onVideoOpen?: (c: GeneratedCard) => void;
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
            card.type === "generated" && !(card as GeneratedCard).prompt
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
              "absolute inset-0 flex items-start justify-end p-2 transition-opacity duration-150",
              hover || selected ? "opacity-100" : "opacity-0",
            )}
          >
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onDelete(card.id)}
              className="p-1.5 rounded-lg bg-black/75 border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
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
                  : "bg-brand-accent/15 text-brand-accent border border-brand-accent/25",
              )}
            >
              {card.type === "product" ? "PRODUCT" : "AI GEN"}
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
        {(card.type === "product" || (card as GeneratedCard).prompt) && (
          <div
            className="bg-[#15151e] px-3 py-2.5 rounded-b-2xl"
            style={{ minHeight: card.type === "product" ? CARD_FOOT_H : undefined }}
          >
            {card.type === "product" ? (
              <p className="text-[11px] text-white/35 truncate font-mono mt-1">
                {card.fileName}
              </p>
            ) : (
              <p className="text-[11px] text-white/30 line-clamp-2 font-mono leading-relaxed">
                {(card as GeneratedCard).prompt}
              </p>
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
        {card.imageUrl &&
          !(card.type === "generated" && (card.isLoading || card.hasError)) && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                onPreview?.(
                  card.imageUrl,
                  card.type === "product" ? card.fileName : card.prompt,
                )
              }
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
  promptInputRef,
  onPromptChange,
  onGenerate,
}: {
  selCards: Card[];
  selProducts: Card[];
  prompt: string;
  isGenerating: boolean;
  promptInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onPromptChange: (v: string) => void;
  onGenerate: () => void;
}) {
  const canGenerate =
    selProducts.length > 0 || selCards.some((c) => c.type === "generated");
  const isRegenerate =
    selProducts.length === 0 && selCards.some((c) => c.type === "generated");

  return (
    <div className="w-full sm:w-[272px] bg-[#12121b] border border-white/[0.09] rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex -space-x-2">
          {selCards.slice(0, 3).map((c, i) => (
            <div
              key={c.id}
              className="w-5 h-5 rounded-full overflow-hidden border-[1.5px] border-[#12121b] bg-white/10"
              style={{ zIndex: 3 - i }}
            >
              {c.imageUrl && (
                <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-white/30 leading-snug">
          {isRegenerate
            ? "Edit prompt and Go to regenerate"
            : selProducts.length === 0
              ? "Select product cards to generate"
              : selProducts.length === 1
                ? "Generate model for this product"
                : `Generate outfit - ${selProducts.length} connected items`}
        </span>
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          ref={promptInputRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={2}
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
          className="flex-1 min-w-0 max-h-40 min-h-[44px] resize-none overflow-hidden bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs leading-relaxed text-white placeholder-white/20 outline-none focus:border-brand-accent/40 transition-colors font-mono [scrollbar-width:thin] [scrollbar-color:rgba(168,85,247,0.5)_transparent]"
        />
        <button
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
            isGenerating || !canGenerate
              ? "bg-white/[0.04] text-white/[0.18] cursor-not-allowed"
              : "bg-brand-accent text-white hover:bg-brand-accent-hover shadow-[0_0_18px_rgba(139,92,246,0.38)]",
          )}
        >
          <Sparkles size={11} />
          {isGenerating ? "..." : "Go"}
        </button>
      </div>
    </div>
  );
}

// ── StudioCanvas ──────────────────────────────────────────────────────────────

export function StudioCanvas({
  userId,
  cameraTemplates,
  movementTemplates,
  avatarTemplates,
  backgroundTemplates,
}: StudioCanvasProps) {
  const {
    avatarConfig,
    backgroundConfig,
    cameraTemplateId,
    movementTemplateId,
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
  const [videoCard, setVideoCard] = useState<GeneratedCard | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModel>(
    VIDEO_MODELS[0],
  );
  const [selectedDuration, setSelectedDuration] = useState<number>(
    VIDEO_MODELS[0].defaultDuration,
  );
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const [videoMovement, setVideoMovement] = useState(movementTemplateId);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [videoResult, setVideoResult] = useState<{
    videoUrl: string;
    fileName: string;
    storageFileId?: string | null;
  } | null>(null);
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
      .then((saved) => {
        if (cancelled || storageKeyRef.current !== storageKey) return;
        if (!saved) return;
        const restoredCards = saved.cards.map((card) => {
          if (card.type === "product") {
            return {
              ...card,
              imageUrl: URL.createObjectURL(card.file),
            } satisfies ProductCard;
          }
          return card satisfies GeneratedCard;
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
          } satisfies PersistedProductCard;
        }
        return {
          id: card.id,
          type: "generated",
          x: card.x,
          y: card.y,
          imageUrl: card.imageUrl,
          prompt: card.prompt,
          sourceIds: card.sourceIds,
          projectId: card.projectId,
          generatedImageId: card.generatedImageId,
          videoUrl: card.videoUrl,
          videoFileName: card.videoFileName,
          videoStorageFileId: card.videoStorageFileId,
          isLoading: card.isLoading,
          hasError: card.hasError,
        } satisfies PersistedGeneratedCard;
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
      const toAdd = imgs.slice(0, MAX_PRODUCTS - existing);
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
  const handleGenerate = useCallback(async () => {
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

    const bounds = selBounds(cardsRef.current, selectedRef.current);
    const pid = uid();
    setCards((prev) => [
      ...prev,
      {
        id: pid,
        type: "generated",
        x: bounds ? bounds.right + GAP : 60,
        y: bounds ? bounds.top : 80,
        imageUrl: "",
        prompt: normalizedPrompt,
        sourceIds: productCards.map((c) => c.id),
        isLoading: true,
      } satisfies GeneratedCard,
    ]);
    setIsGenerating(true);

    try {
      const fd = new FormData();
      fd.append("usePreferences", "true");
      productCards.forEach((c) => fd.append("products", c.file));

      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!upRes.ok) throw new Error("Upload failed");
      const { projectId } = await upRes.json();

      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          productDescription: normalizedPrompt,
          cameraTemplateId,
        }),
      });
      if (!genRes.ok) throw new Error("Generate failed");

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
      setCards((prev) =>
        prev.map((c) =>
          c.id === pid
            ? {
                ...c,
                imageUrl,
                projectId,
                generatedImageId,
                isLoading: false,
                hasError: !imageUrl,
              }
            : c,
        ),
      );
    } catch {
      setCards((prev) =>
        prev.map((c) =>
          c.id === pid ? { ...c, isLoading: false, hasError: true } : c,
        ),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, cameraTemplateId]);

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

  const clearCanvas = useCallback(() => {
    revokeProductObjectUrls(cardsRef.current);
    setCards([]);
    setConnections([]);
    setSelectedIds(new Set());
    setPrompt("");
    setVideoCard(null);
    setVideoError("");
    setVideoResult(null);
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
    "Choose camera";
  const movementLabel =
    movementTemplates.find((t) => t.id === movementTemplateId)?.title ??
    "Choose movement";

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
    setVideoResult(null);

    try {
      const movementTemplate = movementTemplates.find(
        (template) => template.id === videoMovement,
      );
      const motionPrompt = buildStudioVideoPrompt(
        videoPrompt || videoCard.prompt,
        movementTemplate,
        avatarConfig,
        backgroundConfig,
      );
      const exportRes = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: videoCard.projectId,
          imageIds: [videoCard.generatedImageId],
          imageUrls: [videoCard.imageUrl],
          motionPrompt,
          videoModelId: selectedVideoModel.id,
          duration: selectedDuration,
        }),
      });

      if (!exportRes.ok) {
        const error = await exportRes.json().catch(() => null);
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
        } else if (event.type === "video_error") {
          throw new Error(
            typeof event.error === "string"
              ? event.error
              : "Video generation failed",
          );
        }
      }

      if (!createdVideo) {
        throw new Error("Video generation did not return a result");
      }

      setVideoResult({
        videoUrl: createdVideo.videoUrl,
        fileName: createdVideo.filename,
        storageFileId: createdVideo.storageFileId,
      });
      setCards((prev) =>
        prev.map((card) =>
          card.id === videoCard.id
            ? {
                ...card,
                videoUrl: createdVideo.videoUrl,
                videoFileName: createdVideo.filename,
                videoStorageFileId: createdVideo.storageFileId ?? null,
              }
            : card,
        ),
      );
    } catch (error) {
      setVideoError(
        error instanceof Error ? error.message : "Video generation failed",
      );
    } finally {
      setIsCreatingVideo(false);
    }
  }, [
    avatarConfig,
    backgroundConfig,
    movementTemplates,
    selectedDuration,
    selectedVideoModel.id,
    videoCard,
    videoMovement,
    videoPrompt,
  ]);

  // ── SVG connection paths ──────────────────────────────────────────────────────
  const renderConnections = () => {
    const productCards = cards.filter((c) => c.type === "product");

    return connections.map((conn) => {
      const from = productCards.find((c) => c.id === conn.from);
      const to = productCards.find((c) => c.id === conn.to);
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
          backgroundSize:
            "36px 36px, 36px 36px, 100% 100%, 100% 100%, 100% 100%",
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
                onClick={() => setActiveTemplatePanel((p) => (p === "camera" ? null : "camera"))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all select-none cursor-pointer",
                  activeTemplatePanel === "camera"
                    ? "bg-brand-accent/15 border-brand-accent/35 text-brand-accent"
                    : "bg-white/4 border-white/8 text-white/55 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/75",
                )}
              >
                <Camera size={11} />
                <span>Angle</span>
                <RefreshCw size={9} className="opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTemplatePanel((p) => (p === "movement" ? null : "movement"))}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all select-none cursor-pointer",
                  activeTemplatePanel === "movement"
                    ? "bg-brand-accent/15 border-brand-accent/35 text-brand-accent"
                    : "bg-white/4 border-white/8 text-white/55 hover:bg-white/[0.07] hover:border-white/[0.14] hover:text-white/75",
                )}
              >
                <Wind size={11} />
                <span>Movement</span>
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
                      setVideoCard(generatedCard);
                      setVideoPrompt(generatedCard.prompt);
                      setVideoMovement(movementTemplateId);
                      setVideoError("");
                      setVideoResult(
                        generatedCard.videoUrl
                          ? {
                              videoUrl: generatedCard.videoUrl,
                              fileName:
                                generatedCard.videoFileName ??
                                "genetrify-video.mp4",
                              storageFileId:
                                generatedCard.videoStorageFileId ?? null,
                            }
                          : null,
                      );
                    }
                  : undefined
              }
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
                  promptInputRef={promptInputRef}
                  onPromptChange={setPrompt}
                  onGenerate={handleGenerate}
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
                { icon: Camera, cat: "camera"     as TemplateCategory, name: "Angle"    },
                { icon: Wind,   cat: "movement"   as TemplateCategory, name: "Movement" },
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
              onPromptChange={setPrompt}
              onGenerate={handleGenerate}
            />
          </motion.div>
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
            onClose={() => setActiveTemplatePanel(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Video modal ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {videoCard && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400]"
              onClick={() => setVideoCard(null)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col sm:flex-row rounded-2xl overflow-hidden border border-white/[0.08] bg-[#111119]"
                style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left — image preview */}
                <div className="sm:w-52 shrink-0 bg-[#0d0d15] flex items-center justify-center">
                  <img
                    src={videoCard.imageUrl}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Right — controls */}
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Create Video</h3>
                      <p className="text-[11px] text-white/30 mt-0.5">Animate this image</p>
                    </div>
                    <button
                      onClick={() => setVideoCard(null)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.07] transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 flex flex-col gap-4 scrollbar-brand">
                    {/* Prompt */}
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

                    {/* Model */}
                    <div>
                      <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-2">Model</p>
                      <div className="flex flex-col gap-1.5">
                        {VIDEO_MODELS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedVideoModel(m); setSelectedDuration(m.defaultDuration); }}
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
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded-full font-mono",
                                  m.qualityLabel === "Elite"
                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                                    : m.qualityLabel === "Pro"
                                      ? "bg-violet-500/15 text-violet-400 border border-violet-500/25"
                                      : "bg-white/[0.06] text-white/35 border border-white/[0.08]",
                                )}>
                                  {m.qualityLabel}
                                </span>
                                <span className="flex items-center gap-0.5 text-[10px] text-white/30 font-mono">
                                  <Zap size={9} className="text-yellow-500/60" />{m.tokenCost}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-2">Duration</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {selectedVideoModel.allowedDurations.map((d) => (
                          <button
                            key={d}
                            onClick={() => setSelectedDuration(d)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-all",
                              selectedDuration === d
                                ? "bg-brand-accent/12 border-brand-accent/35 text-brand-accent font-semibold"
                                : "bg-white/[0.03] border-white/[0.07] text-white/38 hover:bg-white/[0.06] hover:text-white/65",
                            )}
                          >
                            {d}s
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Movement */}
                    <div>
                      <p className="text-[9px] text-white/22 font-mono uppercase tracking-widest mb-2">Movement</p>
                      <div className="flex flex-col gap-1.5">
                        {movementTemplates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setVideoMovement(t.id)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-[11px] text-left transition-all border",
                              videoMovement === t.id
                                ? "bg-brand-accent/12 border-brand-accent/35 text-brand-accent font-medium"
                                : "bg-white/[0.03] border-white/[0.07] text-white/38 hover:bg-white/[0.06] hover:text-white/65",
                            )}
                          >
                            {t.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    {videoError && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                        {videoError}
                      </div>
                    )}

                    {videoResult && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 space-y-2">
                        <p className="text-[11px] font-medium text-emerald-200">Video ready</p>
                        <div className="rounded-lg overflow-hidden border border-white/10 bg-black">
                          <video src={videoResult.videoUrl} controls playsInline className="w-full max-h-48 object-contain" />
                        </div>
                        <a
                          href={videoResult.videoUrl}
                          download={videoResult.fileName}
                          className="inline-flex items-center gap-1.5 text-[11px] text-emerald-100 hover:text-white"
                        >
                          <Download size={11} />
                          Download video
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-5 pt-3 pb-5 border-t border-white/[0.06] shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-white/28 font-mono">Cost</span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-white/60 font-mono">
                        <Zap size={10} className="text-yellow-400/70" />
                        {selectedVideoModel.tokenCost} tokens
                      </span>
                    </div>
                    <button
                      onClick={handleCreateVideo}
                      disabled={isCreatingVideo || !videoCard}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                        isCreatingVideo
                          ? "bg-white/[0.05] text-white/22 cursor-not-allowed"
                          : "bg-gradient-to-r from-brand-accent to-violet-400 text-white hover:opacity-90 shadow-[0_4px_24px_rgba(139,92,246,0.35)]",
                      )}
                    >
                      {isCreatingVideo ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-white/20 border-t-white animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Film size={14} />
                          Create Video
                        </>
                      )}
                    </button>
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
